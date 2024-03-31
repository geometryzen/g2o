import { Subscription } from 'rxjs';
import { Anchor } from '../anchor.js';
import { Path } from '../path.js';
import { Vector } from '../vector.js';


export class Rectangle extends Path {
    #origin_change_subscription: Subscription | null = null;
    /**
     * @param x The x position of the rectangle.
     * @param y The y position of the rectangle.
     * @param width The width value of the rectangle.
     * @param height The width value of the rectangle.
     */
    constructor(x = 0, y = 0, width = 1, height = 1) {

        const points = [
            new Anchor(0, 0, 0, 0, 0, 0, 'M'),
            new Anchor(0, 0, 0, 0, 0, 0, 'L'),
            new Anchor(0, 0, 0, 0, 0, 0, 'L'),
            new Anchor(0, 0, 0, 0, 0, 0, 'L')
            // new Anchor() // TODO: Figure out how to handle this for `beginning` / `ending` animations
        ];

        super(points, true, false, true);

        this.width = width;
        this.height = height;

        this.origin = new Vector();

        if (typeof x === 'number') {
            this.position.x = x;
        }
        if (typeof y === 'number') {
            this.position.y = y;
        }

        this._update();
    }

    static Properties = ['width', 'height'];

    _flagWidth = false;
    _flagHeight = false;
    _width = 0;
    _height = 0;

    _origin: Vector = null;

    _update(): this {
        if (this._flagVertices || this._flagWidth || this._flagHeight) {

            const xr = this._width / 2;
            const yr = this._height / 2;

            if (!this._closed && this.vertices.length === 4) {
                this.vertices.push(new Anchor());
            }

            this.vertices.getAt(0).origin.set(-xr, -yr).sub(this._origin);
            this.vertices.getAt(1).origin.set(xr, -yr).sub(this._origin);
            this.vertices.getAt(2).origin.set(xr, yr).sub(this._origin);
            this.vertices.getAt(3).origin.set(-xr, yr).sub(this._origin);
            // FYI: Two.Sprite and Two.ImageSequence have 4 verts
            const anchor = this.vertices.getAt(4);
            if (anchor) {
                anchor.origin.set(-xr, -yr).sub(this._origin);
                anchor.command = 'L';
            }

        }

        super._update.call(this);

        return this;
    }

    flagReset() {
        this._flagWidth = false;
        this._flagHeight = false;
        super.flagReset();
        return this;
    }
    get height(): number {
        return this._height;
    }
    set height(v: number) {
        this._height = v;
        this._flagHeight = true;
    }
    get origin(): Vector {
        return this._origin;
    }
    set origin(v: Vector) {
        if (this.#origin_change_subscription) {
            this.#origin_change_subscription.unsubscribe();
            this.#origin_change_subscription = null;
        }
        this._origin = v;
        this.#origin_change_subscription = this._origin.change$.subscribe(() => {
            this._flagVertices = true;
        });
        this._flagVertices = true;
    }
    get width(): number {
        return this._width;
    }
    set width(v: number) {
        this._width = v;
        this._flagWidth = true;
    }
}
