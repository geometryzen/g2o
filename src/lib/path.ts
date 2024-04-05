import { Anchor } from './anchor';
import { Collection } from './collection';
import { Gradient } from './effects/gradient';
import { LinearGradient } from './effects/linear-gradient';
import { RadialGradient } from './effects/radial-gradient';
import { Texture } from './effects/texture';
import { Group } from './group';
import { Subscription } from './rxjs/Subscription';
import { Shape } from './shape';
import { getComponentOnCubicBezier, getCurveBoundingBox, getCurveFromPoints } from './utils/curves';
import { decompose_2d_3x3_matrix } from './utils/decompose_2d_3x3_matrix';
import { lerp, mod } from './utils/math';
import { Commands } from './utils/path-commands';
import { contains, getCurveLength, getIdByLength, getSubdivisions } from './utils/shape';
import { G20 } from './vector.js';

export function get_dashes_offset(dashes: number[]): number | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dashes as any)['offset'];
}

export function set_dashes_offset(dashes: number[], offset: number): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dashes as any)['offset'] = offset;
}


// Constants

const min = Math.min;
const max = Math.max;
const ceil = Math.ceil;
const floor = Math.floor;

const vector = new G20();

export interface PathOptions {
    position?: G20;
    attitude?: G20;
}

export class Path extends Shape<Group> {

    _flagVertices = true;
    _flagLength = true;
    _flagFill = true;
    _flagStroke = true;
    _flagLinewidth = true;
    _flagOpacity = true;
    _flagVisible = true;
    _flagCap = true;
    _flagJoin = true;
    _flagMiter = true;
    _flagMask = false;
    _flagClip = false;

    /**
     * @name Two.Path#_length
     * @private
     * @see {@link Two.Path#length}
     */
    _length = 0;

    readonly _lengths: number[] = [];

    /**
     * @name Two.Path#_fill
     * @private
     * @see {@link Two.Path#fill}
     */
    _fill: string | Gradient | Texture = '#fff';
    #fill_change_subscription: Subscription | null = null;

    /**
     * @name Two.Path#_stroke
     * @private
     * @see {@link Two.Path#stroke}
     */
    _stroke: string | Gradient | Texture = '#000';
    #stroke_change_subscription: Subscription | null = null;

    /**
     * @name Two.Path#_linewidth
     * @private
     * @see {@link Two.Path#linewidth}
     */
    _linewidth = 1;

    /**
     * @name Two.Path#_opacity
     * @private
     * @see {@link Two.Path#opacity}
     */
    _opacity = 1.0;

    /**
     * @name Two.Path#_visible
     * @private
     * @see {@link Two.Path#visible}
     */
    _visible = true;

    /**
     * @name Two.Path#_cap
     * @private
     * @see {@link Two.Path#cap}
     */
    _cap = 'round';

    /**
     * @name Two.Path#_join
     * @private
     * @see {@link Two.Path#join}
     */
    _join = 'round';

    /**
     * @name Two.Path#_miter
     * @private
     * @see {@link Two.Path#miter}
     */
    _miter = 4;

    /**
     * @name Two.Path#_closed
     * @private
     * @see {@link Two.Path#closed}
     */
    _closed = true;

    /**
     * @name Two.Path#_curved
     * @private
     * @see {@link Two.Path#curved}
     */
    _curved = false;

    /**
     * @name Two.Path#_automatic
     * @private
     * @see {@link Two.Path#automatic}
     */
    _automatic = true;

    /**
     * @name Two.Path#_beginning
     * @private
     * @see {@link Two.Path#beginning}
     */
    _beginning = 0;

    /**
     * @name Two.Path#_ending
     * @private
     * @see {@link Two.Path#ending}
     */
    _ending = 1.0;

    _mask: Shape<Group> | null = null;

    /**
     * @name Two.Path#_clip
     * @private
     * @see {@link Two.Path#clip}
     */
    _clip = false;

