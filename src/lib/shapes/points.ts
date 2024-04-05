import { Collection } from '../collection.js';
import { Gradient } from '../effects/gradient.js';
import { LinearGradient } from '../effects/linear-gradient.js';
import { RadialGradient } from '../effects/radial-gradient.js';
import { Texture } from '../effects/texture.js';
import { Group } from '../group.js';
import { get_dashes_offset, set_dashes_offset } from '../path.js';
import { Subscription } from '../rxjs/Subscription';
import { Shape } from '../shape.js';
import { getCurveLength as gcl, subdivide } from '../utils/curves.js';
import { decompose_2d_3x3_matrix } from '../utils/decompose_2d_3x3_matrix.js';
import { getIdByLength } from '../utils/shape.js';
import { G20 } from '../vector.js';

const min = Math.min;
const max = Math.max;
const ceil = Math.ceil;
const floor = Math.floor;

/**
 * DGH: We can't extend Path because a path is composed of Anchor(s).
 * Points are composed of G20(s).
 * And yet we need to implement some methods that are just like path.
 * We also need the appropriate interface for getIdByLength (IPathOrPoints)
 */
export class Points extends Shape<Group> {
    automatic: boolean;
    cap: string;
    clip: boolean;
    closed: boolean;
    curved: boolean;
    join: string;
    miter: number;

    _flagVertices = true;
    _flagLength = true;
    _flagFill = true;
    _flagStroke = true;
    _flagLinewidth = true;
    _flagOpacity = true;
    _flagVisible = true;
    _flagSize = true;
    _flagSizeAttenuation = true;

    _length = 0;
    readonly _lengths: number[] = [];

    _fill: string | Gradient | Texture = '#fff';
    #fill_change_subscription: Subscription | null = null;

    _stroke: string | Gradient | Texture = '#000';
    #stroke_change_subscription: Subscription | null = null;

    _linewidth = 1;
    _opacity = 1.0;
    _visible = true;
    _size = 1;
    _sizeAttenuation = false;
    _beginning = 0;
    _ending = 1.0;
    _dashes: number[] | null = null;

    _collection: Collection<G20>;
    #collection_insert_subscription: Subscription | null = null;
    #collection_remove_subscription: Subscription | null = null;

    readonly #vector_change_subscriptions = new Map<G20, Subscription>();

    constructor(vertices: G20[]) {

        super();

        this.viewInfo.type = 'points';
        this.viewInfo.vector_vertices = null;
        this.viewInfo.vector_collection = null;

        /**
         * @name Two.Points#sizeAttenuation
         * @property {Boolean} - Boolean dictating whether Two.js should scale the size of the points based on its matrix hierarchy.
         * @description Set to `true` if you'd like the size of the points to be relative to the scale of its parents; `false` to disregard. Default is `false`.
         */
        this.sizeAttenuation = false;

        /**
         * @name Two.Points#beginning
         * @property {Number} - Number between zero and one to state the beginning of where the path is rendered.
         * @description {@link Two.Points#beginning} is a percentage value that represents at what percentage into the path should the renderer start drawing.
         */
        this.beginning = 0;

        /**
         * @name Two.Points#ending
         * @property {Number} - Number between zero and one to state the ending of where the path is rendered.
         * @description {@link Two.Points#ending} is a percentage value that represents at what percentage into the path should the renderer start drawing.
         */
        this.ending = 1;

        // Style properties

        /**
         * @name Two.Points#fill
         * @property {(String|Two.Gradient|Two.Texture)} - The value of what the path should be filled in with.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
         */
        this.fill = '#fff';

        /**
         * @name Two.Points#stroke
         * @property {(String|Two.Gradient|Two.Texture)} - The value of what the path should be outlined in with.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
         */
        this.stroke = '#000';

        /**
         * @name Two.Points#className
         * @property {String} - A class to be applied to the element to be compatible with CSS styling.
         * @nota-bene Only available for the SVG renderer.
         */
        this.className = '';

        /**
         * @name Two.Points#visible
         * @property {Boolean} - Display the points or not.
         * @nota-bene For {@link Two.CanvasRenderer} and {@link Two.WebGLRenderer} when set to false all updating is disabled improving performance dramatically with many objects in the scene.
         */
        this.visible = true;

        /**
         * @name Two.Points#vertices
         * @property {G20[]} - An ordered list of vector points for rendering points.
         * @description A list of {@link G20} objects that consist of which coordinates to draw points at.
         * @nota-bene The array when manipulating is actually a {@link Two.Collection}.
         */
        this.vertices = new Collection(vertices);

        /**
         * @name Two.Points#dashes
         * @property {Number[]} - Array of numbers. Odd indices represent dash length. Even indices represent dash space.
         * @description A list of numbers that represent the repeated dash length and dash space applied to the stroke of the text.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray} for more information on the SVG stroke-dasharray attribute.
         */
        this.dashes = [];

        set_dashes_offset(this.dashes, 0);
    }

