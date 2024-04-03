import { BehaviorSubject } from 'rxjs';
import { Anchor } from '../anchor';
import { Gradient } from '../effects/gradient';
import { LinearGradient } from '../effects/linear-gradient';
import { RadialGradient } from '../effects/radial-gradient';
import { is_canvas, is_img, is_video, Texture } from '../effects/texture';
import { Element as ElementBase } from '../element';
import { Group } from '../group';
import { get_dashes_offset, Path } from '../path';
import { Observable } from '../rxjs/Observable';
import { Shape } from '../shape';
import { Points } from '../shapes/points';
import { Text } from '../text';
import { decomposeMatrix } from '../utils/decompose_matrix';
import { mod, toFixed } from '../utils/math';
import { Commands } from '../utils/path-commands';
import { G20 } from '../vector';
import { View } from './View';

type DOMElement = HTMLElement | SVGElement;

function set_dom_element_defs(domElement: DOMElement, defs: SVGDefsElement): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (domElement as any).defs = defs;
}

function get_dom_element_defs(domElement: DOMElement): SVGDefsElement {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (domElement as any).defs;
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

function is_gradient_or_texture(x: string | Gradient | Texture): x is Gradient | Texture {
    return x instanceof Gradient || x instanceof Texture;
}

function serialize_color(x: string | Gradient | Texture): string {
    if (is_gradient_or_texture(x)) {
        // TODO: This assumes that Gradient or Texture have a meaningful toString. That's bad.
        return 'url(#' + x + ')';
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
    'dominant-baseline'?: 'auto' | 'middle' | 'hanging';
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
    'stroke-linecap'?: string;
    'stroke-linejoin'?: string;
    'stroke-miterlimit'?: string;
    'stroke-opacity'?: string;
    'stroke-width'?: string;
    'text-decoration'?: string;
    'transform'?: string;
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
        // SVGAttributes doe snot have an index signature.
        const styles = attrs as { [name: string]: string };
        const keys = Object.keys(attrs);
        for (let i = 0; i < keys.length; i++) {
            if (/href/.test(keys[i])) {
                elem.setAttributeNS(svg.xlink, keys[i], styles[keys[i]]);
            }
            else {
                elem.setAttribute(keys[i], styles[keys[i]]);
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

    // Turn a set of vertices into a string for the d property of a path
    // element. It is imperative that the string collation is as fast as
    // possible, because this call will be happening multiple times a
    // second.
    toString: function (points: Anchor[], closed: boolean): string {

        const l = points.length;
        const last = l - 1;
        let d; // The elusive last Commands.move point
        let string = '';

        for (let i = 0; i < l; i++) {

            const b = points[i];

            const prev = closed ? mod(i - 1, l) : Math.max(i - 1, 0);
            const a = points[prev];

            let command, c;
            let vx, vy, ux, uy, ar, bl, br, cl;
            let rx, ry, xAxisRotation, largeArcFlag, sweepFlag;

            // Access x and y directly,
            // bypassing the getter
            let x = toFixed(b.x);
            let y = toFixed(b.y);

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
                        vx = toFixed((ar.x + a.x));
                        vy = toFixed((ar.y + a.y));
                    }
                    else {
                        vx = toFixed(ar.x);
                        vy = toFixed(ar.y);
                    }

                    if (b.relative) {
                        ux = toFixed((bl.x + b.x));
                        uy = toFixed((bl.y + b.y));
                    }
                    else {
                        ux = toFixed(bl.x);
                        uy = toFixed(bl.y);
                    }

                    command = ((i === 0) ? Commands.move : Commands.curve) +
                        ' ' + vx + ' ' + vy + ' ' + ux + ' ' + uy + ' ' + x + ' ' + y;
                    break;

                case Commands.move:
                    d = b;
                    command = Commands.move + ' ' + x + ' ' + y;
                    break;

                default:
                    command = b.command + ' ' + x + ' ' + y;

            }

            // Add a final point and close it off

            if (i >= last && closed) {

                if (b.command === Commands.curve) {

                    // Make sure we close to the most previous Commands.move
                    c = d;

                    br = (b.controls && b.controls.right) || b;
                    cl = (c.controls && c.controls.left) || c;

                    if (b.relative) {
                        vx = toFixed((br.x + b.x));
                        vy = toFixed((br.y + b.y));
                    }
                    else {
                        vx = toFixed(br.x);
                        vy = toFixed(br.y);
                    }

                    if (c.relative) {
                        ux = toFixed((cl.x + c.x));
                        uy = toFixed((cl.y + c.y));
                    }
                    else {
                        ux = toFixed(cl.x);
                        uy = toFixed(cl.y);
                    }

                    x = toFixed(c.x);
                    y = toFixed(c.y);

                    command +=
                        ' C ' + vx + ' ' + vy + ' ' + ux + ' ' + uy + ' ' + x + ' ' + y;

                }

                if (b.command !== Commands.close) {
                    command += ' Z';
                }

            }

            string += command + ' ';

        }

        return string;

    },

    pointsToString: function (points: { x: number; y: number }[], size: number) {
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

    getClip: function (shape: Shape<Group>, domElement: DOMElement) {
        let clip = shape.viewInfo.clip;
        if (!clip) {
            clip = shape.viewInfo.clip = svg.createElement('clipPath', {
                'clip-rule': 'nonzero'
            }) as SVGClipPathElement;
        }
        if (clip.parentNode === null) {
            get_dom_element_defs(domElement).appendChild(clip);
        }
        return clip;
    },

    defs: {
        update: function (domElement: HTMLElement | SVGElement) {
            const defs = get_dom_element_defs(domElement);
            if (get_defs_flag_update(defs)) {
                const children = Array.prototype.slice.call(defs.children, 0);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const id = child.id;
                    const selector = `[fill="url(#${id})"],[stroke="url(#${id})"],[clip-path="url(#${id})"]`;
                    const exists = domElement.querySelector(selector);
                    if (!exists) {
                        defs.removeChild(child);
                    }
                }
                set_defs_flag_update(defs, false);
            }
        }
    },

    group: {

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
        /**
         * DGH: This doesn't seem to be used. 
         */
        renderChild: function (this: DOMElement, child: ElementBase<unknown>) {
            const type = child.viewInfo.type;
            switch (type) {
                case 'group': {
                    svg.group.render.call(child as Group, this);
                    break;
                }
                case 'linear-gradient': {
                    svg.group['linear-gradient'].render.call(child as LinearGradient, this);
                    break;
                }
                case 'path': {
                    svg.group.path.render.call(child as Path, this);
                    break;
                }
                default: {
                    // DGH: This doesn't make sense, but then I think it was dead code.
                    // svg[child._renderer.type].render.call(child, this);
                    throw new Error(`renderChild ${type}`);
                }
            }
        },

        render: function (this: Group, domElement: DOMElement): void {

            // Shortcut for hidden objects.
            // Doesn't reset the flags, so changes are stored and
            // applied once the object is visible again
            if ((!this._visible && !this._flagVisible) || (this._opacity === 0 && !this._flagOpacity)) {
                return;
            }

            this._update();

            if (!this.viewInfo.elem) {
                this.viewInfo.elem = svg.createElement('g', {
                    id: this.id
                });
                domElement.appendChild(this.viewInfo.elem);
            }

            // _Update styles for the <g>
            const flagMatrix = this.matrix.manual || this._flagMatrix;
            const dom_context: DomContext = {
                domElement: domElement,
                elem: this.viewInfo.elem
            };

            if (flagMatrix) {
                this.viewInfo.elem.setAttribute('transform', 'matrix(' + this.matrix.toString() + ')');
            }

            for (let i = 0; i < this.children.length; i++) {
                const child = this.children.getAt(i);
                // DGH: How does this work?
                // svg[child._renderer.type].render.call(child, domElement);
                // DGH: This seems to make more sense.
                svg.group.renderChild.call(dom_context.domElement, child);
            }

            if (this._flagId) {
                this.viewInfo.elem.setAttribute('id', this._id);
            }

            if (this._flagOpacity) {
                this.viewInfo.elem.setAttribute('opacity', `${this.opacity}`);
            }

            if (this._flagVisible) {
                this.viewInfo.elem.setAttribute('display', this._visible ? 'inline' : 'none');
            }

            if (this._flagClassName) {
                this.viewInfo.elem.setAttribute('class', this.classList.join(' '));
            }

            if (this._flagAdditions) {
                this.additions.forEach(svg.group.appendChild, dom_context);
            }

            if (this._flagSubtractions) {
                this.subtractions.forEach(svg.group.removeChild, dom_context);
            }

            if (this._flagOrder) {
                this.children.forEach(svg.group.orderChild, dom_context);
            }

            // Commented two-way functionality of clips / masks with groups and
            // polygons. Uncomment when this bug is fixed:
            // https://code.google.com/p/chromium/issues/detail?id=370951

            // if (this._flagClip) {

            //   clip = svg.getClip(this, domElement);
            //   elem = this._renderer.elem;

            //   if (this._clip) {
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

                if (this._flagMask) {
                    if (this.mask) {
                        svg[this.mask.viewInfo.type].render.call(this.mask, domElement);
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

        'path': {
            render: function (this: Path, domElement: DOMElement) {

                // Shortcut for hidden objects.
                // Doesn't reset the flags, so changes are stored and
                // applied once the object is visible again
                if (this._opacity === 0 && !this._flagOpacity) {
                    return this;
                }

                this._update();

                // Collect any attribute that needs to be changed here
                const changed: SVGAttributes = {};

                const flagMatrix = this.matrix.manual || this._flagMatrix;

                if (flagMatrix) {
                    changed.transform = 'matrix(' + this.matrix.toString() + ')';
                }

                if (this._flagId) {
                    changed.id = this._id;
                }

                if (this._flagVertices) {
                    const vertices = svg.toString(this.viewInfo.anchor_vertices, this._closed);
                    changed.d = vertices;
                }

                if (this._fill && is_gradient_or_texture(this._fill)) {
                    this.viewInfo.hasFillEffect = true;
                    this._fill._update();
                    const type = this._fill.viewInfo.type as 'linear-gradient' | 'radial-gradient' | 'texture';
                    switch (type) {
                        case 'linear-gradient': {
                            svg.group['linear-gradient'].render.call(this._fill as unknown as LinearGradient, domElement, true);
                            break;
                        }
                        case 'radial-gradient': {
                            svg.group['radial-gradient'].render.call(this._fill as unknown as RadialGradient, domElement, true);
                            break;
                        }
                        case 'texture': {
                            svg.group['texture'].render.call(this._fill as unknown as Texture, domElement, true);
                            break;
                        }
                        default: {
                            throw new Error(`${type}`);
                        }
                    }
                }

                if (this._flagFill) {
                    if (this._fill) {
                        changed.fill = serialize_color(this._fill);
                    }
                    if (this.viewInfo.hasFillEffect && typeof this._fill === 'string') {
                        set_defs_flag_update(get_dom_element_defs(domElement), true);
                        delete this.viewInfo.hasFillEffect;
                    }
                }

                if (this._stroke && is_gradient_or_texture(this._stroke)) {
                    this.viewInfo.hasStrokeEffect = true;
                    this._stroke._update();
                    const type = this._stroke.viewInfo.type as 'linear-gradient' | 'radial-gradient' | 'texture';
                    switch (type) {
                        case 'linear-gradient': {
                            svg.group['linear-gradient'].render.call(this._fill as unknown as LinearGradient, domElement, true);
                            break;
                        }
                        case 'radial-gradient': {
                            svg.group['radial-gradient'].render.call(this._fill as unknown as RadialGradient, domElement, true);
                            break;
                        }
                        case 'texture': {
                            svg.group['texture'].render.call(this._fill as unknown as Texture, domElement, true);
                            break;
                        }
                        default: {
                            throw new Error(`${type}`);
                        }
                    }
                }

                if (this._flagStroke) {
                    if (this._stroke) {
                        changed.stroke = serialize_color(this._stroke);
                    }
                    if (this.viewInfo.hasStrokeEffect && typeof this._stroke === 'string') {
                        set_defs_flag_update(get_dom_element_defs(domElement), true);
                        delete this.viewInfo.hasStrokeEffect;
                    }
                }

                if (this._flagLinewidth) {
                    changed['stroke-width'] = `${this._linewidth}`;
                }

                if (this._flagOpacity) {
                    changed['stroke-opacity'] = `${this._opacity}`;
                    changed['fill-opacity'] = `${this._opacity}`;
                }

                if (this._flagClassName) {
                    changed['class'] = this.classList.join(' ');
                }

                if (this._flagVisible) {
                    changed.visibility = this._visible ? 'visible' : 'hidden';
                }

                if (this._flagCap) {
                    changed['stroke-linecap'] = this.cap;
                }

                if (this._flagJoin) {
                    changed['stroke-linejoin'] = this._join;
                }

                if (this._flagMiter) {
                    changed['stroke-miterlimit'] = `${this._miter}`;
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
                    changed.id = this._id;
                    this.viewInfo.elem = svg.createElement('path', changed);
                    domElement.appendChild(this.viewInfo.elem);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    this.position.change$.subscribe((position) => {
                        // The position could be used to compute the transform.
                        this._update();
                        const change: SVGAttributes = {};
                        change.transform = 'matrix(' + this.matrix.toString() + ')';
                        svg.setAttributes(this.viewInfo.elem, changed);
                    });
                }

                if (this._flagClip) {

                    const clip = svg.getClip(this, domElement);
                    const elem = this.viewInfo.elem;

                    if (this._clip) {
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
                        svg[this._mask.viewInfo.type].render.call(this._mask, domElement);
                        this.viewInfo.elem.setAttribute('clip-path', 'url(#' + this._mask.id + ')');
                    }
                    else {
                        this.viewInfo.elem.removeAttribute('clip-path');
                    }
                }

                return this.flagReset();

            }

        },

        'points': {

            render: function (this: Points, domElement: DOMElement) {

                // Shortcut for hidden objects.
                // Doesn't reset the flags, so changes are stored and
                // applied once the object is visible again
                if (this._opacity === 0 && !this._flagOpacity) {
                    return this;
                }

                this._update();

                // Collect any attribute that needs to be changed here
                const changed: SVGAttributes = {};

                const flagMatrix = this.matrix.manual || this._flagMatrix;

                if (flagMatrix) {
                    changed.transform = 'matrix(' + this.matrix.toString() + ')';
                }

                if (this._flagId) {
                    changed.id = this._id;
                }

                if (this._flagVertices || this._flagSize || this._flagSizeAttenuation) {
                    let size = this._size;
                    if (!this._sizeAttenuation) {
                        const me = this.worldMatrix.elements;
                        const m = decomposeMatrix(me[0], me[3], me[1], me[4], me[2], me[5]);
                        size /= Math.max(m.scaleX, m.scaleY);
                    }
                    const vertices = svg.pointsToString(this.viewInfo.anchor_collection, size);
                    changed.d = vertices;
                }

                if (this._fill && this._fill._renderer) {
                    this.viewInfo.hasFillEffect = true;
                    this._fill._update();
                    svg[this._fill._renderer.type].render.call(this._fill, domElement, true);
                }

                if (this._flagFill) {
                    changed.fill = this._fill && this._fill.id
                        ? 'url(#' + this._fill.id + ')' : this._fill;
                    if (this.viewInfo.hasFillEffect && typeof this._fill.id === 'undefined') {
                        domElement.defs._flagUpdate = true;
                        delete this.viewInfo.hasFillEffect;
                    }
                }

                if (this._stroke && this._stroke._renderer) {
                    this.viewInfo.hasStrokeEffect = true;
                    this._stroke._update();
                    svg[this._stroke._renderer.type].render.call(this._stroke, domElement, true);
                }

                if (this._flagStroke) {
                    changed.stroke = this._stroke && this._stroke.id
                        ? 'url(#' + this._stroke.id + ')' : this._stroke;
                    if (this.viewInfo.hasStrokeEffect && typeof this._stroke.id === 'undefined') {
                        set_defs_flag_update(get_dom_element_defs(domElement), true);
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

                if (this._flagClassName) {
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
                    changed.id = this._id;
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
            render: function (this: Text, domElement: DOMElement) {

                this._update();

                // The styles that will be applied to an SVG
                const changed: SVGAttributes = {};

                const flagMatrix = this.matrix.manual || this._flagMatrix;

                if (flagMatrix) {
                    changed.transform = 'matrix(' + this.matrix.toString() + ')';
                }

                if (this._flagId) {
                    changed.id = this._id;
                }

                if (this._flagFamily) {
                    changed['font-family'] = this.family;
                }
                if (this._flagSize) {
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
                if (this._fill && this._fill._renderer) {
                    this.viewInfo.hasFillEffect = true;
                    this._fill._update();
                    svg[this._fill._renderer.type].render.call(this._fill, domElement, true);
                }
                if (this._flagFill) {
                    changed.fill = this._fill && this._fill.id
                        ? 'url(#' + this._fill.id + ')' : this._fill;
                    if (this.viewInfo.hasFillEffect && typeof this._fill.id === 'undefined') {
                        set_defs_flag_update(get_dom_element_defs(domElement), true);
                        delete this.viewInfo.hasFillEffect;
                    }
                }
                if (this._stroke && this._stroke._renderer) {
                    this.viewInfo.hasStrokeEffect = true;
                    this._stroke._update();
                    svg[this._stroke._renderer.type].render.call(this._stroke, domElement, true);
                }
                if (this._flagStroke) {
                    changed.stroke = this._stroke && this._stroke.id
                        ? 'url(#' + this._stroke.id + ')' : this._stroke;
                    if (this.viewInfo.hasStrokeEffect && typeof this._stroke.id === 'undefined') {
                        set_defs_flag_update(get_dom_element_defs(domElement), true);
                        delete this.viewInfo.hasStrokeEffect;
                    }
                }
                if (this._flagLinewidth) {
                    changed['stroke-width'] = `${this.linewidth}`;
                }
                if (this._flagOpacity) {
                    changed.opacity = `${this._opacity}`;
                }
                if (this._flagClassName) {
                    changed['class'] = this.classList.join(' ');
                }
                if (this._flagVisible) {
                    changed.visibility = this._visible ? 'visible' : 'hidden';
                }
                if (this.dashes && this.dashes.length > 0) {
                    changed['stroke-dasharray'] = this.dashes.join(' ');
                    changed['stroke-dashoffset'] = `${get_dashes_offset(this.dashes) || 0}`;
                }

                if (this.viewInfo.elem) {
                    svg.setAttributes(this.viewInfo.elem, changed);
                }
                else {
                    changed.id = this._id;
                    this.viewInfo.elem = svg.createElement('text', changed);
                    domElement.appendChild(this.viewInfo.elem);
                }

                if (this._flagClip) {

                    const clip = svg.getClip(this, domElement);
                    const elem = this.viewInfo.elem;

                    if (this._clip) {
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
                        svg[this._mask.viewInfo.type].render.call(this._mask, domElement);
                        this.viewInfo.elem.setAttribute('clip-path', 'url(#' + this._mask.id + ')');
                    }
                    else {
                        this.viewInfo.elem.removeAttribute('clip-path');
                    }
                }

                if (this._flagValue) {
                    this.viewInfo.elem.textContent = this._value;
                }

                return this.flagReset();

            }

        },

        'linear-gradient': {
            render: function (this: LinearGradient, domElement: DOMElement, silent = false) {

                if (!silent) {
                    this._update();
                }

                const changed: SVGAttributes = {};

                if (this._flagId) {
                    changed.id = this._id;
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

                    changed.id = this._id;
                    this.viewInfo.elem = svg.createElement('linearGradient', changed);

                    // Otherwise apply all pending attributes
                }
                else {

                    svg.setAttributes(this.viewInfo.elem, changed);

                }

                if (this.viewInfo.elem.parentNode === null) {
                    get_dom_element_defs(domElement).appendChild(this.viewInfo.elem);
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
            render: function (this: RadialGradient, domElement: DOMElement, silent = false) {

                if (!silent) {
                    this._update();
                }

                const changed: SVGAttributes = {};

                if (this._flagId) {
                    changed.id = this._id;
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
                    changed.id = this._id;
                    this.viewInfo.elem = svg.createElement('radialGradient', changed);
                }

                if (this.viewInfo.elem.parentNode === null) {
                    get_dom_element_defs(domElement).appendChild(this.viewInfo.elem);
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
            render: function (this: Texture, domElement: DOMElement, silent = false) {

                if (!silent) {
                    this._update();
                }

                // TODO: Texture rendering will need testing of the conversion to SVGAttributes...
                const changed: SVGProperties = {};

                const styles: SVGAttributes = { x: '0', y: '0' };

                const image = this.image;

                if (this._flagId) {
                    changed.id = this._id;
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

                    changed.id = this._id;
                    changed.patternUnits = 'userSpaceOnUse';
                    this.viewInfo.elem = svg.createElement('pattern', serialize_svg_props(changed));

                }
                else if (Object.keys(changed).length !== 0) {

                    svg.setAttributes(this.viewInfo.elem, serialize_svg_props(changed));

                }

                if (this.viewInfo.elem.parentNode === null) {
                    get_dom_element_defs(domElement).appendChild(this.viewInfo.elem);
                }

                if (this.viewInfo.elem && this.viewInfo.image && !this.viewInfo.appended) {
                    this.viewInfo.elem.appendChild(this.viewInfo.image);
                    this.viewInfo.appended = true;
                }

                return this.flagReset();
            }
        }
    }

} as const;

export interface SVGViewParams {
    svgElement?: SVGElement;
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
            this.scene.parent = this;
        }
        else {
            throw new Error("scene must be a Group");
        }
        if (params.svgElement) {
            this.domElement = params.svgElement;
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

    setSize(size: { width: number, height: number }): this {
        this.width = size.width;
        this.height = size.height;
        svg.setAttributes(this.domElement, {
            width: `${size.width}`,
            height: `${size.height}`
        });
        this.#size.next(size);
        return this;
    }

    render(): this {
        const thisArg = this.scene;
        svg.group.render.call(thisArg, this.domElement);
        svg.defs.update(this.domElement);
        return this;
    }
}
