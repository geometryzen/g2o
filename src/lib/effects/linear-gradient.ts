import { Subscription } from '../rxjs/Subscription';
import { G20 } from '../vector.js';
import { Gradient } from './gradient.js';
import { Stop } from './stop.js';

export class LinearGradient extends Gradient {

    _flagEndPoints = false;

    #left: G20 | null = null;
    #left_change_subscription: Subscription | null = null;
    #right: G20 | null = null;
    #right_change_subscription: Subscription | null = null;

    /**
     * @param x1 The x position of the first end point of the linear gradient.
     * @param y1 The y position of the first end point of the linear gradient.
     * @param x2 The x position of the second end point of the linear gradient.
     * @param y2 The y position of the second end point of the linear gradient.
     * @param stops A list of {@link Stop}s that contain the gradient fill pattern for the gradient.
     * @nota-bene The linear gradient lives within the space of the parent object's matrix space.
     */
    constructor(x1 = 0, y1 = 0, x2 = 0, y2 = 0, stops: Stop[] = []) {
        super(stops);
        this.viewInfo.type = 'linear-gradient';
        this.left = new G20(x1, y1);
        this.right = new G20(x2, y2);
    }

    static Properties = ['left', 'right'];

    /**
     * @name Two.LinearGradient.Stop
     * @see {@link Two.Stop}
     */
    static Stop = Stop;

    /**
     * @name Two.LinearGradient#_update
     * @function
     * @private
     * @param {Boolean} [bubbles=false] - Force the parent to `_update` as well.
     * @description This is called before rendering happens by the renderer. This applies all changes necessary so that rendering is up-to-date but not updated more than it needs to be.
     * @nota-bene Try not to call this method more than once a frame.
     */
    _update() {
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
            this.#left_change_subscription.unsubscribe();
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
            this.#right_change_subscription.unsubscribe();
            this.#right_change_subscription = null;
        }
        this.#right = v;
        this.#right_change_subscription = this.#right.change$.subscribe(() => {
            this._flagEndPoints = true;
        });
        this._flagEndPoints = true;
    }
}
