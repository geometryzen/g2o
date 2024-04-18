import { BehaviorSubject } from 'rxjs';
import { Anchor } from '../anchor';
import { is_color_provider, serialize_color } from '../effects/ColorProvider';
import { Flag } from '../Flag';
import { Group } from '../group';
import { IBoard } from '../IBoard';
import { compose_2d_3x3_transform } from '../math/compose_2d_3x3_transform';
import { G20 } from '../math/G20';
import { Matrix } from '../matrix';
import { get_dashes_offset, Path } from '../path';
import { dispose } from '../reactive/Disposable';
import { DisposableObservable, Observable } from '../reactive/Observable';
import { Shape } from '../shape';
import { Text } from '../text';
import { effect } from '../utils/effect';
import { mod, toFixed } from '../utils/math';
import { Commands } from '../utils/path-commands';
import { View } from './View';

const SQRT2 = Math.SQRT2;

type DOMElement = HTMLElement | SVGElement;

function set_dom_element_defs(svgElement: SVGElement, defs: SVGDefsElement): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svgElement as any).defs = defs;
}

export function get_dom_element_defs(svgElement: SVGElement): SVGDefsElement {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (svgElement as any).defs;
}

/**
 * sets the "hidden" _flagUpdate property.
 */
function set_defs_flag_update(defs: SVGDefsElement, flagUpdate: boolean): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (defs as any)._flagUpdate = flagUpdate;
}

function get_defs_flag_update(defs: SVGDefsElement): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (defs as any)._flagUpdate as boolean;
}

/**
 * Used to set attributes on SVG elements so the value MUST be a string.
 */
export type StylesMap = { [name: string]: string };

/**
 * A more specific representation of the attributes that are permitted on SVG elements.
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
 * The value of all attributes MUST be string.
 */
export interface SVGAttributes {
    'class'?: string;
    'clip-rule'?: 'nonzero' | 'evenodd' | 'inherit';
    'cx'?: string;
    'cy'?: string;
    /**
     * Defines the path to be drawn as a list of path commands and their parameters.
     */
    'd'?: string;
    'direction'?: 'ltr' | 'rtl';
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline
     */
    'dominant-baseline'?: 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top';
    'dx'?: string;
    'dy'?: string;
    'fill'?: string;
    'fill-opacity'?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-style'?: 'normal' | 'italic' | 'oblique';
    'font-weight'?: 'normal' | 'bold' | 'bolder' | 'lighter' | string;
    'fx'?: string;
    'fy'?: string;
    'gradientUnits'?: 'userSpaceOnUse' | 'objectBoundingBox';
    'height'?: string;
    'href'?: string;
    'id'?: string;
    'line-height'?: string;
    /**
     * TODO: offset is not a documented SVG attribute. How do we account for it?
     */
    'offset'?: string;
    'opacity'?: string;
    'text-anchor'?: 'start' | 'middle' | 'end';
    'r'?: string;
    'spreadMethod'?: 'pad' | 'reflect' | 'repeat';
    'stop-color'?: string;
    'stop-opacity'?: string;
    'stroke'?: string;
    'stroke-dasharray'?: string;
    'stroke-dashoffset'?: string;
    'stroke-linecap'?: 'butt' | 'round' | 'square';
    'stroke-linejoin'?: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
    'stroke-miterlimit'?: string;
    'stroke-opacity'?: string;
    'stroke-width'?: string;
    'text-decoration'?: string;
    /**
     * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
     */
    'transform'?: string;
    'vector-effect'?: 'none' | 'non-scaling-stroke' | 'non-scaling-size' | 'non-rotation' | 'fixed-position';
    'visibility'?: 'visible' | 'hidden' | 'collapse';
    'width'?: string;
    'x'?: string;
    'x1'?: string;
    'x2'?: string;
    'y'?: string;
    'y1'?: string;
    'y2'?: string;
}

/**
 * An de-serialized representation of SVGAttributes.
 */
