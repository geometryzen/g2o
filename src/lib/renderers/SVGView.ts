import { BehaviorSubject } from 'rxjs';
import { Anchor } from '../anchor';
import { LinearGradient } from '../effects/linear-gradient';
import { RadialGradient } from '../effects/radial-gradient';
import { is_canvas, is_img, is_video, Texture } from '../effects/texture';
import { Flag } from '../Flag';
import { Group } from '../group';
import { IBoard } from '../IBoard';
import { compose_2d_3x3_transform } from '../math/compose_2d_3x3_transform';
import { decompose_2d_3x3_matrix } from '../math/decompose_2d_3x3_matrix';
import { G20 } from '../math/G20';
import { Matrix } from '../matrix';
import { get_dashes_offset, Path } from '../path';
import { Observable } from '../rxjs/Observable';
import { Shape } from '../shape';
import { Points } from '../shapes/points';
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

function get_dom_element_defs(svgElement: SVGElement): SVGDefsElement {
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

function is_gradient_or_texture(x: string | LinearGradient | RadialGradient | Texture): x is LinearGradient | RadialGradient | Texture {
    return x instanceof LinearGradient || x instanceof RadialGradient || x instanceof Texture;
}

function serialize_color(x: string | LinearGradient | RadialGradient | Texture): string {
    if (is_gradient_or_texture(x)) {
        return `url(#${x.id})`;
    }
    else {
        return x;
    }
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
    'fill'?: string;
    'fill-opacity'?: string;
    'font-family'?: string;
    'font-size'?: string;
    'font-style'?: string;
    'font-weight'?: string;
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
    'visibility'?: 'visible' | 'hidden';
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
    'visibility'?: 'visible' | 'hidden';
    'width'?: number;
    'x'?: number;
    'y'?: number;
}

function serialize_svg_props(props: SVGProperties): SVGAttributes {
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

const svg = {
    /**
     * @deprecated
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/version
     */
    version: 1.1,

    ns: 'http://www.w3.org/2000/svg',

    xlink: 'http://www.w3.org/1999/xlink',

    alignments: {
        left: 'start',
        center: 'middle',
        right: 'end'
    } as const,

    baselines: {
        top: 'hanging',
        middle: 'middle',
        bottom: 'ideographic',
        baseline: 'alphabetic'
    } as const,

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
        // SVGAttributes does snot have an index signature.
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

    getClip: function (shape: Shape<Group>, svgElement: SVGElement) {
        let clip = shape.viewInfo.clip;
        if (!clip) {
            clip = shape.viewInfo.clip = svg.createElement('clipPath', {
                'clip-rule': 'nonzero'
            }) as SVGClipPathElement;
        }
        if (clip.parentNode === null) {
            const defs = get_dom_element_defs(svgElement);
            if (defs) {
                defs.appendChild(clip);
            }
            else {
                console.warn("No defs found for element");
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

        appendChild: function (this: DomContext, object: Shape<Group>) {

            const elem = object.viewInfo.elem;

            if (!elem) {
                return;
            }

            const tag = elem.nodeName;

            if (!tag || /(radial|linear)gradient/i.test(tag) || object.clip) {
                return;
            }

            this.elem.appendChild(elem);

        },

        removeChild: function (this: DomContext, object: Shape<Group>) {

            const elem = object.viewInfo.elem;

            if (!elem || elem.parentNode != this.elem) {
                return;
            }

            const tag = elem.nodeName;

            if (!tag) {
                return;
            }

            // Defer subtractions while clipping.
            if (object.clip) {
                return;
            }

            this.elem.removeChild(elem);
        },

        orderChild: function (this: DomContext, object: Shape<Group>) {
            this.elem.appendChild(object.viewInfo.elem);
        },

        render: function (this: Group, domElement: DOMElement, svgElement: SVGElement): void {

            // Shortcut for hidden objects.
            // Doesn't reset the flags, so changes are stored and
            // applied once the object is visible again
            if ((!this.visible && !this.flags[Flag.Visible]) || (this.opacity === 0 && !this.flags[Flag.Opacity])) {
                return;
            }

            this.update();

            if (this.viewInfo.elem) {
                // It's already defined.
            }
            else {
                this.viewInfo.elem = svg.createElement('g', { id: this.id });
                domElement.appendChild(this.viewInfo.elem);
                this.viewInfo.matrix_change = this.matrix.change$.subscribe(() => {
                    this.viewInfo.elem.setAttribute('transform', transform_value_of_matrix(this.board, this.matrix));
                });
            }

            // _Update styles for the <g>
            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];
            const dom_context: DomContext = {
                domElement: domElement,
                elem: this.viewInfo.elem
            };

            if (flagMatrix) {
                this.viewInfo.elem.setAttribute('transform', transform_value_of_matrix(this.board, this.matrix));
            }

            for (let i = 0; i < this.children.length; i++) {
                const child = this.children.getAt(i);
                const type = child.viewInfo.type;
                const elem = this.viewInfo.elem;
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
                        throw new Error(type);
                    }
                }
                (svg as any)[type].render.call(child, domElement);
            }

            if (this.flags[Flag.Id]) {
                this.viewInfo.elem.setAttribute('id', this.id);
            }

            if (this.flags[Flag.Opacity]) {
                this.viewInfo.elem.setAttribute('opacity', `${this.opacity}`);
            }

            if (this.flags[Flag.Visible]) {
                this.viewInfo.elem.setAttribute('display', this.visible ? 'inline' : 'none');
            }

            if (this.flags[Flag.ClassName]) {
                this.viewInfo.elem.setAttribute('class', this.classList.join(' '));
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
                        (svg as any)[this.mask.viewInfo.type].render.call(this.mask, domElement);
                        this.viewInfo.elem.setAttribute('clip-path', 'url(#' + this.mask.id + ')');
                    }
                    else {
                        this.viewInfo.elem.removeAttribute('clip-path');
                    }
                }

                if (this.dataset) {
                    Object.assign(this.viewInfo.elem.dataset, this.dataset);
                }

                this.flagReset();
            }
        },
    },
    'path': {
        render: function (this: Path, domElement: DOMElement, svgElement: SVGElement) {
            // Shortcut for hidden objects.
            // Doesn't reset the flags, so changes are stored and
            // applied once the object is visible again
            if (this.opacity === 0 && !this.flags[Flag.Opacity]) {
                return this;
            }

            this.update();

            // Collect any attribute that needs to be changed here
            const changed: SVGAttributes = {};

            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];

            if (flagMatrix) {
                changed.transform = transform_value_of_matrix(this.board, this.matrix);
            }

            if (this.flags[Flag.Id]) {
                changed.id = this.id;
            }

            if (this.flags[Flag.Vertices]) {
                changed.d = svg.path_from_anchors(this.board, this.position, this.attitude, this.viewInfo.anchor_vertices, this.closed);
            }

            if (this.fill && is_gradient_or_texture(this.fill)) {
                this.viewInfo.hasFillEffect = true;
                this.fill.update();
                const type = this.fill.viewInfo.type as 'linear-gradient' | 'radial-gradient' | 'texture';
                switch (type) {
                    case 'linear-gradient': {
                        svg['linear-gradient'].render.call(this.fill as unknown as LinearGradient, domElement, true, svgElement);
                        break;
                    }
                    case 'radial-gradient': {
                        svg['radial-gradient'].render.call(this.fill as unknown as RadialGradient, domElement, true, svgElement);
                        break;
                    }
                    case 'texture': {
                        svg['texture'].render.call(this.fill as unknown as Texture, domElement, true, svgElement);
                        break;
                    }
                    default: {
                        throw new Error(`${type}`);
                    }
                }
            }

            if (this.flags[Flag.Fill]) {
                if (this.fill) {
                    changed.fill = serialize_color(this.fill);
                }
                if (this.viewInfo.hasFillEffect && typeof this.fill === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.viewInfo.hasFillEffect;
                }
            }

            if (this.stroke && is_gradient_or_texture(this.stroke)) {
                this.viewInfo.hasStrokeEffect = true;
                this.stroke.update();
                const type = this.stroke.viewInfo.type as 'linear-gradient' | 'radial-gradient' | 'texture';
                switch (type) {
                    case 'linear-gradient': {
                        svg['linear-gradient'].render.call(this.fill as unknown as LinearGradient, domElement, true, svgElement);
                        break;
                    }
                    case 'radial-gradient': {
                        svg['radial-gradient'].render.call(this.fill as unknown as RadialGradient, domElement, true, svgElement);
                        break;
                    }
                    case 'texture': {
                        svg['texture'].render.call(this.fill as unknown as Texture, domElement, true, svgElement);
                        break;
                    }
                    default: {
                        throw new Error(`${type}`);
                    }
                }
            }

            if (this.flags[Flag.Stroke]) {
                if (this.stroke) {
                    changed.stroke = serialize_color(this.stroke);
                }
                if (this.viewInfo.hasStrokeEffect && typeof this.stroke === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.viewInfo.hasStrokeEffect;
                }
            }

            if (this.flags[Flag.Linewidth]) {
                changed['stroke-width'] = `${this.linewidth}`;
            }

            if (this.flags[Flag.Opacity]) {
                changed['stroke-opacity'] = `${this.opacity}`;
                changed['fill-opacity'] = `${this.opacity}`;
            }

            if (this.flags[Flag.ClassName]) {
                changed['class'] = this.classList.join(' ');
            }

            if (this.flags[Flag.VectorEffect]) {
                changed['vector-effect'] = this.vectorEffect;
            }

            if (this.flags[Flag.Visible]) {
                changed.visibility = this.visible ? 'visible' : 'hidden';
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

            if (this.viewInfo.elem) {
                // When completely reactive, this will not be needed
                svg.setAttributes(this.viewInfo.elem, changed);
            }
            else {
                changed.id = this.id;
                this.viewInfo.elem = svg.createElement('path', changed);
                domElement.appendChild(this.viewInfo.elem);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                this.viewInfo.matrix_change = this.matrix.change$.subscribe((matrix) => {
                    const change: SVGAttributes = {};
                    change.transform = transform_value_of_matrix(this.board, matrix);
                    svg.setAttributes(this.viewInfo.elem, change);
                });

                effect(() => {
                    console.log("visible", this.visible);
                    const change: SVGAttributes = {};
                    change.visibility = this.visible ? 'visible' : 'hidden';
                    svg.setAttributes(this.viewInfo.elem, change);
                })
            }

            if (this.flags[Flag.Clip]) {

                const clip = svg.getClip(this, svgElement);
                const elem = this.viewInfo.elem;

                if (this.clip) {
                    elem.removeAttribute('id');
                    clip.setAttribute('id', this.id);
                    clip.appendChild(elem);
                }
                else {
                    clip.removeAttribute('id');
                    elem.setAttribute('id', this.id);
                    if (this.parent) {
                        this.parent.viewInfo.elem.appendChild(elem); // TODO: should be insertBefore
                    }
                }

            }

            // Commented two-way functionality of clips / masks with groups and
            // polygons. Uncomment when this bug is fixed:
            // https://code.google.com/p/chromium/issues/detail?id=370951

            if (this.flags[Flag.Mask]) {
                if (this.mask) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (svg as any)[this.mask.viewInfo.type].render.call(this.mask, domElement);
                    this.viewInfo.elem.setAttribute('clip-path', 'url(#' + this.mask.id + ')');
                }
                else {
                    this.viewInfo.elem.removeAttribute('clip-path');
                }
            }

            return this.flagReset();

        }

    },

    'points': {
        render: function (this: Points, domElement: DOMElement, svgElement: SVGElement) {

            // Shortcut for hidden objects.
            // Doesn't reset the flags, so changes are stored and
            // applied once the object is visible again
            if (this._opacity === 0 && !this._flagOpacity) {
                return this;
            }

            this.update();

            // Collect any attribute that needs to be changed here
            const changed: SVGAttributes = {};

            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];

            if (flagMatrix) {
                changed.transform = transform_value_of_matrix(this.board, this.matrix);
            }

            if (this.flags[Flag.Id]) {
                changed.id = this.id;
            }

            if (this._flagVertices || this._flagSize || this._flagSizeAttenuation) {
                let size = this._size;
                if (!this._sizeAttenuation) {
                    const { scaleX, scaleY } = decompose_2d_3x3_matrix(this.worldMatrix);
                    size /= Math.max(scaleX, scaleY);
                }
                const vertices = svg.pointsToPathDefinition(this.viewInfo.anchor_collection, size);
                changed.d = vertices;
            }

            const fill = this.fill;
            if (fill && typeof fill === 'object' && fill.viewInfo) {
                this.viewInfo.hasFillEffect = true;
                fill.update();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (svg as any)[fill.viewInfo.type].render.call(this.fill, domElement, true);
            }

            if (this._flagFill) {
                changed.fill = color_value(fill);
                if (this.viewInfo.hasFillEffect && typeof fill === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.viewInfo.hasFillEffect;
                }
            }

            const stroke = this.stroke;
            if (stroke && typeof stroke === 'object' && stroke.viewInfo) {
                this.viewInfo.hasStrokeEffect = true;
                stroke.update();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (svg as any)[stroke.viewInfo.type].render.call(this.stroke, domElement, true);
            }

            if (this._flagStroke) {
                changed.stroke = color_value(stroke);
                if (this.viewInfo.hasStrokeEffect && typeof stroke === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.viewInfo.hasStrokeEffect;
                }
            }

            if (this._flagLinewidth) {
                changed['stroke-width'] = `${this.linewidth}`;
            }

            if (this._flagOpacity) {
                changed['stroke-opacity'] = `${this.opacity}`;
                changed['fill-opacity'] = `${this.opacity}`;
            }

            if (this.flags[Flag.ClassName]) {
                changed['class'] = this.classList.join(' ');
            }

            if (this._flagVisible) {
                changed.visibility = this._visible ? 'visible' : 'hidden';
            }

            if (this.dashes && this.dashes.length > 0) {
                changed['stroke-dasharray'] = this.dashes.join(' ');
                changed['stroke-dashoffset'] = `${get_dashes_offset(this.dashes) || 0}`;
            }

            if (!this.viewInfo.elem) {
                changed.id = this.id;
                this.viewInfo.elem = svg.createElement('path', changed);
                domElement.appendChild(this.viewInfo.elem);
            }
            else {
                svg.setAttributes(this.viewInfo.elem, changed);
            }
            return this.flagReset();
        }
    },

    'text': {
        render: function (this: Text, domElement: DOMElement, svgElement: SVGElement) {

            this.update();

            // The styles that will be applied to an SVG
            const changed: SVGAttributes = {};

            const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];

            if (flagMatrix) {
                // Text and Images, unlike Path(s), are not compensated (yet) for the 90 degree rotation that makes the  
                const goofy = this.board.goofy;
                const position = this.position;
                const x = position.x;
                const y = position.y;
                const attitude = this.attitude;
                const scale = this.scaleXY;
                const sx = scale.x;
                const sy = scale.y;
                if (goofy) {
                    const cos_φ = attitude.a;
                    const sin_φ = attitude.b;
                    compose_2d_3x3_transform(x, y, sx, sy, cos_φ, sin_φ, this.skewX, this.skewY, this.matrix);
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
                    compose_2d_3x3_transform(y, x, sy, sx, cos_φ, sin_φ, this.skewY, this.skewX, this.matrix);
                }

                // compose_2d_3x3_transform()
                changed.transform = transform_value_of_matrix(this.board, this.matrix);
            }

            if (this.flags[Flag.Id]) {
                changed.id = this.id;
            }

            if (this.flags[Flag.Family]) {
                changed['font-family'] = this.family;
            }
            if (this.flags[Flag.Size]) {
                changed['font-size'] = `${this.size}`;
            }
            if (this._flagLeading) {
                changed['line-height'] = `${this.leading}`;
            }
            if (this._flagAlignment) {
                changed['text-anchor'] = svg.alignments[this.alignment]/* || this._alignment*/;
            }
            if (this._flagBaseline) {
                changed['dominant-baseline'] = svg.baselines[this.baseline]/* || this._baseline*/;
            }
            if (this._flagStyle) {
                changed['font-style'] = this.style;
            }
            if (this._flagWeight) {
                changed['font-weight'] = `${this.weight}`;
            }
            if (this._flagDecoration) {
                changed['text-decoration'] = this.decoration;
            }
            if (this._flagDirection) {
                changed['direction'] = this.direction;
            }
            const fill = this.fill;
            if (fill && typeof fill === 'object' && fill.viewInfo) {
                this.viewInfo.hasFillEffect = true;
                fill.update();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (svg as any)[fill.viewInfo.type].render.call(this.fill, domElement, true);
            }
            if (this._flagFill) {
                changed.fill = color_value(fill);
                if (this.viewInfo.hasFillEffect && typeof fill === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.viewInfo.hasFillEffect;
                }
            }
            const stroke = this.stroke;
            if (stroke && typeof stroke === 'object' && stroke.viewInfo) {
                this.viewInfo.hasStrokeEffect = true;
                stroke.update();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (svg as any)[stroke.viewInfo.type].render.call(this.stroke, domElement, true);
            }
            if (this._flagStroke) {
                changed.stroke = color_value(stroke);
                if (this.viewInfo.hasStrokeEffect && typeof stroke === 'string') {
                    set_defs_flag_update(get_dom_element_defs(svgElement), true);
                    delete this.viewInfo.hasStrokeEffect;
                }
            }
            if (this._flagLinewidth) {
                changed['stroke-width'] = `${this.linewidth}`;
            }
            if (this.flags[Flag.Opacity]) {
                changed.opacity = `${this.opacity}`;
            }
            if (this.flags[Flag.ClassName]) {
                changed['class'] = this.classList.join(' ');
            }
            if (this.flags[Flag.Visible]) {
                changed.visibility = this.visible ? 'visible' : 'hidden';
            }
            if (this.dashes && this.dashes.length > 0) {
                changed['stroke-dasharray'] = this.dashes.join(' ');
                changed['stroke-dashoffset'] = `${get_dashes_offset(this.dashes) || 0}`;
            }

            if (this.viewInfo.elem) {
                svg.setAttributes(this.viewInfo.elem, changed);
            }
            else {
                changed.id = this.id;
                this.viewInfo.elem = svg.createElement('text', changed);
                domElement.appendChild(this.viewInfo.elem);

                this.family$.subscribe((family) => {
                    svg.setAttributes(this.viewInfo.elem, { 'font-family': family });
                })
                this.opacity$.subscribe((opacity) => {
                    svg.setAttributes(this.viewInfo.elem, { opacity: `${opacity}` });
                })
                this.size$.subscribe((size) => {
                    svg.setAttributes(this.viewInfo.elem, { 'font-size': `${size}` });
                })
                this.value$.subscribe((value) => {
                    this.viewInfo.elem.textContent = value;
                })
                this.visible$.subscribe((visible) => {
                    svg.setAttributes(this.viewInfo.elem, { visibility: visible ? 'visible' : 'hidden' });
                })
            }

            if (this._flagClip) {
                const clip = svg.getClip(this, svgElement);
                const elem = this.viewInfo.elem;

                if (this.clip) {
                    elem.removeAttribute('id');
                    clip.setAttribute('id', this.id);
                    clip.appendChild(elem);
                }
                else {
                    clip.removeAttribute('id');
                    elem.setAttribute('id', this.id);
                    this.parent.viewInfo.elem.appendChild(elem); // TODO: should be insertBefore
                }
            }

            // Commented two-way functionality of clips / masks with groups and
            // polygons. Uncomment when this bug is fixed:
            // https://code.google.com/p/chromium/issues/detail?id=370951

            if (this._flagMask) {
                if (this._mask) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (svg as any)[this._mask.viewInfo.type].render.call(this._mask, domElement);
                    this.viewInfo.elem.setAttribute('clip-path', 'url(#' + this._mask.id + ')');
                }
                else {
                    this.viewInfo.elem.removeAttribute('clip-path');
                }
            }

            if (this.flags[Flag.Value]) {
                this.viewInfo.elem.textContent = this.value;
            }

            return this.flagReset();
        }
    },

    'linear-gradient': {
        render: function (this: LinearGradient, domElement: DOMElement, silent = false, svgElement: SVGElement) {

            if (!silent) {
                this.update();
            }

            const changed: SVGAttributes = {};

            if (this.flags[Flag.Id]) {
                changed.id = this.id;
            }

            if (this._flagEndPoints) {
                changed.x1 = `${this.left.x}`;
                changed.y1 = `${this.left.y}`;
                changed.x2 = `${this.right.x}`;
                changed.y2 = `${this.right.y}`;
            }

            if (this._flagSpread) {
                changed.spreadMethod = this.spread;
            }

            if (this._flagUnits) {
                changed.gradientUnits = this._units;
            }

            // If there is no attached DOM element yet,
            // create it with all necessary attributes.
            if (!this.viewInfo.elem) {

                changed.id = this.id;
                this.viewInfo.elem = svg.createElement('linearGradient', changed);

                // Otherwise apply all pending attributes
            }
            else {

                svg.setAttributes(this.viewInfo.elem, changed);

            }

            if (this.viewInfo.elem.parentNode === null) {
                get_dom_element_defs(svgElement).appendChild(this.viewInfo.elem);
            }

            if (this._flagStops) {

                const lengthChanged = this.viewInfo.elem.childNodes.length !== this.stops.length;

                if (lengthChanged) {
                    while (this.viewInfo.elem.lastChild) {
                        this.viewInfo.elem.removeChild(this.viewInfo.elem.lastChild);
                    }
                }

                for (let i = 0; i < this.stops.length; i++) {

                    const stop = this.stops[i];
                    const attrs: SVGAttributes = {};

                    if (stop._flagOffset) {
                        attrs.offset = 100 * stop.offset + '%';
                    }
                    if (stop._flagColor) {
                        attrs['stop-color'] = stop._color;
                    }
                    if (stop._flagOpacity) {
                        attrs['stop-opacity'] = `${stop._opacity}`;
                    }

                    if (!stop.viewInfo.elem) {
                        stop.viewInfo.elem = svg.createElement('stop', attrs);
                    }
                    else {
                        svg.setAttributes(stop.viewInfo.elem, attrs);
                    }

                    if (lengthChanged) {
                        this.viewInfo.elem.appendChild(stop.viewInfo.elem);
                    }
                    stop.flagReset();
                }
            }
            return this.flagReset();
        }

    },

    'radial-gradient': {
        render: function (this: RadialGradient, domElement: DOMElement, silent = false, svgElement: SVGElement) {

            if (!silent) {
                this.update();
            }

            const changed: SVGAttributes = {};

            if (this.flags[Flag.Id]) {
                changed.id = this.id;
            }
            if (this._flagCenter) {
                changed.cx = `${this.center.x}`;
                changed.cy = `${this.center.y}`;
            }
            if (this._flagFocal) {
                changed.fx = `${this.focal.x}`;
                changed.fy = `${this.focal.y}`;
            }
            if (this._flagRadius) {
                changed.r = `${this.radius}`;
            }
            if (this._flagSpread) {
                changed.spreadMethod = this._spread;
            }

            if (this._flagUnits) {
                changed.gradientUnits = this._units;
            }

            if (this.viewInfo.elem) {
                svg.setAttributes(this.viewInfo.elem, changed);
            }
            else {
                changed.id = this.id;
                this.viewInfo.elem = svg.createElement('radialGradient', changed);
            }

            if (this.viewInfo.elem.parentNode === null) {
                get_dom_element_defs(svgElement).appendChild(this.viewInfo.elem);
            }

            if (this._flagStops) {

                const lengthChanged = this.viewInfo.elem.childNodes.length !== this.stops.length;

                if (lengthChanged) {
                    while (this.viewInfo.elem.lastChild) {
                        this.viewInfo.elem.removeChild(this.viewInfo.elem.lastChild);
                    }
                }

                for (let i = 0; i < this.stops.length; i++) {

                    const stop = this.stops[i];
                    const attrs: SVGAttributes = {};

                    if (stop._flagOffset) {
                        attrs.offset = 100 * stop.offset + '%';
                    }
                    if (stop._flagColor) {
                        attrs['stop-color'] = stop._color;
                    }
                    if (stop._flagOpacity) {
                        attrs['stop-opacity'] = `${stop._opacity}`;
                    }

                    if (stop.viewInfo.elem) {
                        svg.setAttributes(stop.viewInfo.elem, attrs);
                    }
                    else {
                        stop.viewInfo.elem = svg.createElement('stop', attrs);
                    }

                    if (lengthChanged) {
                        this.viewInfo.elem.appendChild(stop.viewInfo.elem);
                    }
                    stop.flagReset();

                }

            }

            return this.flagReset();

        }

    },

    'texture': {
        render: function (this: Texture, domElement: DOMElement, silent = false, svgElement: SVGElement) {

            if (!silent) {
                this.update();
            }

            // TODO: Texture rendering will need testing of the conversion to SVGAttributes...
            const changed: SVGProperties = {};

            const styles: SVGAttributes = { x: '0', y: '0' };

            const image = this.image;

            if (this.flags[Flag.Id]) {
                changed.id = this.id;
            }

            if (this._flagLoaded && this.loaded) {

                if (is_canvas(image)) {
                    styles.href = image.toDataURL('image/png');
                }
                else if (is_img(image)) {
                    styles.href = this.src;
                }
                else if (is_video(image)) {
                    styles.href = this.src;
                }
                else {
                    throw new Error();
                }
            }

            if (this._flagOffset || this._flagLoaded || this._flagScale) {

                changed.x = this.offset.x;
                changed.y = this.offset.y;

                if (image) {

                    changed.x -= image.width / 2;
                    changed.y -= image.height / 2;

                    if (this.scale instanceof G20) {
                        changed.x *= this.scale.x;
                        changed.y *= this.scale.y;
                    }
                    else {
                        changed.x *= this.scale;
                        changed.y *= this.scale;
                    }
                }

                if (changed.x > 0) {
                    changed.x *= - 1;
                }
                if (changed.y > 0) {
                    changed.y *= - 1;
                }

            }

            if (this._flagScale || this._flagLoaded || this._flagRepeat) {

                changed.width = 0;
                changed.height = 0;

                if (image) {

                    changed.width = image.width;
                    styles.width = `${image.width}`;
                    changed.height = image.height;
                    styles.height = `${image.height}`;

                    // TODO: Hack / Band-aid
                    switch (this._repeat) {
                        case 'no-repeat':
                            changed.width += 1;
                            changed.height += 1;
                            break;
                    }

                    if (this.scale instanceof G20) {
                        changed.width *= this.scale.x;
                        changed.height *= this.scale.y;
                    }
                    else {
                        changed.width *= this.scale;
                        changed.height *= this.scale;
                    }
                }

            }

            if (this._flagScale || this._flagLoaded) {
                if (!this.viewInfo.image) {
                    this.viewInfo.image = svg.createElement('image', styles) as SVGImageElement;
                }
                else {
                    svg.setAttributes(this.viewInfo.image, styles);
                }
            }

            if (!this.viewInfo.elem) {

                changed.id = this.id;
                changed.patternUnits = 'userSpaceOnUse';
                this.viewInfo.elem = svg.createElement('pattern', serialize_svg_props(changed));

            }
            else if (Object.keys(changed).length !== 0) {

                svg.setAttributes(this.viewInfo.elem, serialize_svg_props(changed));

            }

            if (this.viewInfo.elem.parentNode === null) {
                get_dom_element_defs(svgElement).appendChild(this.viewInfo.elem);
            }

            if (this.viewInfo.elem && this.viewInfo.image && !this.viewInfo.appended) {
                this.viewInfo.elem.appendChild(this.viewInfo.image);
                this.viewInfo.appended = true;
            }

            return this.flagReset();
        }
    }
} as const;

