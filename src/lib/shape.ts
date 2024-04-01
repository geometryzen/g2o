import { Subscription } from 'rxjs';
import { IShape } from './IShape.js';
import { Constants } from './constants.js';
import { Gradient } from './effects/gradient.js';
import { Texture } from './effects/texture.js';
import { Element } from './element.js';
import { Group } from './group.js';
import { Matrix } from './matrix.js';
import { getComputedMatrix } from './utils/get_computed_matrix.js';
import { Vector } from './vector.js';

export abstract class Shape extends Element<Group> implements IShape {

    _flagMatrix = true;
    _flagScale = false;

    // Underlying Properties

    /**
     * The matrix value of the shape's position, rotation, and scale.
     */
    _matrix: Matrix = null;

    /**
     * The matrix value of the shape's position, rotation, and scale in the scene.
     */
    _worldMatrix: Matrix = null;

    _position: Vector = null;
    _position_change_subscription: Subscription | null = null;

    /**
     * TODO: Replace with attitude and Geometric Algebra.
     */
    _rotation: number = 0;

    /**
     * The scale value in Number. Can be a vector for non-uniform scaling.
     */
    _scale: number | Vector = 1;
    _scale_change_subscription: Subscription | null = null;

    _skewX = 0;

    _skewY = 0;

    /**
     * DGH: This is plonked on here by the interpretation of SVG.
     * It's then copied by the SVG renderer to the dataset property of the renderer elem.
     */
    dataset?: DOMStringMap;

    abstract _flagVisible: boolean;
    abstract automatic: boolean;
    abstract beginning: number;
    abstract cap: string;
    abstract clip: boolean;
    abstract closed: boolean;
    abstract curved: boolean;
    abstract ending: number;
    abstract fill: string | Gradient | Texture;
    abstract join: string;
    abstract length: number;
    abstract linewidth: number;
    abstract miter: number;
    abstract stroke: string | Gradient | Texture;
    abstract visible: boolean;
    abstract getBoundingClientRect(shallow?: boolean): { width?: number; height?: number; top?: number; left?: number; right?: number; bottom?: number };
    abstract hasBoundingClientRect(): boolean;
    abstract noFill(): this;
    abstract noStroke(): this;
    abstract subdivide(limit: number): this;

    constructor() {

        super();

        /**
         * @name Two.Shape#renderer
         * @property {Object}
         * @description Object access to store relevant renderer specific variables. Warning: manipulating this object can create unintended consequences.
         * @nota-bene With the {@link Two.SVGRenderer} you can access the underlying SVG element created via `shape.renderer.elem`.
         */
        this._renderer.flagMatrix = FlagMatrix.bind(this);
        this.isShape = true;

        /**
         * @name Two.Shape#id
         * @property {String} - Session specific unique identifier.
         * @nota-bene In the {@link Two.SVGRenderer} change this to change the underlying SVG element's id too.
         */
        this.id = Constants.Identifier + Constants.uniqueId();

        /**
         * The transformation matrix of the shape.
         */
        this.matrix = new Matrix();

        /**
         * The transformation matrix of the shape in the scene.
         */
        this.worldMatrix = new Matrix();

        /**
         * @name Two.Shape#position
         * @property {Two.Vector} - The x and y value for where the shape is placed relative to its parent.
         */
        this.position = new Vector();

        /**
         * @name Two.Shape#rotation
         * @property {Number} - The value in Number for how much the shape is rotated relative to its parent.
         */
        this.rotation = 0;

        /**
         * @name Two.Shape#scale
         * @property {Number} - The value for how much the shape is scaled relative to its parent.
         * @nota-bene This value can be replaced with a {@link Two.Vector} to do non-uniform scaling. e.g: `shape.scale = new Two.Vector(2, 1);`
         */
        this.scale = 1;

        /**
         * @name Two.Shape#skewX
         * @property {Number} - The value in Number for how much the shape is skewed relative to its parent.
         * @description Skew the shape by an angle in the x axis direction.
         */
        this.skewX = 0;

        /**
         * @name Two.Shape#skewY
         * @property {Number} - The value in Number for how much the shape is skewed relative to its parent.
         * @description Skew the shape by an angle in the y axis direction.
         */
        this.skewY = 0;

    }