export interface SVGProperties {
    'class'?: string;
    'cx'?: number;
    'cy'?: number;
    /**
     * Defines the path to be drawn as a list of path commands and their parameters.
     */
    'd'?: string;
    'dominant-baseline'?: 'auto' | 'middle' | 'hanging';
    'fill'?: string;
    'fill-opacity'?: string;
    'font-family'?: string;
    'font-size'?: number;
    'fx'?: number;
    'fy'?: number;
    'height'?: number;
    'id'?: string;
    'line-height'?: number;
    'opacity'?: string;
    'patternUnits'?: 'userSpaceOnUse' | 'objectBoundingBox';
    'text-anchor'?: 'start' | 'middle' | 'end';
    'r'?: number;
    'stroke'?: string;
    'stroke-dasharray'?: string;
    'stroke-opacity'?: number;
    'stroke-width'?: number;
    'transform'?: string;
    'visibility'?: 'visible' | 'hidden' | 'collapse';
    'width'?: number;
    'x'?: number;
    'y'?: number;
}

export function serialize_svg_props(props: SVGProperties): SVGAttributes {
    const attrs: SVGAttributes = {};
    attrs.class = props.class;
    if (typeof props.cx === 'number') {
        attrs.cx = `${props.cx}`;
    }
    return attrs;
}

export type DomContext = {
    domElement: DOMElement;
    elem: HTMLElement | SVGElement;
};