    static Properties = [
        'fill',
        'stroke',
        'linewidth',
        'opacity',
        'visible',
        'size',
        'sizeAttenuation',
        'beginning',
        'ending'
    ];

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
        /*
        if (this.mask) {
            this.mask.position.x -= cx;
            this.mask.position.x += hw;
            this.mask.position.y -= cy;
            this.mask.position.y += hh;
        }
        */

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
        /*
        if (this.mask) {
            this.mask.position.x -= cx;
            this.mask.position.y -= cy;
        }
        */
        return this;
    }

    getBoundingClientRect(shallow?: boolean): { width: number; height: number; top?: number; left?: number; right?: number; bottom?: number } {

        let left = Infinity, right = -Infinity,
            top = Infinity, bottom = -Infinity;

        // TODO: Update this to not __always__ update. Just when it needs to.
        this._update();

        const M = shallow ? this.matrix : this.worldMatrix;

        let border = (this.linewidth || 0) / 2;
        const l = this.viewInfo.vector_vertices.length;

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

            const v1 = this.viewInfo.vector_vertices[i];
            // If i = 0, then this "wraps around" to the last vertex. Otherwise, it's the previous vertex.
            // This is important for handling cyclic paths.
            const v0 = this.viewInfo.vector_vertices[(i + l - 1) % l];

            const [v0x, v0y] = M.multiply_vector(v0.x, v0.y);
            const [v1x, v1y] = M.multiply_vector(v1.x, v1.y);

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
     * @param limit - How many times to recurse subdivisions.
     * Insert a {@link G20} at the midpoint between every item in {@link Points#vertices}.
     */
    subdivide(limit: number) {
        // TODO: DRYness (function below)
        this._update();
        let points: G20[] = [];
        for (let i = 0; i < this.vertices.length; i++) {

            const a = this.vertices.getAt(i);
            const b = this.vertices.getAt(i - 1);

            if (!b) {
                continue;
            }

            const ax = a.x;
            const ay = a.y;
            const bx = b.x;
            const by = b.y;
            const builder = (x: number, y: number) => new G20(x, y);
            const subdivisions = subdivide(builder, ax, ay, ax, ay, bx, by, bx, by, limit);

            points = points.concat(subdivisions);
        }

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

        this.vertices.forEach((a: G20, i: number) => {

            if (i <= 0 && !closed) {
                b = a;
                this._lengths[i] = 0;
                return;
            }

            this._lengths[i] = get_vector_vector_curve_length(a, b, limit);
            sum += this._lengths[i];

            if (i >= last && closed) {

                b = this.vertices.getAt((i + 1) % length);

                this._lengths[i + 1] = get_vector_vector_curve_length(a, b, limit);
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

            if (this._flagLength) {
                this._updateLength(undefined, true);
            }

            const beginning = Math.min(this._beginning, this._ending);
            const ending = Math.max(this._beginning, this._ending);

            const bid = getIdByLength(this, beginning * this._length);
            const eid = getIdByLength(this, ending * this._length);

            const low = ceil(bid);
            const high = floor(eid);


            this.viewInfo.vector_vertices = [];
            this.viewInfo.vector_collection = [];

            // let j = 0;

            for (let i = 0; i < this._collection.length; i++) {
                if (i >= low && i <= high) {
                    const v = this._collection.getAt(i);
                    this.viewInfo.vector_collection.push(v);
                    // TODO: This doesn't make sense.
                    throw new Error();
                    // this.viewInfo.vector_vertices[j * 2 + 0] = v.x;
                    // this.viewInfo.anchor_vertices[j * 2 + 1] = v.y;
                    // j++;
                }
            }
        }
        super._update();
        return this;
    }

    flagReset() {
        this._flagVertices = this._flagLength = this._flagFill = this._flagStroke =
            this._flagLinewidth = this._flagOpacity = this._flagVisible =
            this._flagSize = this._flagSizeAttenuation = false;
        super.flagReset.call(this);
        return this;
    }
    get beginning() {
        return this._beginning;
    }
    set beginning(v) {
        this._beginning = v;
        this._flagVertices = true;
    }
    get dashes(): number[] {
        return this._dashes;
    }
    set dashes(dashes: number[]) {
        if (typeof get_dashes_offset(dashes) !== 'number') {
            set_dashes_offset(dashes, (this.dashes && get_dashes_offset(this._dashes)) || 0);
        }
        this._dashes = dashes;
    }
    get ending() {
        return this._ending;
    }
    set ending(v) {
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
    get length() {
        if (this._flagLength) {
            this._updateLength();
        }
        return this._length;
    }
    get linewidth() {
        return this._linewidth;
    }
    set linewidth(v) {
        this._linewidth = v;
        this._flagLinewidth = true;
    }
    get opacity() {
        return this._opacity;
    }
    set opacity(v) {
        this._opacity = v;
        this._flagOpacity = true;
    }
    get size() {
        return this._size;
    }
    set size(v: number) {
        this._size = v;
        this._flagSize = true;
    }
    get sizeAttenuation() {
        return this._sizeAttenuation;
    }
    set sizeAttenuation(v) {
        this._sizeAttenuation = v;
        this._flagSizeAttenuation = true;
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
        this.#collection_insert_subscription = this._collection.insert$.subscribe((inserts: G20[]) => {
            let i = inserts.length;
            while (i--) {
                const anchor = inserts[i];
                const subscription = anchor.change$.subscribe(() => {
                    this._flagVertices = true;
                });
                // TODO: Check that we are not already mapped?
                this.#vector_change_subscriptions.set(anchor, subscription);
            }
            this._flagVertices = true;
        });

        this.#collection_remove_subscription = this._collection.remove$.subscribe((removes: G20[]) => {
            let i = removes.length;
            while (i--) {
                const anchor = removes[i];
                const subscription = this.#vector_change_subscriptions.get(anchor);
                subscription.unsubscribe();
                this.#vector_change_subscriptions.delete(anchor);
            }
            this._flagVertices = true;
        });

        // Bind Initial Vertices
        this._collection.forEach((anchor: G20) => {
            const subscription = anchor.change$.subscribe(() => {
                this._flagVertices = true;
            });
            this.#vector_change_subscriptions.set(anchor, subscription);
        });
    }
    get visible() {
        return this._visible;
    }
    set visible(v) {
        this._visible = v;
        this._flagVisible = true;
    }
}

export function get_vector_vector_curve_length(a: G20, b: G20, limit: number): number {

    const x1 = b.x;
    const y1 = b.y;
    const x3 = a.x;
    const y3 = a.y;

    // TODO: Probably an optimizaton here given redundant arguments.
    return gcl(x1, y1, x1, y1, x3, y3, x3, y3, limit);
}
