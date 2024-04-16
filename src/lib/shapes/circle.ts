import { BehaviorSubject } from 'rxjs';
import { Anchor } from '../anchor';
import { Flag } from '../Flag';
import { IBoard } from '../IBoard';
import { G20 } from '../math/G20';
import { Path, PathAttributes } from '../path';
import { Observable } from '../rxjs/Observable';
import { PositionLike } from '../shape';
import { HALF_PI, TWO_PI } from '../utils/math';
import { Commands } from '../utils/path-commands';

export interface CircleOptions {
    position?: PositionLike;
    attitude?: G20;
    radius?: number;
    resolution?: number;
}

export class Circle extends Path {

    readonly #radius: BehaviorSubject<number> = new BehaviorSubject(1);
    readonly radius$: Observable<number> = this.#radius.asObservable();

    constructor(board: IBoard, options: CircleOptions = {}) {

        // At least 2 vertices are required for proper circle.
        const amount = options.resolution ? Math.max(options.resolution, 2) : 4;
        // These anchors will be placed on the circle during the update phase.
        const points: Anchor[] = [];
        for (let i = 0; i < amount; i++) {
            points.push(new Anchor(G20.vector(0, 0), 0, 0, 0, 0));
        }

        super(board, points, true, true, true, path_attributes(options));

        if (typeof options.radius === 'number') {
            this.#radius.next(options.radius);
        }

        this.linewidth = 2

        this.flagReset(true);

        this.update();
    }

    dispose(): void {
        super.dispose();
    }

    update(): this {
        if (this.flags[Flag.Vertices] || this.flags[Flag.Radius]) {

            let length = this.vertices.length;

            if (!this.closed && length > 2) {
                length -= 1;
            }

            // Coefficient for approximating circular arcs with Bezier curves
            const c = (4 / 3) * Math.tan(Math.PI / (length * 2));
            const radius = this.radius;
            const rc = radius * c;

            const cos = Math.cos;
            const sin = Math.sin;

            for (let i = 0; i < this.vertices.length; i++) {
                const pct = i / length;
                const theta = pct * TWO_PI;

                const x = radius * cos(theta);
                const y = radius * sin(theta);

                const lx = rc * cos(theta - HALF_PI);
                const ly = rc * sin(theta - HALF_PI);

                const rx = rc * cos(theta + HALF_PI);
                const ry = rc * sin(theta + HALF_PI);

                const v = this.vertices.getAt(i);

                v.command = i === 0 ? Commands.move : Commands.curve;
                v.origin.set(x, y);
                v.controls.left.set(lx, ly);
                v.controls.right.set(rx, ry);
            }
        }

        super.update();
        return this;
    }

    flagReset(dirtyFlag = false): this {
        this.flags[Flag.Radius] = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }

    get radius(): number {
        return this.#radius.value;
    }
    set radius(radius: number) {
        if (typeof radius === 'number') {
            if (this.radius !== radius) {
                this.#radius.next(radius);
                this.flags[Flag.Radius] = true;
                // This is critical, but does it violate encapsulation?
                // By extending Path, it seems I have to know something of the implementation details.
                this.flags[Flag.Length] = true;
                this.update()
            }
        }
    }
}

function path_attributes(attributes: CircleOptions): Partial<PathAttributes> {
    const retval: Partial<PathAttributes> = {
        attitude: attributes.attitude,
        position: attributes.position
    };
    return retval;
}
