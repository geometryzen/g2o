import { Anchor } from '../anchor';
import { Path, PathOptions } from '../path';
import { Subscription } from '../rxjs/Subscription';
import { G20 } from '../math/G20';

export interface RectangleOptions {
    position?: G20;
    attitude?: G20;
    width?: number;
    height?: number;
}

export class Rectangle extends Path {

    _flagWidth: boolean;
    _flagHeight: boolean;
    _width = 0;
    _height = 0;

    _origin: G20 = null;
    // DGH: How does origin differ from position?
    #origin_change_subscription: Subscription | null = null;

    constructor(options: RectangleOptions = {}) {

        const points = [
            new Anchor(0, 0, 0, 0, 0, 0, 'M'),
            new Anchor(0, 0, 0, 0, 0, 0, 'L'),
            new Anchor(0, 0, 0, 0, 0, 0, 'L'),
            new Anchor(0, 0, 0, 0, 0, 0, 'L')
            // new Anchor() // TODO: Figure out how to handle this for `beginning` / `ending` animations
        ];

        super(points, true, false, true, path_options_from_rectangle_options(options));

        this._width = typeof options.width === 'number' ? options.width : 1;
        this._flagWidth = true;

        this._height = typeof options.height === 'number' ? options.height : 1;
        this._flagHeight = true;

        this.origin = new G20();

        this._update();
    }

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

    flagReset(dirtyFlag = false) {
        this._flagWidth = dirtyFlag;
        this._flagHeight = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }
    get height(): number {
        return this._height;
    }
    set height(v: number) {
        this._height = v;
        this._flagHeight = true;
    }
    get origin(): G20 {
        return this._origin;
    }
    set origin(v: G20) {
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

function path_options_from_rectangle_options(circle_options: RectangleOptions): PathOptions {
    const path_options: PathOptions = {
        attitude: circle_options.attitude,
        position: circle_options.position
    };
    return path_options;
}