export interface SVGViewParams {
    domElement?: SVGElement;
}

export class SVGView implements View {

    readonly domElement: SVGElement;
    readonly scene: Group;
    readonly defs: SVGDefsElement;

    width?: number;
    height?: number;

    readonly #size: BehaviorSubject<{ width: number; height: number }>;
    readonly size$: Observable<{ width: number; height: number }>;

    constructor(scene: Group, params: SVGViewParams = {}) {
        if (scene instanceof Group) {
            this.scene = scene;
            this.scene.parent = null;//this;
        }
        else {
            throw new Error("scene must be a Group");
        }
        if (params.domElement) {
            this.domElement = params.domElement;
        }
        else {
            this.domElement = svg.createElement('svg');
        }

        this.defs = svg.createElement('defs') as SVGDefsElement;
        set_defs_flag_update(this.defs, false);
        this.domElement.appendChild(this.defs);
        set_dom_element_defs(this.domElement, this.defs);
        this.domElement.style.overflow = 'hidden';

        this.#size = new BehaviorSubject({ width: this.width, height: this.height });
        this.size$ = this.#size.asObservable();
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
        const thisArg = this.scene;
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
function transform_value_of_matrix(board: IBoard, m: Matrix): string {
    const a = m.a;
    const b = m.b;
    const c = m.c;
    const d = m.d;
    const e = m.e;
    const f = m.f;
    return `matrix(${[a, b, c, d, e, f].map(toFixed).join(' ')})`;
}

function color_value(thing: string | LinearGradient | RadialGradient | Texture): string {
    if (typeof thing === 'object') {
        return 'url(#' + thing.id + ')';
    }
    else {
        return thing;
    }
}

/**
 * If the bounding box is oriented such that y increases in the upwards direction,
 * exchange the x and y coordinates because we will be applying a 90 degree rotation.
 */
function screen_functions(board: IBoard) {
    if (board.goofy) {
        return [(x: number, y: number): number => x, (x: number, y: number): number => y];
    }
    else {
        return [(x: number, y: number): number => y, (x: number, y: number): number => x];
    }
}