    /**
     * @name Two.Path#_dashes
     * @private
     * @see {@link Two.Path#dashes}
     */
    _dashes: number[] = null;

    _collection: Collection<Anchor>;
    #collection_insert_subscription: Subscription | null = null;
    #collection_remove_subscription: Subscription | null = null;

    readonly #anchor_change_subscriptions = new Map<Anchor, Subscription>();

    /**
     * @param {Two.Anchor[]} [vertices] - A list of {@link Two.Anchor}s that represent the order and coordinates to construct the rendered shape.
     * @param {Boolean} [closed=false] - Describes whether the shape is closed or open.
     * @param {Boolean} [curved=false] - Describes whether the shape automatically calculates bezier handles for each vertex.
     * @param {Boolean} [manual=false] - Describes whether the developer controls how vertices are plotted or if Two.js automatically plots coordinates based on closed and curved booleans.
     * @description This is the primary primitive class for creating all drawable shapes in Two.js. Unless specified methods return their instance of `Two.Path` for the purpose of chaining.
     */
    constructor(vertices: Anchor[] = [], closed?: boolean, curved?: boolean, manual?: boolean, options: PathOptions = {}) {

        super(options);

        this.viewInfo.type = 'path';
        this.viewInfo.anchor_vertices = [];
        this.viewInfo.anchor_collection = [];

        /**
         * @name Two.Path#closed
         * @property {Boolean} - Determines whether a final line is drawn between the final point in the `vertices` array and the first point.
         */
        this.closed = !!closed;

        /**
         * @name Two.Path#curved
         * @property {Boolean} - When the path is `automatic = true` this boolean determines whether the lines between the points are curved or not.
         */
        this.curved = !!curved;

        /**
         * @name Two.Path#beginning
         * @property {Number} - Number between zero and one to state the beginning of where the path is rendered.
         * @description {@link Two.Path#beginning} is a percentage value that represents at what percentage into the path should the renderer start drawing.
         * @nota-bene This is great for animating in and out stroked paths in conjunction with {@link Two.Path#ending}.
         */
        this.beginning = 0;

        /**
         * @name Two.Path#ending
         * @property {Number} - Number between zero and one to state the ending of where the path is rendered.
         * @description {@link Two.Path#ending} is a percentage value that represents at what percentage into the path should the renderer start drawing.
         * @nota-bene This is great for animating in and out stroked paths in conjunction with {@link Two.Path#beginning}.
         */
        this.ending = 1;

        // Style properties

        /**
         * @name Two.Path#fill
         * @property {(String|Two.Gradient|Two.Texture)} - The value of what the path should be filled in with.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
         */
        this.fill = '#fff';

        /**
         * @name Two.Path#stroke
         * @property {(String|Two.Gradient|Two.Texture)} - The value of what the path should be outlined in with.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
         */
        this.stroke = '#000';

        /**
         * @name Two.Path#linewidth
         * @property {Number} - The thickness in pixels of the stroke.
         */
        this.linewidth = 1.0;

        /**
         * @name Two.Path#opacity
         * @property {Number} - The opaqueness of the path.
         * @nota-bene Can be used in conjunction with CSS Colors that have an alpha value.
         */
        this.opacity = 1.0;

        /**
         * @name Two.Path#className
         * @property {String} - A class to be applied to the element to be compatible with CSS styling.
         * @nota-bene Only available for the SVG renderer.
         */
        this.className = '';

        /**
         * @name Two.Path#visible
         * @property {Boolean} - Display the path or not.
         * @nota-bene For {@link Two.CanvasRenderer} and {@link Two.WebGLRenderer} when set to false all updating is disabled improving performance dramatically with many objects in the scene.
         */
        this.visible = true;

        /**
         * @name Two.Path#cap
         * @property {String}
         * @see {@link https://www.w3.org/TR/SVG11/painting.html#StrokeLinecapProperty}
         */
        this.cap = 'butt';      // Default of Adobe Illustrator

        /**
         * @name Two.Path#join
         * @property {String}
         * @see {@link https://www.w3.org/TR/SVG11/painting.html#StrokeLinejoinProperty}
         */
        this.join = 'miter';    // Default of Adobe Illustrator

        /**
         * @name Two.Path#miter
         * @property {String}
         * @see {@link https://www.w3.org/TR/SVG11/painting.html#StrokeMiterlimitProperty}
         */
        this.miter = 4;         // Default of Adobe Illustrator

        /**
         * @name Two.Path#vertices
         * @property {Two.Anchor[]} - An ordered list of anchor points for rendering the path.
         * @description A list of {@link Two.Anchor} objects that consist of what form the path takes.
         * @nota-bene The array when manipulating is actually a {@link Two.Collection}.
         */
        this.vertices = new Collection(vertices);

        /**
         * @name Two.Path#automatic
         * @property {Boolean} - Determines whether or not Two.js should calculate curves, lines, and commands automatically for you or to let the developer manipulate them for themselves.
         */
        this.automatic = !manual;

        /**
         * @name Two.Path#dashes
         * @property {Number[]} - Array of numbers. Odd indices represent dash length. Even indices represent dash space.
         * @description A list of numbers that represent the repeated dash length and dash space applied to the stroke of the text.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray} for more information on the SVG stroke-dasharray attribute.
         */
        this.dashes = [];

        set_dashes_offset(this.dashes, 0);
    }

