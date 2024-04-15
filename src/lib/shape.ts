import { Anchor } from './anchor';
import { Constants } from './constants';
import { LinearGradient } from './effects/linear-gradient';
import { RadialGradient } from './effects/radial-gradient';
import { Texture } from './effects/texture';
import { ElementBase } from './element';
import { Flag } from './Flag';
import { IBoard } from './IBoard';
import { IShape } from './IShape';
import { compose_2d_3x3_transform } from './math/compose_2d_3x3_transform';
import { G20 } from './math/G20';
import { Matrix } from './matrix';
import { Subscription } from './rxjs/Subscription';
import { computed_world_matrix } from './utils/compute_world_matrix';

export type PositionLike = Anchor | G20 | Shape<unknown> | [x: number, y: number];

export function position_from_like(like: PositionLike): G20 | null {
    if (like instanceof Shape) {
        return like.position;
    }
    if (like instanceof G20) {
        return like;
    }
    else if (like instanceof Anchor) {
        return like.origin;
    }
    else if (Array.isArray(like)) {
        return G20.vector(like[0], like[1]);
    }
    else {
        return null;
    }
}

export interface Parent {
    update?(): void;
}

export interface ShapeOptions {
    position?: PositionLike;
    attitude?: G20;
}

export abstract class Shape<P extends Parent> extends ElementBase<P> implements IShape<P> {

    /**
     * The matrix value of the shape's position, rotation, and scale.
     */
    #matrix: Matrix = null;

    /**
     * The matrix value of the shape's position, rotation, and scale in the scene.
     */
    #worldMatrix: Matrix = null;

    #position: G20;
    #position_change: Subscription;

    #attitude: G20;
    #attitude_change: Subscription;

    /**
     * The scale supports non-uniform scaling.
     * The API provides more convenient access for uniform scaling.
     * Make the easy things easy...
     */
    #scale: G20 = new G20(1, 1);
    #scale_change: Subscription | null = null;

    #skewX = 0;

    #skewY = 0;

    /**
     * DGH: This is plonked on here by the interpretation of SVG.
     * It's then copied by the SVG renderer to the dataset property of the renderer elem.
     */
    dataset?: DOMStringMap;

    abstract automatic: boolean;
    abstract beginning: number;
    abstract cap: 'butt' | 'round' | 'square';
    abstract clip: boolean;
    abstract closed: boolean;
    abstract curved: boolean;
    abstract ending: number;
    abstract fill: string | LinearGradient | RadialGradient | Texture;
    abstract join: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
    abstract length: number;
    abstract linewidth: number;
    abstract miter: number;
    abstract stroke: string | LinearGradient | RadialGradient | Texture;
    abstract visible: boolean;
    abstract getBoundingClientRect(shallow?: boolean): { width?: number; height?: number; top?: number; left?: number; right?: number; bottom?: number };
    abstract hasBoundingClientRect(): boolean;
    abstract noFill(): this;
    abstract noStroke(): this;
    abstract subdivide(limit: number): this;

    constructor(readonly board: IBoard, options: ShapeOptions = {}) {

        super();

        this.flagReset(true);

        this.isShape = true;

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
            this.#position = position_from_like(options.position);
        }
        else {
            this.#position = new G20(0, 0);
        }

        if (options.attitude) {
            this.#attitude = options.attitude;
        }
        else {
            this.#attitude = new G20(0, 0, 1, 0);
        }

        /**
         * The value for how much the shape is scaled relative to its parent.
         */
        this.scale = 1;

        /**
         * Skew the shape by an angle in the x axis direction.
         */
        this.skewX = 0;

        /**
         * Skew the shape by an angle in the y axis direction.
         */
        this.skewY = 0;

