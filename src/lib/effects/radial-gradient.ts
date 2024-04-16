import { G20 } from '../math/G20';
import { Disposable } from '../reactive/Disposable';
import { Gradient } from './gradient';
import { Stop } from './stop';

export class RadialGradient extends Gradient {

    _flagRadius = false;
    _flagCenter = false;
    _flagFocal = false;

    #radius = 0;
    #center: G20 | null = null;
    #center_change_subscription: Disposable | null = null;
    #focal: G20 | null = null;
    #focal_change_subscription: Disposable | null = null;

    /**
     * @param cx The x position of the origin of the radial gradient.
     * @param cy The y position of the origin of the radial gradient.
     * @param r The radius of the radial gradient.
     * @param stops A list of {@link Stop}s that contain the gradient fill pattern for the gradient.
     * @param fx The x position of the focal point on the radial gradient.
     * @param fy The y position of the focal point on the radial gradient.
     */
    constructor(cx: number = 0, cy: number = 0, r: number = 1, stops: Stop[] = [], fx?: number, fy?: number) {

        super(stops);

        this.viewInfo.type = 'radial-gradient';

        this.center = new G20(cx, cy);

        this.radius = r;

        this.focal = new G20(fx, fy);
        this.focal.copy(this.center);
        if (typeof fx === 'number') {
            this.focal.x = fx;
        }
        if (typeof fy === 'number') {
            this.focal.y = fy;
        }
    }

    static Stop = Stop;
    static Properties = ['center', 'radius', 'focal'];

    update() {
        if (this._flagRadius || this._flagCenter || this._flagFocal || this._flagSpread || this._flagStops) {
            this._change.next(this);
        }
        return this;
    }

    flagReset() {
        this._flagRadius = this._flagCenter = this._flagFocal = false;
        super.flagReset.call(this);
        return this;
    }

    get center() {
        return this.#center;
    }

    set center(v) {
        if (this.#center_change_subscription) {
            this.#center_change_subscription.dispose();
            this.#center_change_subscription = null;
        }
        this.#center = v;
        this.#center_change_subscription = this.#center.change$.subscribe(() => {
            this._flagCenter = true;
        });
        this._flagCenter = true;
    }

    get focal() {
        return this.#focal;
    }

    set focal(v) {
        if (this.#focal_change_subscription) {
            this.#focal_change_subscription.dispose();
            this.#focal_change_subscription = null;
        }
        this.#focal = v;
        this.#focal_change_subscription = this.#focal.change$.subscribe(() => {
            this._flagFocal = true;
        });
        this._flagFocal = true;
    }

    get radius() {
        return this.#radius;
    }

    set radius(v) {
        this.#radius = v;
        this._flagRadius = true;
    }
}
