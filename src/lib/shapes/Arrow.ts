import { Anchor } from "../anchor";
import { IBoard } from "../IBoard";
import { G20 } from "../math/G20";
import { Path } from "../path";
import { PositionLike, position_from_like } from "../shape";
import { Commands } from "../utils/path-commands";

export class Arrow extends Path {
    constructor(board: IBoard, tail: PositionLike, axis: PositionLike, size?: number) {
        const position = position_from_like(tail);
        const x1 = 0;
        const y1 = 0;

        const X2 = position_from_like(axis);
        const x2 = X2.x;
        const y2 = X2.y;

        const headlen = typeof size === 'number' ? size : 10;

        /**
         * The angle that the vector makes to the horizontal axis
         */
        const θ = Math.atan2(y2 - y1, x2 - x1);
        const φ = Math.PI / 6;

        const vertices = [
            // The first vertex is the tail.
            new Anchor(G20.vector(0, 0), undefined, undefined, undefined, undefined, Commands.move),
            // The second vertex is the head
            new Anchor(X2, undefined, undefined, undefined, undefined, Commands.line),

            // The Port side of the arrow.
            // 
            new Anchor(X2, undefined, undefined, undefined, undefined, Commands.move),
            new Anchor(
                G20.vector(x2 - headlen * Math.cos(θ - φ), y2 - headlen * Math.sin(θ - φ)),
                undefined, undefined, undefined, undefined, Commands.line
            ),

            // The Starboard side of the arrow.
            new Anchor(X2, undefined, undefined, undefined, undefined, Commands.move),
            new Anchor(
                G20.vector(x2 - headlen * Math.cos(θ + φ), y2 - headlen * Math.sin(θ + φ)),
                undefined, undefined, undefined, undefined, Commands.line
            )
        ];

        super(board, vertices, false, false, true, {
            position
        });

        this.noFill();
        this.cap = 'round';
        this.join = 'round';
    }

    override update(): this {
        /*
        if (this.zzz.flags[Flag.Vertices] || this.zzz.flags[Flag.Width] || this.zzz.flags[Flag.Height]) {
            update_rectangle_vertices(this.width, this.height, this.origin, this.closed, this.vertices);
        }
        */

        super.update();

        return this;
    }

    override flagReset(dirtyFlag = false): this {
        // this.zzz.flags[Flag.Width] = dirtyFlag;
        // this.zzz.flags[Flag.Height] = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }

}