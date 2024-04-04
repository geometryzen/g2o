import { Constants } from './constants';
import { Gradient } from './effects/gradient';
import { Texture } from './effects/texture';
import { Element } from './element';
import { IShape } from './IShape';
import { Matrix } from './matrix';
import { Subscription } from './rxjs/Subscription';
import { getComputedMatrix } from './utils/get_computed_matrix';
import { G20 } from './vector';

export interface Parent {
    _update?(): void;
}

export interface ShapeOptions {
    position?: G20;
    attitude?: G20;
}

export abstract class Shape<P extends Parent> extends Element<P> implements IShape<P> {

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

    #position: G20;
    #position_change: Subscription;

    #attitude: G20;
    #attitude_change: Subscription;

    /**
     * TODO: Replace with attitude and Geometric Algebra.
     */
    _rotation: number = 0;

    /**
     * The scale supports non-uniform scaling.
     * The API provides more convenient access for uniform scaling.
     * Make the easy things easy...
     */
    _scale: G20 = new G20(1, 1);
    #scale_change: Subscription | null = null;

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

    constructor(options: ShapeOptions = {}) {

        super();

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

        if (options.position) {
            this.#position = options.position;
            this.#position_change = this.#position_change_bind();
        }
        else {
            this.#position = new G20(0, 0);
            this.#position_change = this.#position_change_bind();
        }

        if (options.attitude) {
            this.#attitude = options.attitude;
            this.#attitude_change = this.#attitude_change_bind();
        }
        else {
            this.#attitude = new G20(0, 0, 1, 0);
            this.#attitude_change = this.#attitude_change_bind();
        }

        /**
         * @name Two.Shape#rotation
         * @property {Number} - The value in Number for how much the shape is rotated relative to its parent.
         */
        this.rotation = 0;

        /**
         * @name Two.Shape#scale
         * @property {Number} - The value for how much the shape is scaled relative to its parent.
         * @nota-bene This value can be replaced with a {@link G20} to do non-uniform scaling. e.g: `shape.scale = new G20(2, 1);`
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

    dispose(): void {
        this.#position_change_unbind();
        this.#attitude_change_unbind();
    }

    get renderer() {
        return this.viewInfo;
    }
    set renderer(v) {
        this.viewInfo = v;
    }

    #update_matrix(): void {
        // For performance, the matrix product has been pre-computed.
        // M = T * S * R * skewX * skewY
        const a = this.scaleXY.x;
        const b = this.scaleXY.y;
        const p = Math.tan(this.skewX);
        const q = Math.tan(this.skewY);
        const x = this.position.x;
        const y = this.position.y;
        const c = Math.cos(this.rotation);
        const s = Math.sin(this.rotation);
        const ac = a * c;
        const as = a * s;
        const asq = as * q;
        const bc = b * c;
        const bcp = bc * p;
        const bcq = bc * q;
        const bs = b * s;
        const pq = p * q;
        const py = p * y;

        const a11 = ac - asq + bcp * pq * bs;
        const a12 = -as + bcp;
        const a13 = x + py;
        const a21 = bcq + bs;
        const a22 = bc;
        const a23 = y;
        this.matrix.set(a11, a12, a13, a21, a22, a23, 0, 0, 1);
        /*
        matrix.silence();
        try {
            matrix
                .identity()
                .translate(this.position)
                .scale(this.scaleXY.x, this.scaleXY.y)
                .rotate(this.rotation)  // This will be based on the attitude in future.
                .skewX(this.skewX)
                .skewY(this.skewY);
        }
        finally {
            matrix.touch();
        }
        */
    }

    _update(bubbles?: boolean): this {
        if (!this._matrix.manual && this._flagMatrix) {
            this.#update_matrix();
        }

        if (bubbles) {
            // Ultimately we get to the top of the hierarchy of components.
            // The current design allows a Group to be parented by a View.
            // The view will not support the _update() method.
            const parent = this.parent;
            if (typeof parent._update === 'function') {
                parent._update();
            }
        }
        // There's no update on the super type.
        return this;
    }

    flagReset(dirtyFlag = false) {
        this._flagMatrix = dirtyFlag;
        this._flagScale = dirtyFlag;
        super.flagReset();
        return this;
    }
    useAttitude(attitude: G20): void {
        this.#attitude_change_unbind();
        this.#attitude = attitude;
        this.#attitude_change = this.#attitude_change_bind();
    }
    #attitude_change_bind(): Subscription {
        return this.#attitude.change$.subscribe(() => {
            this._flagMatrix = true;
        });
    }
    #attitude_change_unbind(): void {
        if (this.#attitude_change) {
            this.#attitude_change.unsubscribe();
            this.#attitude_change = null;
        }
    }
    usePosition(position: G20): void {
        this.#position_change_unbind();
        this.#position = position;
        this.#position_change = this.#position_change_bind();
    }
    #position_change_bind(): Subscription {
        return this.#position.change$.subscribe(() => {
            this.#update_matrix();
            // We are only flagging the matrix
            this._flagMatrix = true;
        });
    }
    #position_change_unbind(): void {
        if (this.#position_change) {
            this.#position_change.unsubscribe();
            this.#position_change = null;
        }
    }
    get position(): G20 {
        return this.#position;
    }
    set position(position: G20) {
        this.#position.set(position.x, position.y, 0, 0);
    }
    get attitude() {
        return this.#attitude;
    }
    set attitude(attitude) {
        this.#attitude.set(0, 0, attitude.a, attitude.b);
    }
    /**
     * The rotation angle, measured in radians.
     */
    get rotation(): number {
        return this._rotation;
    }
    set rotation(rotation: number) {
        this._rotation = rotation;
        this.#update_matrix();
        this._flagMatrix = true;
    }
    get scale(): number {
        if (this._scale.x === this._scale.y) {
            return this._scale.x;
        }
        else {
            // Some message to indicate non-uniform scaling is in effect.
            throw new Error();
        }
    }
    set scale(scale: number) {
        // TODO: We need another API to support non-uniform scaling.
        if (this.#scale_change) {
            this.#scale_change.unsubscribe();
            this.#scale_change = null;
        }
        this._scale.x = scale;
        this._scale.y = scale;
        if (this._scale instanceof G20) {
            this.#scale_change = this._scale.change$.subscribe(() => {
                this._flagMatrix = true;
            });
        }
        this.#update_matrix();
        this._flagMatrix = true;
        this._flagScale = true;
    }
    get scaleXY(): G20 {
        return this._scale;
    }
    set scaleXY(scale: G20) {
        // TODO: We need another API to support non-uniform scaling.
        // TODO: Why bother to do all this? Make it readonly.
        if (this.#scale_change) {
            this.#scale_change.unsubscribe();
            this.#scale_change = null;
        }
        this._scale.set(scale.x, scale.y, 0, 0);
        if (this._scale instanceof G20) {
            this.#scale_change = this._scale.change$.subscribe(() => {
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