    /**
     * @name Two.Path.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Path}.
     */
    static Properties = [
        'fill',
        'stroke',
        'linewidth',
        'opacity',
        'visible',
        'cap',
        'join',
        'miter',
        'closed',
        'curved',
        'automatic',
        'beginning',
        'ending'
    ];

    static Utils = {
        getCurveLength
    };

    noFill() {
        this.fill = 'none';
        return this;
    }

    noStroke() {
        this.stroke = 'none';
        return this;
    }

    corner() {
        const rect = this.getBoundingClientRect(true);
        const hw = rect.width / 2;
        const hh = rect.height / 2;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices.getAt(i);
            v.x -= cx;
            v.y -= cy;
            v.x += hw;
            v.y += hh;
        }

        if (this.mask) {
            this.mask.position.x -= cx;
            this.mask.position.x += hw;
            this.mask.position.y -= cy;
            this.mask.position.y += hh;
        }
        return this;
    }

    center() {
        const rect = this.getBoundingClientRect(true);

        const cx = rect.left + rect.width / 2 - this.position.x;
        const cy = rect.top + rect.height / 2 - this.position.y;

        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices.getAt(i);
            v.x -= cx;
            v.y -= cy;
        }

        if (this.mask) {
            this.mask.position.x -= cx;
            this.mask.position.y -= cy;
        }

        return this;

    }

    getBoundingClientRect(shallow?: boolean): { width: number; height: number; top?: number; left?: number; right?: number; bottom?: number } {

        let left = Infinity, right = -Infinity,
            top = Infinity, bottom = -Infinity;

        // TODO: Update this to not __always__ update. Just when it needs to.
        this._update();

        const M = shallow ? this.matrix : this.worldMatrix;

        let border = (this.linewidth || 0) / 2;
        const l = this.viewInfo.anchor_vertices.length;

        if (this.linewidth > 0 || (this.stroke && typeof this.stroke === 'string' && !(/(transparent|none)/i.test(this.stroke)))) {
            if (this.matrix.manual) {
                const { scaleX, scaleY } = decompose_2d_3x3_matrix(M);
                border = Math.max(scaleX, scaleY) * (this.linewidth || 0) / 2;
            }
            else {
                border *= Math.max(this.scaleXY.x, this.scaleXY.y);
            }
        }

        if (l <= 0) {
            return {
                width: 0,
                height: 0
            };
        }

        for (let i = 0; i < l; i++) {

            const v1 = this.viewInfo.anchor_vertices[i];
            // If i = 0, then this "wraps around" to the last vertex. Otherwise, it's the previous vertex.
            // This is important for handling cyclic paths.
            const v0 = this.viewInfo.anchor_vertices[(i + l - 1) % l];

            const [v0x, v0y] = M.multiply_vector(v0.x, v0.y);
            const [v1x, v1y] = M.multiply_vector(v1.x, v1.y);

            if (v0.controls && v1.controls) {

                let rx = v0.controls.right.x;
                let ry = v0.controls.right.y;

                if (v0.relative) {
                    rx += v0.x;
                    ry += v0.y;
                }

                const [c0x, c0y] = M.multiply_vector(rx, ry);

                let lx = v1.controls.left.x;
                let ly = v1.controls.left.y;

                if (v1.relative) {
                    lx += v1.x;
                    ly += v1.y;
                }

                const [c1x, c1y] = M.multiply_vector(lx, ly);

                const bb = getCurveBoundingBox(
                    v0x, v0y,
                    c0x, c0y,
                    c1x, c1y,
                    v1x, v1y
                );

                top = min(bb.min.y - border, top);
                left = min(bb.min.x - border, left);
                right = max(bb.max.x + border, right);
                bottom = max(bb.max.y + border, bottom);

            }
            else {

                if (i <= 1) {

                    top = min(v0y - border, top);
                    left = min(v0x - border, left);
                    right = max(v0x + border, right);
                    bottom = max(v0y + border, bottom);

                }

                top = min(v1y - border, top);
                left = min(v1x - border, left);
                right = max(v1x + border, right);
                bottom = max(v1y + border, bottom);

            }

        }

        return {
            top: top,
            left: left,
            right: right,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };

    }

    hasBoundingClientRect(): boolean {
        return true;
    }

    /**
     * TODO: Bad name. THis function is called for its side effects which are to modify the Anchor.
     * Originally the function appears to promote a Vector and return an Anchor, but this is not used
     * and the call always involves an Anchor.
     * @param t Percentage value describing where on the {@link Path} to estimate and assign coordinate values.
     * @param obj - Object to apply calculated x, y to. If none available returns new `Object`.
     * @returns {Object}
     * @description Given a float `t` from 0 to 1, return a point or assign a passed `obj`'s coordinates to that percentage on this {@link Path}'s curve.
     */
    getPointAt(t: number, obj: Anchor): Anchor {

        let ia, ib;
        let x2, x3, y2, y3;
        let target = this.length * Math.min(Math.max(t, 0), 1);
        const length = this.vertices.length;
        const last = length - 1;

        let a = null;
        let b = null;

        for (let i = 0, l = this._lengths.length, sum = 0; i < l; i++) {

            if (sum + this._lengths[i] >= target) {

                if (this._closed) {
                    ia = mod(i, length);
                    ib = mod(i - 1, length);
                    if (i === 0) {
                        ia = ib;
                        ib = i;
                    }
                }
                else {
                    ia = i;
                    ib = Math.min(Math.max(i - 1, 0), last);
                }

                a = this.vertices.getAt(ia);
                b = this.vertices.getAt(ib);
                target -= sum;
                if (this._lengths[i] !== 0) {
                    t = target / this._lengths[i];
                }
                else {
                    t = 0;
                }

                break;

            }

            sum += this._lengths[i];

        }

        if (a === null || b === null) {
            return null;
        }

        if (!a) {
            return b;
        }
        else if (!b) {
            return a;
        }

        const right = b.controls && b.controls.right;
        const left = a.controls && a.controls.left;

        const x1 = b.x;
        const y1 = b.y;
        x2 = (right || b).x;
        y2 = (right || b).y;
        x3 = (left || a).x;
        y3 = (left || a).y;
        const x4 = a.x;
        const y4 = a.y;

        if (right && b.relative) {
            x2 += b.x;
            y2 += b.y;
        }

        if (left && a.relative) {
            x3 += a.x;
            y3 += a.y;
        }

        const x = getComponentOnCubicBezier(t, x1, x2, x3, x4);
        const y = getComponentOnCubicBezier(t, y1, y2, y3, y4);

        // Higher order points for control calculation.
        const t1x = lerp(x1, x2, t);
        const t1y = lerp(y1, y2, t);
        const t2x = lerp(x2, x3, t);
        const t2y = lerp(y2, y3, t);
        const t3x = lerp(x3, x4, t);
        const t3y = lerp(y3, y4, t);

        // Calculate the returned points control points.
        const brx = lerp(t1x, t2x, t);
        const bry = lerp(t1y, t2y, t);
        const alx = lerp(t2x, t3x, t);
        const aly = lerp(t2y, t3y, t);

        obj.x = x;
        obj.y = y;

        obj.controls.left.x = brx;
        obj.controls.left.y = bry;
        obj.controls.right.x = alx;
        obj.controls.right.y = aly;

        if (!(typeof obj.relative === 'boolean') || obj.relative) {
            obj.controls.left.x -= x;
            obj.controls.left.y -= y;
            obj.controls.right.x -= x;
            obj.controls.right.y -= y;
        }

        obj.t = t;

        return obj;

        /*
        const result = new Anchor(
            x, y, brx - x, bry - y, alx - x, aly - y,
            this._curved ? Commands.curve : Commands.line
        );
 
        result.t = t;
 
        return result;
            */
    }

    /**
     * @name Two.Path#plot
     * @function
     * @description Based on closed / curved and sorting of vertices plot where all points should be and where the respective handles should be too.
     * @nota-bene While this method is public it is internally called by {@link Two.Path#_update} when `automatic = true`.
     */
    plot() {

        if (this.curved) {
            getCurveFromPoints(this._collection, this.closed);
            return this;
        }

        for (let i = 0; i < this._collection.length; i++) {
            this._collection.getAt(i).command = i === 0 ? Commands.move : Commands.line;
        }

        return this;

    }

    /**
     * @name Two.Path#subdivide
     * @function
     * @param {Number} limit - How many times to recurse subdivisions.
     * @description Insert a {@link Two.Anchor} at the midpoint between every item in {@link Two.Path#vertices}.
     */
    subdivide(limit: number) {
        // TODO: DRYness (function below)
        this._update();

        const last = this.vertices.length - 1;
        const closed = this._closed || this.vertices.getAt(last).command === Commands.close;
        let b = this.vertices.getAt(last);
        let points: Anchor[] = [], verts;

        this.vertices.forEach((a, i) => {

            if (i <= 0 && !closed) {
                b = a;
                return;
            }

            if (a.command === Commands.move) {
                points.push(new Anchor(b.x, b.y));
                if (i > 0) {
                    points[points.length - 1].command = Commands.line;
                }
                b = a;
                return;
            }

            verts = getSubdivisions(a, b, limit);
            points = points.concat(verts);

            // Assign commands to all the verts
            verts.forEach(function (v, i) {
                if (i <= 0 && b.command === Commands.move) {
                    v.command = Commands.move;
                }
                else {
                    v.command = Commands.line;
                }
            });

            if (i >= last) {

                // TODO: Add check if the two vectors in question are the same values.
                if (this._closed && this._automatic) {

                    b = a;

                    verts = getSubdivisions(a, b, limit);
                    points = points.concat(verts);

                    // Assign commands to all the verts
                    verts.forEach(function (v, i) {
                        if (i <= 0 && b.command === Commands.move) {
                            v.command = Commands.move;
                        }
                        else {
                            v.command = Commands.line;
                        }
                    });

                }
                else if (closed) {
                    points.push(new Anchor(a.x, a.y));
                }

                points[points.length - 1].command = closed
                    ? Commands.close : Commands.line;

            }

            b = a;

        });

        this._automatic = false;
        this._curved = false;
        this.vertices = new Collection(points);

        return this;
    }

    /**
     * @param {Number} [limit] -
     * @param {Boolean} [silent=false] - If set to `true` then the path isn't updated before calculation. Useful for internal use.
     * @description Recalculate the {@link Two.Path#length} value.
     */
    _updateLength(limit?: number, silent = false): this {
        // TODO: DRYness (function above)
        if (!silent) {
            this._update();
        }

        const length = this.vertices.length;
        const last = length - 1;
        const closed = false;//this._closed || this.vertices[last]._command === Commands.close;

        let b = this.vertices.getAt(last);
        let sum = 0;

        this.vertices.forEach((a: Anchor, i: number) => {

            if ((i <= 0 && !closed) || a.command === Commands.move) {
                b = a;
                this._lengths[i] = 0;
                return;
            }

            this._lengths[i] = getCurveLength(a, b, limit);
            sum += this._lengths[i];

            if (i >= last && closed) {

                b = this.vertices.getAt((i + 1) % length);

                this._lengths[i + 1] = getCurveLength(a, b, limit);
                sum += this._lengths[i + 1];

            }

            b = a;

        });

        this._length = sum;
        this._flagLength = false;

        return this;

    }

    _update() {
        if (this._flagVertices) {

            if (this._automatic) {
                this.plot();
            }

            if (this._flagLength) {
                this._updateLength(undefined, true);
            }

            const l = this._collection.length;
            const closed = this._closed;

            const beginning = Math.min(this._beginning, this._ending);
            const ending = Math.max(this._beginning, this._ending);

            const bid = getIdByLength(this, beginning * this._length);
            const eid = getIdByLength(this, ending * this._length);

            const low = ceil(bid);
            const high = floor(eid);

            {
                /**
                 * Assigned in the for loop, used after the for loop.
                 */
                let left: Anchor;
                /**
                 * Assigned in the for loop, used after the for loop.
                 */
                let next: Anchor;

                this.viewInfo.anchor_vertices.length = 0;
                {
                    let right: Anchor;
                    let prev: Anchor;
                    for (let i = 0; i < l; i++) {

                        if (this.viewInfo.anchor_collection.length <= i) {
                            // Expected to be `relative` anchor points.
                            this.viewInfo.anchor_collection.push(new Anchor());
                        }

                        if (i > high && !right) {

                            const v = this.viewInfo.anchor_collection[i].copy(this._collection.getAt(i));
                            this.getPointAt(ending, v);
                            v.command = this.viewInfo.anchor_collection[i].command;
                            this.viewInfo.anchor_vertices.push(v);

                            right = v;
                            prev = this._collection.getAt(i - 1);

                            // Project control over the percentage `t`
                            // of the in-between point
                            if (prev && prev.controls) {

                                if (v.relative) {
                                    v.controls.right.clear();
                                }
                                else {
                                    v.controls.right.copy(v.origin);
                                }

                                if (prev.relative) {
                                    this.viewInfo.anchor_collection[i - 1].controls.right
                                        .copy(prev.controls.right)
                                        .lerp(G20.zero, 1 - v.t);
                                }
                                else {
                                    this.viewInfo.anchor_collection[i - 1].controls.right
                                        .copy(prev.controls.right)
                                        .lerp(prev.origin, 1 - v.t);
                                }

                            }

                        }
                        else if (i >= low && i <= high) {

                            const v = this.viewInfo.anchor_collection[i].copy(this._collection.getAt(i));
                            this.viewInfo.anchor_vertices.push(v);

                            if (i === high && contains(this, ending)) {
                                right = v;
                                if (!closed && right.controls) {
                                    if (right.relative) {
                                        right.controls.right.clear();
                                    }
                                    else {
                                        right.controls.right.copy(right.origin);
                                    }
                                }
                            }
                            else if (i === low && contains(this, beginning)) {
                                left = v;
                                left.command = Commands.move;
                                if (!closed && left.controls) {
                                    if (left.relative) {
                                        left.controls.left.clear();
                                    }
                                    else {
                                        left.controls.left.copy(left.origin);
                                    }
                                }
                            }

                        }

                    }
                }

                // Prepend the trimmed point if necessary.
                if (low > 0 && !left) {

                    const i = low - 1;

                    const v = this.viewInfo.anchor_collection[i].copy(this._collection.getAt(i));
                    this.getPointAt(beginning, v);
                    v.command = Commands.move;
                    this.viewInfo.anchor_vertices.unshift(v);

                    next = this._collection.getAt(i + 1);

                    // Project control over the percentage `t`
                    // of the in-between point
                    if (next && next.controls) {

                        v.controls.left.clear();

                        if (next.relative) {
                            this.viewInfo.anchor_collection[i + 1].controls.left
                                .copy(next.controls.left)
                                .lerp(G20.zero, v.t);
                        }
                        else {
                            vector.copy(next.origin);
                            this.viewInfo.anchor_collection[i + 1].controls.left
                                .copy(next.controls.left)
                                .lerp(next.origin, v.t);
                        }

                    }

                }
            }
        }
        super._update();
        return this;
    }

    flagReset(dirtyFlag = false): this {

        this._flagVertices = dirtyFlag;
        this._flagLength = dirtyFlag;
        this._flagFill = dirtyFlag;
        this._flagStroke = dirtyFlag;
        this._flagLinewidth = dirtyFlag;
        this._flagOpacity = dirtyFlag;
        this._flagVisible = dirtyFlag;
        this._flagCap = dirtyFlag;
        this._flagJoin = dirtyFlag;
        this._flagMiter = dirtyFlag;
        this._flagClip = dirtyFlag;

        super.flagReset(dirtyFlag);

        return this;

    }
    get automatic(): boolean {
        return this._automatic;
    }
    set automatic(automatic: boolean) {
        if (automatic === this._automatic) {
            return;
        }
        this._automatic = !!automatic;
        this.vertices.forEach(function (v: Anchor) {
            if (automatic) {
                v.ignore();
            }
            else {
                v.listen();
            }
        });
    }
    get beginning(): number {
        return this._beginning;
    }
    set beginning(v: number) {
        this._beginning = v;
        this._flagVertices = true;
    }
    get cap(): string {
        return this._cap;
    }
    set cap(v: string) {
        this._cap = v;
        this._flagCap = true;
    }
    get clip(): boolean {
        return this._clip;
    }
    set clip(v: boolean) {
        this._clip = v;
        this._flagClip = true;
    }
    get closed(): boolean {
        return this._closed;
    }
    set closed(v: boolean) {
        this._closed = !!v;
        this._flagVertices = true;
    }
    get curved(): boolean {
        return this._curved;
    }
    set curved(v: boolean) {
        this._curved = !!v;
        this._flagVertices = true;
    }
    get dashes(): number[] {
        return this._dashes;
    }
    set dashes(v: number[]) {
        if (typeof get_dashes_offset(v) !== 'number') {
            set_dashes_offset(v, (this.dashes && get_dashes_offset(this._dashes)) || 0);
        }
        this._dashes = v;
    }
    get ending(): number {
        return this._ending;
    }
    set ending(v: number) {
        this._ending = v;
        this._flagVertices = true;
    }
    get fill(): string | Gradient | Texture {
        return this._fill;
    }
    set fill(f: string | Gradient | Texture) {
        if (this.#fill_change_subscription) {
            this.#fill_change_subscription.unsubscribe();
            this.#fill_change_subscription = null;
        }

        this._fill = f;
        this._flagFill = true;

        if (this._fill instanceof LinearGradient) {
            this.#fill_change_subscription = this._fill.change$.subscribe(() => {
                this._flagFill = true;
            });
        }
        else if (this._fill instanceof RadialGradient) {
            this.#fill_change_subscription = this._fill.change$.subscribe(() => {
                this._flagFill = true;
            });
        }
        else if (this._fill instanceof Texture) {
            this.#fill_change_subscription = this._fill.change$.subscribe(() => {
                this._flagFill = true;
            });
        }
    }
    get join(): string {
        return this._join;
    }
    set join(v: string) {
        this._join = v;
        this._flagJoin = true;
    }
    get length(): number {
        if (this._flagLength) {
            this._updateLength();
        }
        return this._length;
    }
    get linewidth(): number {
        return this._linewidth;
    }
    set linewidth(v: number) {
        this._linewidth = v;
        this._flagLinewidth = true;
    }
    get mask(): Shape<Group> | null {
        return this._mask;
    }
    set mask(mask: Shape<Group> | null) {
        this._mask = mask;
        this._flagMask = true;
        if (mask instanceof Shape && !mask.clip) {
            mask.clip = true;
        }
    }
    get miter(): number {
        return this._miter;
    }
    set miter(v: number) {
        this._miter = v;
        this._flagMiter = true;
    }
    get opacity(): number {
        return this._opacity;
    }
    set opacity(v) {
        this._opacity = v;
        this._flagOpacity = true;
    }
    get stroke(): string | Gradient | Texture {
        return this._stroke;
    }
    set stroke(stroke: string | Gradient | Texture) {
        if (this.#stroke_change_subscription) {
            this.#stroke_change_subscription.unsubscribe();
            this.#stroke_change_subscription = null;
        }

        this._stroke = stroke;
        this._flagStroke = true;

        if (this._stroke instanceof LinearGradient) {
            this.#stroke_change_subscription = this._stroke.change$.subscribe(() => {
                this._flagStroke = true;
            });
        }
        else if (this._stroke instanceof RadialGradient) {
            this.#stroke_change_subscription = this._stroke.change$.subscribe(() => {
                this._flagStroke = true;
            });
        }
        else if (this._stroke instanceof Texture) {
            this.#stroke_change_subscription = this._stroke.change$.subscribe(() => {
                this._flagStroke = true;
            });
        }
    }
    get vertices() {
        return this._collection;
    }
    set vertices(vertices) {

        // Remove previous listeners
        if (this.#collection_insert_subscription) {
            this.#collection_insert_subscription.unsubscribe();
            this.#collection_insert_subscription = null;
        }
        if (this.#collection_remove_subscription) {
            this.#collection_remove_subscription.unsubscribe();
            this.#collection_remove_subscription = null;
        }

        // Create new Collection with copy of vertices
        if (vertices instanceof Collection) {
            this._collection = vertices;
        }
        else {
            this._collection = new Collection(vertices || []);
        }


        // Listen for Collection changes and bind / unbind
        this.#collection_insert_subscription = this._collection.insert$.subscribe((inserts: Anchor[]) => {
            let i = inserts.length;
            while (i--) {
                const anchor = inserts[i];
                const subscription = anchor.change$.subscribe(() => {
                    this._flagVertices = true;
                });
                // TODO: Check that we are not already mapped?
                this.#anchor_change_subscriptions.set(anchor, subscription);
            }
            this._flagVertices = true;
        });

        this.#collection_remove_subscription = this._collection.remove$.subscribe((removes: Anchor[]) => {
            let i = removes.length;
            while (i--) {
                const anchor = removes[i];
                const subscription = this.#anchor_change_subscriptions.get(anchor);
                subscription.unsubscribe();
                this.#anchor_change_subscriptions.delete(anchor);
            }
            this._flagVertices = true;
        });

        // Bind Initial Vertices
        this._collection.forEach((anchor: Anchor) => {
            const subscription = anchor.change$.subscribe(() => {
                this._flagVertices = true;
            });
            this.#anchor_change_subscriptions.set(anchor, subscription);
        });
    }
    get visible(): boolean {
        return this._visible;
    }
    set visible(v: boolean) {
        this._visible = v;
        this._flagVisible = true;
    }
}

export function FlagVertices(this: Path) {
    this._flagVertices = true;
    this._flagLength = true;
    if (this.parent) {
        this.parent._flagLength = true;
    }
}

export function FlagFill(this: Path) {
    this._flagFill = true;
}

export function FlagStroke(this: Path) {
    this._flagStroke = true;
}