    get renderer() {
        return this._renderer;
    }
    set renderer(v) {
        this._renderer = v;
    }

    get translation() {
        return this.position;
    }
    set translation(v) {
        this.position = v;
    }

    /**
     * @name Two.Shape#addTo
     * @function
     * @param {Two.Group} group - The parent the shape adds itself to.
     * @description Convenience method to add itself to the scenegraph.
     */
    addTo(group: Group): this {
        group.add(this);
        return this;
    }

    /**
     * @name Two.Shape#remove
     * @function
     * @description Remove self from the scene / parent.
     */
    remove() {

        if (!this.parent) {
            return this;
        }

        this.parent.remove(this);

        return this;

    }

    /**
     * @name Two.Shape#_update
     * @function
     * @private
     * @param {Boolean} [bubbles=false] - Force the parent to `_update` as well.
     * @description This is called before rendering happens by the renderer. This applies all changes necessary so that rendering is up-to-date but not updated more than it needs to be.
     * @nota-bene Try not to call this method more than once a frame.
     */
    _update(bubbles?: boolean): this {

        if (!this._matrix.manual && this._flagMatrix) {

            this._matrix
                .identity()
                .translate(this.position.x, this.position.y);

            if (this._scale instanceof Vector) {
                this._matrix.scale(this._scale.x, this._scale.y);
            }
            else {
                this._matrix.scale(this._scale, this._scale);
            }

            this._matrix.rotate(this.rotation);
            this._matrix.skewX(this.skewX);
            this._matrix.skewY(this.skewY);
        }

        if (bubbles) {
            if (this.parent && this.parent._update) {
                this.parent._update();
            }
        }

        return this;

    }

    /**
     * @name Two.Shape#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {

        this._flagMatrix = this._flagScale = false;

        super.flagReset.call(this);

        return this;

    }
    get position() {
        return this._position;
    }
    set position(v) {
        if (this._position_change_subscription) {
            this._position_change_subscription.unsubscribe();
            this._position_change_subscription = null;
        }
        this._position = v;
        this._position_change_subscription = this._position.change$.subscribe(() => {
            this._flagMatrix = true;
        });
    }
    get rotation(): number {
        return this._rotation;
    }
    set rotation(v: number) {
        this._rotation = v;
        this._flagMatrix = true;
    }
    get scale(): number | Vector {
        return this._scale;
    }
    set scale(v: number | Vector) {
        if (this._scale_change_subscription) {
            this._scale_change_subscription.unsubscribe();
            this._scale_change_subscription = null;
        }
        this._scale = v;
        if (this._scale instanceof Vector) {
            this._scale_change_subscription = this._scale.change$.subscribe(() => {
                this._flagMatrix = true;
            });
        }
        this._flagMatrix = true;
        this._flagScale = true;
    }
    get skewX(): number {
        return this._skewX;
    }
    set skewX(v: number) {
        this._skewX = v;
        this._flagMatrix = true;
    }
    get skewY(): number {
        return this._skewY;
    }
    set skewY(v: number) {
        this._skewY = v;
        this._flagMatrix = true;
    }
    get matrix(): Matrix {
        return this._matrix;
    }
    set matrix(v: Matrix) {
        this._matrix = v;
        this._flagMatrix = true;
    }
    get worldMatrix() {
        // TODO: Make DRY
        getComputedMatrix(this, this._worldMatrix);
        return this._worldMatrix;
    }
    set worldMatrix(v: Matrix) {
        this._worldMatrix = v;
    }
}

/**
 * @name FlagMatrix
 * @function
 * @private
 * @description Utility function used in conjunction with event handlers to update the flagMatrix of a shape.
 */
function FlagMatrix(this: Shape): void {
    this._flagMatrix = true;
}