        // Wait to bind change detection until all properties have been established.
        this.#position_change = this.#position_change_bind();
        this.#attitude_change = this.#attitude_change_bind();
    }

    dispose(): void {
        this.#position_change_unbind();
        this.#attitude_change_unbind();
    }

    #update_matrix(): void {
        // For performance, the matrix product has been pre-computed.
        // M = T * S * R * skewX * skewY
        const position = this.position;
        const x = position.x;
        const y = position.y;
        const attitude = this.attitude;
        const cos_φ = attitude.a;
        const sin_φ = attitude.b;
        const scale = this.scaleXY;
        const sx = scale.x;
        const sy = scale.y;
        if (this.board.goofy) {
            compose_2d_3x3_transform(x, y, sx, sy, cos_φ, sin_φ, this.skewX, this.skewY, this.matrix);
        }
        else {
            compose_2d_3x3_transform(y, x, sy, sx, cos_φ, sin_φ, this.skewY, this.skewX, this.matrix);
        }
    }

    update(bubbles?: boolean): this {
        if (!this.matrix.manual && this.flags[Flag.Matrix]) {
            this.#update_matrix();
        }

        if (bubbles) {
            // Ultimately we get to the top of the hierarchy of components.
            // The current design allows a Group to be parented by a View.
            // The view will not support the update() method.
            const parent = this.parent;
            if (typeof parent.update === 'function') {
                parent.update();
            }
        }
        // There's no update on the super type.
        return this;
    }

    flagReset(dirtyFlag = false): this {
        this.flags[Flag.Vertices] = dirtyFlag;
        this.flags[Flag.Matrix] = dirtyFlag;
        this.flags[Flag.Scale] = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }
    useAttitude(attitude: G20): void {
        this.#attitude_change_unbind();
        this.#attitude = attitude;
        this.#attitude_change = this.#attitude_change_bind();
    }
    #attitude_change_bind(): Subscription {
        return this.#attitude.change$.subscribe(() => {
            this.#update_matrix();
            this.flags[Flag.Matrix] = true;
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
            this.flags[Flag.Matrix] = true;
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
    get scale(): number {
        if (this.#scale.x === this.#scale.y) {
            return this.#scale.x;
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
        this.#scale.x = scale;
        this.#scale.y = scale;
        if (this.#scale instanceof G20) {
            this.#scale_change = this.#scale.change$.subscribe(() => {
                this.flags[Flag.Matrix] = true;
            });
        }
        this.#update_matrix();
        this.flags[Flag.Matrix] = true;
        this.flags[Flag.Scale] = true;
    }
    get scaleXY(): G20 {
        return this.#scale;
    }
    set scaleXY(scale: G20) {
        // TODO: We need another API to support non-uniform scaling.
        // TODO: Why bother to do all this? Make it readonly.
        if (this.#scale_change) {
            this.#scale_change.unsubscribe();
            this.#scale_change = null;
        }
        this.#scale.set(scale.x, scale.y, 0, 0);
        if (this.#scale instanceof G20) {
            this.#scale_change = this.#scale.change$.subscribe(() => {
                this.flags[Flag.Matrix] = true;
            });
        }
        this.flags[Flag.Matrix] = true;
        this.flags[Flag.Scale] = true;
    }
    get skewX(): number {
        return this.#skewX;
    }
    set skewX(v: number) {
        this.#skewX = v;
        this.flags[Flag.Matrix] = true;
    }
    get skewY(): number {
        return this.#skewY;
    }
    set skewY(v: number) {
        this.#skewY = v;
        this.flags[Flag.Matrix] = true;
    }
    get matrix(): Matrix {
        return this.#matrix;
    }
    set matrix(matrix: Matrix) {
        this.#matrix = matrix;
        this.flags[Flag.Matrix] = true;
    }
    get worldMatrix() {
        // TODO: Make DRY
        computed_world_matrix(this, this.#worldMatrix);
        return this.#worldMatrix;
    }
    set worldMatrix(worldMatrix: Matrix) {
        this.#worldMatrix = worldMatrix;
    }
}
