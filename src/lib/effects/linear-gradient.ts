import { G20 } from '../math/G20';
import { Disposable } from '../reactive/Disposable';
import { Gradient } from './gradient';
import { Stop } from './stop';

export class LinearGradient extends Gradient {

    _flagEndPoints = false;

    #left: G20 | null = null;
    #left_change_subscription: Disposable | null = null;
    #right: G20 | null = null;
    #right_change_subscription: Disposable | null = null;

    /**
     * @param x1 The x position of the first end point of the linear gradient.
     * @param y1 The y position of the first end point of the linear gradient.
     * @param x2 The x position of the second end point of the linear gradient.
     * @param y2 The y position of the second end point of the linear gradient.
     * @param stops A list of {@link Stop}s that contain the gradient fill pattern for the gradient.
     * The linear gradient lives within the space of the parent object's matrix space.
     */
    constructor(x1 = 0, y1 = 0, x2 = 0, y2 = 0, stops: Stop[] = []) {
        super(stops);
        this.viewInfo.type = 'linear-gradient';
        this.left = new G20(x1, y1);
        this.right = new G20(x2, y2);
    }

    static Properties = ['left', 'right'];

    update() {
        if (this._flagEndPoints || this._flagSpread || this._flagStops) {
            this._change.next(this);
        }
        return this;
    }

    /**
     * @name Two.LinearGradient#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {
        this._flagEndPoints = false;
        super.flagReset.call(this);
        return this;
    }
    get left() {
        return this.#left;
    }
    set left(v) {
        if (this.#left_change_subscription) {
            this.#left_change_subscription.dispose();
            this.#left_change_subscription = null;
        }
        this.#left = v;
        this.#left_change_subscription = this.#left.change$.subscribe(() => {
            this._flagEndPoints = true;
        });
        this._flagEndPoints = true;
    }
    get right() {
        return this.#right;
    }
    set right(v) {
        if (this.#right_change_subscription) {
            this.#right_change_subscription.dispose();
            this.#right_change_subscription = null;
        }
        this.#right = v;
        this.#right_change_subscription = this.#right.change$.subscribe(() => {
            this._flagEndPoints = true;
        });
        this._flagEndPoints = true;
    }
}