export const svg = {
    /**
     * @deprecated
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/version
     */
    version: 1.1,

    ns: 'http://www.w3.org/2000/svg',

    xlink: 'http://www.w3.org/1999/xlink',

    // Create an svg namespaced element.
    createElement: function (name: string, attrs: SVGAttributes = {}) {
        const tag = name;
        const elem = document.createElementNS(svg.ns, tag);
        if (attrs && Object.keys(attrs).length > 0) {
            svg.setAttributes(elem, attrs);
        }
        return elem;
    },

    // Add attributes from an svg element.
    setAttributes: function (elem: Element, attrs: SVGAttributes) {
        // SVGAttributes does not have an index signature.
        const styles = attrs as { [name: string]: string };
        const keys = Object.keys(attrs);
        for (let i = 0; i < keys.length; i++) {
            const qualifiedName = keys[i];
            const value = styles[qualifiedName];
            if (/href/.test(keys[i])) {
                elem.setAttributeNS(svg.xlink, qualifiedName, value);
            }
            else {
                elem.setAttribute(qualifiedName, value);
            }
        }
        return this;
    },

    // Remove attributes from an svg element.
    removeAttributes: function (elem: Element, attrs: SVGAttributes) {
        for (const key in attrs) {
            elem.removeAttribute(key);
        }
        return this;
    },

    path_from_anchors: function (board: IBoard, position: G20, attitude: G20, anchors: Anchor[], closed: boolean): string {

        // The anchors are user coordinates and don't include the position and attitude of the body.
        /* 
        const [x1, y1, x2, y2] = board.getBoundingBox();
        const sx = board.width / (x2 - x1);
        const sy = board.height / (y2 - y1);
        const cx = board.width / 2;
        const cy = board.width / 2;
        const a = attitude.a;
        const b = attitude.b;
        const alpha = a * a - b * b;
        const beta = 2 * a * b;
        const screenX = (x: number, y: number): number => (position.x + (alpha * x + beta * y)) * sx + cx;
        const screenY = (x: number, y: number): number => (position.y + (alpha * y - beta * x)) * sy + cy;
        */
        // EXPERIMENTAL: By switching x amd y here we handle a 90 degree coordinate rotation?
        // We are not completely done because Text and Images are rotated.
        const [screenX, screenY] = screen_functions(board);

        const l = anchors.length;
        const last = l - 1;
        let d: Anchor; // The elusive last Commands.move point
        let string = '';

        for (let i = 0; i < l; i++) {

            const b = anchors[i];

            const prev = closed ? mod(i - 1, l) : Math.max(i - 1, 0);
            const a = anchors[prev];

            let command: string;
            let c; Anchor;
            let vx, vy, ux, uy, ar, bl, br, cl;
            let rx, ry, xAxisRotation, largeArcFlag, sweepFlag;

            let x = toFixed(screenX(b.x, b.y));
            let y = toFixed(screenY(b.x, b.y));

            switch (b.command) {

                case Commands.close:
                    command = Commands.close;
                    break;

                case Commands.arc:

                    rx = b.rx;
                    ry = b.ry;
                    xAxisRotation = b.xAxisRotation;
                    largeArcFlag = b.largeArcFlag;
                    sweepFlag = b.sweepFlag;

                    command = Commands.arc + ' ' + rx + ' ' + ry + ' '
                        + xAxisRotation + ' ' + largeArcFlag + ' ' + sweepFlag + ' '
                        + x + ' ' + y;
                    break;

                case Commands.curve:

                    ar = (a.controls && a.controls.right) || G20.zero;
                    bl = (b.controls && b.controls.left) || G20.zero;

                    if (a.relative) {
                        vx = toFixed(screenX(ar.x + a.x, ar.y + a.y));
                        vy = toFixed(screenY(ar.x + a.x, ar.y + a.y));
                    }
                    else {
                        vx = toFixed(screenX(ar.x, ar.y));
                        vy = toFixed(screenY(ar.x, ar.y));
                    }

                    if (b.relative) {
                        ux = toFixed(screenX(bl.x + b.x, bl.y + b.y));
                        uy = toFixed(screenY(bl.x + b.x, bl.y + b.y));
                    }
                    else {
                        ux = toFixed(screenX(bl.x, bl.y));
                        uy = toFixed(screenY(bl.x, bl.y));
                    }

                    command = ((i === 0) ? Commands.move : Commands.curve) +
                        ' ' + vx + ' ' + vy + ' ' + ux + ' ' + uy + ' ' + x + ' ' + y;
                    break;

                case Commands.move: {
                    d = b;
                    command = Commands.move + ' ' + x + ' ' + y;
                    break;
                }
                default: {
                    command = b.command + ' ' + x + ' ' + y;
                }
            }

            // Add a final point and close it off

            if (i >= last && closed) {

                if (b.command === Commands.curve) {

                    // Make sure we close to the most previous Commands.move
                    c = d;

                    br = (b.controls && b.controls.right) || b;
                    cl = (c.controls && c.controls.left) || c;

                    if (b.relative) {
                        vx = toFixed(screenX(br.x + b.x, br.y + b.y));
                        vy = toFixed(screenY(br.x + b.x, br.y + b.y));
                    }
                    else {
                        vx = toFixed(screenX(br.x, br.y));
                        vy = toFixed(screenY(br.x, br.y));
                    }

                    if (c.relative) {
                        ux = toFixed(screenX(cl.x + c.x, cl.y + c.y));
                        uy = toFixed(screenY(cl.x + c.x, cl.y + c.y));
                    }
                    else {
                        ux = toFixed(screenX(cl.x, cl.y));
                        uy = toFixed(screenY(cl.x, cl.y));
                    }

                    x = toFixed(screenX(c.x, c.y));
                    y = toFixed(screenY(c.x, c.y));

                    command += ' C ' + vx + ' ' + vy + ' ' + ux + ' ' + uy + ' ' + x + ' ' + y;

                }

                if (b.command !== Commands.close) {
                    command += ' Z';
                }
            }
            string += command + ' ';
        }

        return string;

    },

    pointsToPathDefinition: function (points: { x: number; y: number }[], size: number): string {
        let string = '';
        const r = size * 0.5;
        for (let i = 0; i < points.length; i++) {
            const x = points[i].x;
            const y = points[i].y - r;
            string += Commands.move + ' ' + x + ' ' + y + ' ';
            string += 'a ' + r + ' ' + r + ' 0 1 0 0.001 0 Z';
        }
        return string;
    },

    getClip: function (shape: Shape<Group, string>, svgElement: SVGElement) {
        let clip = shape.zzz.clip;
        if (!clip) {
            clip = shape.zzz.clip = svg.createElement('clipPath', {
                'clip-rule': 'nonzero'
            }) as SVGClipPathElement;
        }
        if (clip.parentNode === null) {
            const defs = get_dom_element_defs(svgElement);
            if (defs) {
                defs.appendChild(clip);
            }
            else {
                throw new Error("No defs found for element");
            }
        }
        return clip;
    },

    defs: {
        update: function (svgElement: SVGElement) {
            const defs = get_dom_element_defs(svgElement);
            if (get_defs_flag_update(defs)) {
                const children = Array.prototype.slice.call(defs.children, 0);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const id = child.id;
                    const selector = `[fill="url(#${id})"],[stroke="url(#${id})"],[clip-path="url(#${id})"]`;
                    const exists = svgElement.querySelector(selector);
                    if (!exists) {
                        defs.removeChild(child);
                    }
                }
                set_defs_flag_update(defs, false);
            }
        }
    },

    'group': {
        appendChild: function (this: DomContext, shape: Shape<Group, string>) {

            const childNode = shape.zzz.elem;

            if (!childNode) {
                return;
            }

            const tag = childNode.nodeName;

            if (!tag || /(radial|linear)gradient/i.test(tag) || shape.clip) {
                return;
            }

            this.elem.appendChild(childNode);
        },

        removeChild: function (this: DomContext, shape: Shape<Group, string>) {
            const childNode = shape.zzz.elem;

            if (!childNode || childNode.parentNode != this.elem) {
                return;
            }

            const tag = childNode.nodeName;

            if (!tag) {
                return;
            }

            // Defer subtractions while clipping.
            if (shape.clip) {
                return;
            }

            dispose(shape.zzz.disposables);

            this.elem.removeChild(childNode);
        },

        orderChild: function (this: DomContext, object: Shape<Group, string>) {
            this.elem.appendChild(object.zzz.elem);
        },

        render: function (this: Group, domElement: DOMElement, svgElement: SVGElement): void {

            this.update();

            if (this.zzz.elem) {
                // It's already defined.
            }
            else {
                this.zzz.elem = svg.createElement('g', { id: this.id });
                domElement.appendChild(this.zzz.elem);
                this.zzz.disposables.push(this.matrix.change$.subscribe(() => {
                    this.zzz.elem.setAttribute('transform', transform_value_of_matrix(this.matrix));
                }));

                // opacity
                this.zzz.disposables.push(effect(() => {
                    const opacity = this.opacity;
                    const change: SVGAttributes = { opacity: `${opacity}` };
                    if (opacity === 1) {
                        svg.removeAttributes(this.zzz.elem, change);
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, change);
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // visibility
                this.zzz.disposables.push(effect(() => {
                    const visibility = this.visibility;
                    switch (visibility) {
                        case 'visible': {
                            const change: SVGAttributes = { visibility };
                            svg.removeAttributes(this.zzz.elem, change);
                            break;
                        }
                        default: {
                            const change: SVGAttributes = { visibility };
                            svg.setAttributes(this.zzz.elem, change);
                            break;
                        }
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));
            }

            // _Update styles for the <g>
            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];
            const dom_context: DomContext = {
                domElement: domElement,
                elem: this.zzz.elem
            };

            if (flagMatrix) {
                this.zzz.elem.setAttribute('transform', transform_value_of_matrix(this.matrix));
            }

            for (let i = 0; i < this.children.length; i++) {
                const child = this.children.getAt(i);
                const type = child.zzz.type;
                const elem = this.zzz.elem;
                switch (type) {
                    case 'group': {
                        svg.group.render.call(child as Group, elem, svgElement);
                        break;
                    }
                    case 'path': {
                        svg.path.render.call(child as Path, elem, svgElement);
                        break;
                    }
                    case 'text': {
                        svg.text.render.call(child as Text, elem, svgElement);
                        break;
                    }
                    default: {
                        throw new Error(`${type}`);
                    }
                }
            }

            if (this.flags[Flag.ClassName]) {
                this.zzz.elem.setAttribute('class', this.classList.join(' '));
            }

            if (this.flags[Flag.Additions]) {
                this.additions.forEach(svg.group.appendChild, dom_context);
            }

            if (this.flags[Flag.Subtractions]) {
                this.subtractions.forEach(svg.group.removeChild, dom_context);
            }

            if (this.flags[Flag.Order]) {
                this.children.forEach(svg.group.orderChild, dom_context);
            }

            // Commented two-way functionality of clips / masks with groups and
            // polygons. Uncomment when this bug is fixed:
            // https://code.google.com/p/chromium/issues/detail?id=370951

            // if (this._flagClip) {

            //   clip = svg.getClip(this, domElement);
            //   elem = this._renderer.elem;

            //   if (this.clip) {
            //     elem.removeAttribute('id');
            //     clip.setAttribute('id', this.id);
            //     clip.appendChild(elem);
            //   }
            else {
                //     clip.removeAttribute('id');
                //     elem.setAttribute('id', this.id);
                //     this.parent._renderer.elem.appendChild(elem); // TODO: should be insertBefore
                //   }

                // }

                if (this.flags[Flag.Mask]) {
                    if (this.mask) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (svg as any)[this.mask.zzz.type].render.call(this.mask, domElement);
                        this.zzz.elem.setAttribute('clip-path', 'url(#' + this.mask.id + ')');
                    }
                    else {
                        this.zzz.elem.removeAttribute('clip-path');
                    }
                }

                this.flagReset();
            }
        },
    },

    'path': {
        render: function (this: Path, domElement: DOMElement, svgElement: SVGElement): void {

            this.update();

            // Collect any attribute that needs to be changed here
            const changed: SVGAttributes = {};

            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];

            if (flagMatrix) {
                changed.transform = transform_value_of_matrix(this.matrix);
            }

            if (this.fill && is_color_provider(this.fill)) {
                this.zzz.hasFillEffect = true;
                this.fill.render(svgElement);
            }

            if (this.flags[Flag.Fill]) {
                if (this.fill) {
                    changed.fill = serialize_color(this.fill);
                }
                if (this.zzz.hasFillEffect && typeof this.fill === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.zzz.hasFillEffect;
                }
            }

            if (this.stroke && is_color_provider(this.stroke)) {
                this.zzz.hasStrokeEffect = true;
                this.stroke.render(svgElement);
            }

            if (this.flags[Flag.Stroke]) {
                if (this.stroke) {
                    changed.stroke = serialize_color(this.stroke);
                }
                if (this.zzz.hasStrokeEffect && typeof this.stroke === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.zzz.hasStrokeEffect;
                }
            }

            if (this.flags[Flag.Linewidth]) {
                changed['stroke-width'] = `${this.strokeWidth}`;
            }

            if (this.flags[Flag.ClassName]) {
                changed['class'] = this.classList.join(' ');
            }

            if (this.flags[Flag.VectorEffect]) {
                changed['vector-effect'] = this.vectorEffect;
            }

            if (this.flags[Flag.Cap]) {
                changed['stroke-linecap'] = this.cap;
            }

            if (this.flags[Flag.Join]) {
                changed['stroke-linejoin'] = this.join;
            }

            if (this.flags[Flag.Miter]) {
                changed['stroke-miterlimit'] = `${this.miter}`;
            }

            if (this.dashes && this.dashes.length > 0) {
                changed['stroke-dasharray'] = this.dashes.join(' ');
                changed['stroke-dashoffset'] = `${get_dashes_offset(this.dashes) || 0}`;
            }

            if (this.zzz.elem) {
                // When completely reactive, this will not be needed
                svg.setAttributes(this.zzz.elem, changed);
            }
            else {
                changed.id = this.id;
                this.zzz.elem = svg.createElement('path', changed);
                domElement.appendChild(this.zzz.elem);

                // The matrix is in the Shape.
                this.zzz.disposables.push(this.matrix.change$.subscribe((matrix) => {
                    const change: SVGAttributes = {};
                    change.transform = transform_value_of_matrix(matrix);
                    svg.setAttributes(this.zzz.elem, change);
                }));

                this.zzz.disposables.push(this.zzz.vertices$.subscribe(() => {
                    const change: SVGAttributes = {};
                    change.d = svg.path_from_anchors(this.board, this.position, this.attitude, this.zzz.vertices, this.closed);
                    svg.setAttributes(this.zzz.elem, change);
                }));

                // fill
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change.fill = serialize_color(this.fill);
                    svg.setAttributes(this.zzz.elem, change);

                    if (this.zzz.hasFillEffect && typeof this.fill === 'string') {
                        set_defs_flag_update(get_dom_element_defs(svgElement), true);
                        delete this.zzz.hasFillEffect;
                    }

                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // fillOpacity
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change['fill-opacity'] = `${this.fillOpacity}`;
                    svg.setAttributes(this.zzz.elem, change);
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // opacity
                this.zzz.disposables.push(effect(() => {
                    const opacity = this.opacity;
                    const change: SVGAttributes = { opacity: `${opacity}` };
                    if (opacity === 1) {
                        svg.removeAttributes(this.zzz.elem, change);
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, change);
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // stroke
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change.stroke = serialize_color(this.stroke);
                    svg.setAttributes(this.zzz.elem, change);

                    if (this.zzz.hasStrokeEffect && typeof this.stroke === 'string') {
                        set_defs_flag_update(get_dom_element_defs(svgElement), true);
                        delete this.zzz.hasStrokeEffect;
                    }

                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // strokeOpacity
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change['stroke-opacity'] = `${this.strokeOpacity}`;
                    svg.setAttributes(this.zzz.elem, change);
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // strokeWidth
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change['stroke-width'] = `${this.strokeWidth}`;
                    svg.setAttributes(this.zzz.elem, change);
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // visibility
                this.zzz.disposables.push(effect(() => {
                    const visibility = this.visibility;
                    switch (visibility) {
                        case 'visible': {
                            const change: SVGAttributes = { visibility };
                            svg.removeAttributes(this.zzz.elem, change);
                            break;
                        }
                        default: {
                            const change: SVGAttributes = { visibility };
                            svg.setAttributes(this.zzz.elem, change);
                            break;
                        }
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));
            }

            if (this.flags[Flag.Clip]) {

                const clip = svg.getClip(this, svgElement);
                const elem = this.zzz.elem;

                if (this.clip) {
                    elem.removeAttribute('id');
                    clip.setAttribute('id', this.id);
                    clip.appendChild(elem);
                }
                else {
                    clip.removeAttribute('id');
                    elem.setAttribute('id', this.id);
                    if (this.parent) {
                        this.parent.zzz.elem.appendChild(elem); // TODO: should be insertBefore
                    }
                }
            }

            // Commented two-way functionality of clips / masks with groups and
            // polygons. Uncomment when this bug is fixed:
            // https://code.google.com/p/chromium/issues/detail?id=370951

            if (this.flags[Flag.Mask]) {
                if (this.mask) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (svg as any)[this.mask.zzz.type].render.call(this.mask, domElement);
                    this.zzz.elem.setAttribute('clip-path', 'url(#' + this.mask.id + ')');
                }
                else {
                    this.zzz.elem.removeAttribute('clip-path');
                }
            }

            this.flagReset();
        }
    },

    'text': {
        render: function (this: Text, domElement: DOMElement, svgElement: SVGElement): void {

            this.update();

            // The styles that will be applied to an SVG
            const changed: SVGAttributes = {};

            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];

            if (flagMatrix) {
                update_text_matrix(this);
                changed.transform = transform_value_of_matrix(this.matrix);
            }

            if (this.flags[Flag.Size]) {
                changed['font-size'] = `${this.fontSize}`;
            }
            {
                const fill = this.fill;
                if (fill) {
                    if (is_color_provider(fill)) {
                        this.zzz.hasFillEffect = true;
                        fill.render(svgElement);
                    }
                    else {
                        changed.fill = serialize_color(fill);
                        if (this.zzz.hasFillEffect) {
                            set_defs_flag_update(get_dom_element_defs(svgElement), true);
                            delete this.zzz.hasFillEffect;
                        }
                    }
                }
            }
            {
                const stroke = this.stroke;
                if (stroke) {
                    if (is_color_provider(stroke)) {
                        this.zzz.hasStrokeEffect = true;
                        stroke.render(svgElement);
                    }
                    else {
                        changed.stroke = serialize_color(stroke);
                        if (this.zzz.hasStrokeEffect) {
                            set_defs_flag_update(get_dom_element_defs(svgElement), true);
                            delete this.zzz.hasFillEffect;
                        }
                    }
                }
            }
            if (this.flags[Flag.ClassName]) {
                changed['class'] = this.classList.join(' ');
            }
            if (this.dashes && this.dashes.length > 0) {
                changed['stroke-dasharray'] = this.dashes.join(' ');
                changed['stroke-dashoffset'] = `${get_dashes_offset(this.dashes) || 0}`;
            }

            if (this.zzz.elem) {
                svg.setAttributes(this.zzz.elem, changed);
            }
            else {
                changed.id = this.id;
                this.zzz.elem = svg.createElement('text', changed);
                domElement.appendChild(this.zzz.elem);

                this.zzz.disposables.push(effect(() => {
                    update_text_matrix(this);
                    const change: SVGAttributes = {};
                    change.transform = transform_value_of_matrix(this.matrix);
                    svg.setAttributes(this.zzz.elem, change);
                    return function () {
                        // Nothing to do here...
                    };
                }));

                // anchor
                this.zzz.disposables.push(effect(() => {
                    const anchor = this.anchor;
                    switch (anchor) {
                        case 'start': {
                            svg.removeAttributes(this.zzz.elem, { 'text-anchor': anchor });
                            break;
                        }
                        case 'middle':
                        case 'end': {
                            svg.setAttributes(this.zzz.elem, { 'text-anchor': anchor });
                            break;
                        }
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // decoration
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change['text-decoration'] = this.decoration.join(' ');
                    svg.setAttributes(this.zzz.elem, change);
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // direction
                this.zzz.disposables.push(effect(() => {
                    const direction = this.direction;
                    if (direction === 'rtl') {
                        svg.setAttributes(this.zzz.elem, { direction });
                    }
                    else {
                        svg.removeAttributes(this.zzz.elem, { direction });
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // dominant-baseline
                this.zzz.disposables.push(effect(() => {
                    const dominantBaseline = this.dominantBaseline;
                    switch (dominantBaseline) {
                        case 'auto': {
                            svg.removeAttributes(this.zzz.elem, { 'dominant-baseline': dominantBaseline });
                            break;
                        }
                        default: {
                            svg.setAttributes(this.zzz.elem, { 'dominant-baseline': dominantBaseline });
                            break;
                        }
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // dx
                this.zzz.disposables.push(effect(() => {
                    const dx = this.dx;
                    if (typeof dx === 'number' && dx === 0) {
                        svg.removeAttributes(this.zzz.elem, { dx: "" });
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, { dx: `${dx}` });
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // dy
                this.zzz.disposables.push(effect(() => {
                    const dy = this.dy;
                    if (typeof dy === 'number' && dy === 0) {
                        svg.removeAttributes(this.zzz.elem, { dy: "" });
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, { dy: `${dy}` });
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // font-family
                this.zzz.disposables.push(this.fontFamily$.subscribe((family) => {
                    svg.setAttributes(this.zzz.elem, { 'font-family': family });
                }));

                // font-size
                this.zzz.disposables.push(this.fontSize$.subscribe((size) => {
                    svg.setAttributes(this.zzz.elem, { 'font-size': `${size}` });
                }));

                // font-style
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = { 'font-style': this.fontStyle };
                    if (change['font-style'] === 'normal') {
                        svg.removeAttributes(this.zzz.elem, change);
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, change);
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // font-weight
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = { 'font-weight': `${this.fontWeight}` };
                    if (change['font-weight'] === 'normal') {
                        svg.removeAttributes(this.zzz.elem, change);
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, change);
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // opacity
                this.zzz.disposables.push(effect(() => {
                    const opacity = this.opacity;
                    const change: SVGAttributes = { opacity: `${opacity}` };
                    if (opacity === 1) {
                        svg.removeAttributes(this.zzz.elem, change);
                    }
                    else {
                        svg.setAttributes(this.zzz.elem, change);
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // stroke-width
                this.zzz.disposables.push(effect(() => {
                    const change: SVGAttributes = {};
                    change['stroke-width'] = `${this.strokeWidth}`;
                    svg.setAttributes(this.zzz.elem, change);
                    return function () {
                        // No cleanup to be done.
                    };
                }));

                // textContent
                this.zzz.disposables.push(this.value$.subscribe((value) => {
                    this.zzz.elem.textContent = value;
                }));

                // visibility
                this.zzz.disposables.push(effect(() => {
                    const visibility = this.visibility;
                    switch (visibility) {
                        case 'visible': {
                            const change: SVGAttributes = { visibility };
                            svg.removeAttributes(this.zzz.elem, change);
                            break;
                        }
                        default: {
                            const change: SVGAttributes = { visibility };
                            svg.setAttributes(this.zzz.elem, change);
                            break;
                        }
                    }
                    return function () {
                        // No cleanup to be done.
                    };
                }));
            }

            if (this._flagClip) {
                const clip = svg.getClip(this, svgElement);
                const elem = this.zzz.elem;

                if (this.clip) {
                    elem.removeAttribute('id');
                    clip.setAttribute('id', this.id);
                    clip.appendChild(elem);
                }
                else {
                    clip.removeAttribute('id');
                    elem.setAttribute('id', this.id);
                    this.parent.zzz.elem.appendChild(elem); // TODO: should be insertBefore
                }
            }

            // Commented two-way functionality of clips / masks with groups and
            // polygons. Uncomment when this bug is fixed:
            // https://code.google.com/p/chromium/issues/detail?id=370951

            if (this._flagMask) {
                if (this.mask) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (svg as any)[this.mask.zzz.type].render.call(this.mask, domElement);
                    this.zzz.elem.setAttribute('clip-path', 'url(#' + this.mask.id + ')');
                }
                else {
                    this.zzz.elem.removeAttribute('clip-path');
                }
            }

            if (this.flags[Flag.Value]) {
                this.zzz.elem.textContent = this.value;
            }

            this.flagReset();
        }
    },
} as const;

export interface SVGViewParams {
    domElement?: SVGElement;
}

export class SVGView implements View {

    readonly domElement: SVGElement;
    readonly viewBox: Group;
    readonly defs: SVGDefsElement;

    width?: number;
    height?: number;

    readonly #size: BehaviorSubject<{ width: number; height: number }>;
    readonly size$: Observable<{ width: number; height: number }>;

    constructor(viewBox: Group, containerId: string, params: SVGViewParams = {}) {
        if (viewBox instanceof Group) {
            this.viewBox = viewBox;
            this.viewBox.parent = null;
        }
        else {
            throw new Error("scene must be a Group");
        }
        if (params.domElement) {
            this.domElement = params.domElement;
        }
        else {
            this.domElement = svg.createElement('svg', { id: `${containerId}-svg` });
        }

        this.defs = svg.createElement('defs') as SVGDefsElement;
        set_defs_flag_update(this.defs, false);
        this.domElement.appendChild(this.defs);
        set_dom_element_defs(this.domElement, this.defs);
        this.domElement.style.overflow = 'hidden';

        this.#size = new BehaviorSubject({ width: this.width, height: this.height });
        this.size$ = new DisposableObservable(this.#size.asObservable());
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setSize(size: { width: number, height: number }, ratio: number): this {
        this.width = size.width;
        this.height = size.height;
        svg.setAttributes(this.domElement, { width: `${size.width}px`, height: `${size.height}px` });
        this.#size.next(size);
        return this;
    }

    render(): this {
        const thisArg = this.viewBox;
        const svgElement = this.domElement;
        // The problem with this approach is that this view does not get to maintain state.
        svg.group.render.call(thisArg, this.domElement, svgElement);
        svg.defs.update(svgElement);
        return this;
    }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
 *  
 * [
 *    [a c e]
 *    [b d f]
 *    [0 0 1]
 * ] => "matrix(a b c d e f)""
 */
function transform_value_of_matrix(m: Matrix): string {
    const a = m.a;
    const b = m.b;
    const c = m.c;
    const d = m.d;
    const e = m.e;
    const f = m.f;
    return `matrix(${[a, b, c, d, e, f].map(toFixed).join(' ')})`;
}

/**
 * If the bounding box is oriented such that y increases in the upwards direction,
 * exchange the x and y coordinates because we will be applying a 90 degree rotation.
 */
function screen_functions(board: IBoard) {
    if (board.goofy) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return [(x: number, y: number): number => x, (x: number, y: number): number => y];
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return [(x: number, y: number): number => y, (x: number, y: number): number => x];
    }
}

function update_text_matrix(text: Text) {
    // Text and Images, unlike Path(s), are not compensated (yet) for the 90 degree rotation that makes the  
    const goofy = text.board.goofy;
    const position = text.position;
    const x = position.x;
    const y = position.y;
    const attitude = text.attitude;
    const scale = text.scaleXY;
    const sx = scale.x;
    const sy = scale.y;
    if (goofy) {
        const cos_φ = attitude.a;
        const sin_φ = attitude.b;
        compose_2d_3x3_transform(x, y, sx, sy, cos_φ, sin_φ, text.skewX, text.skewY, text.matrix);
    }
    else {
        // Text needs an additional rotation of -π/2 (i.e. clockwise 90 degrees) to compensate for 
        // the use of a right-handed coordinate frame. The rotor for this is cos(π/4)+sin(π/4)*I.
        // Here we compute the effective rotator (which is obtained by multiplying the two rotors),
        // and use that to compose the transformation matrix.
        const a = attitude.a;
        const b = attitude.b;
        const cos_φ = (a - b) / SQRT2;
        const sin_φ = (a + b) / SQRT2;
        compose_2d_3x3_transform(y, x, sy, sx, cos_φ, sin_φ, text.skewY, text.skewX, text.matrix);
    }
}
