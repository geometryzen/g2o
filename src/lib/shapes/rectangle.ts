import { Anchor } from '../anchor';
import { Flag } from '../Flag';
import { IBoard } from '../IBoard';
import { G20 } from '../math/G20';
import { Path, PathAttributes } from '../path';
import { Disposable } from '../reactive/Disposable';

export interface RectangleAttributes {
    id: string;
    position: G20;
    attitude: G20;
    width: number;
    height: number;
}

export class Rectangle extends Path {

    #width = 0;
    #height = 0;

    _origin: G20;
    // DGH: How does origin differ from position?
    #origin_change: Disposable | null = null;

    constructor(board: IBoard, options: Partial<RectangleAttributes> = {}) {

        const points = [
            new Anchor(G20.vector(0, 0), 0, 0, 0, 0, 'M'),
            new Anchor(G20.vector(0, 0), 0, 0, 0, 0, 'L'),
            new Anchor(G20.vector(0, 0), 0, 0, 0, 0, 'L'),
            new Anchor(G20.vector(0, 0), 0, 0, 0, 0, 'L')
            // new Anchor() // TODO: Figure out how to handle this for `beginning` / `ending` animations
        ];

        super(board, points, true, false, true, path_options_from_rectangle_options(options));

        this.#width = typeof options.width === 'number' ? options.width : 1;
        this.#height = typeof options.height === 'number' ? options.height : 1;

        this.origin = G20.zero.clone();

        this.flagReset(true);
        this.update();
    }

    update(): this {
        if (this.flags[Flag.Vertices] || this.flags[Flag.Width] || this.flags[Flag.Height]) {

            const xr = this.width / 2;
            const yr = this.height / 2;

            if (!this.closed && this.vertices.length === 4) {
                this.vertices.push(new Anchor(G20.vector(0, 0)));
            }

            this.vertices.getAt(0).origin.set(-xr, -yr).sub(this._origin);
            this.vertices.getAt(1).origin.set(xr, -yr).sub(this._origin);
            this.vertices.getAt(2).origin.set(xr, yr).sub(this._origin);
            this.vertices.getAt(3).origin.set(-xr, yr).sub(this._origin);
            // FYI: Sprite and ImageSequence have 4 verts
            const anchor = this.vertices.getAt(4);
            if (anchor) {
                anchor.origin.set(-xr, -yr).sub(this._origin);
                anchor.command = 'L';
            }

        }

        super.update.call(this);

        return this;
    }

    flagReset(dirtyFlag = false): this {
        this.flags[Flag.Width] = dirtyFlag;
        this.flags[Flag.Height] = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }
    get height(): number {
        return this.#height;
    }
    set height(height: number) {
        this.#height = height;
        this.flags[Flag.Height] = true;
    }
    get origin(): G20 {
        return this._origin;
    }
    set origin(v: G20) {
        if (this.#origin_change) {
            this.#origin_change.dispose();
            this.#origin_change = null;
        }
        this._origin = v;
        this.#origin_change = this._origin.change$.subscribe(() => {
            this.flags[Flag.Vertices] = true;
        });
        this.flags[Flag.Vertices] = true;
    }
    get width(): number {
        return this.#width;
    }
    set width(width: number) {
        this.#width = width;
        this.flags[Flag.Width] = true;
    }
}

function path_options_from_rectangle_options(attributes: Partial<RectangleAttributes>): PathAttributes {
    const path_options: PathAttributes = {
        id: attributes.id,
        attitude: attributes.attitude,
        position: attributes.position
    };
    return path_options;
}
