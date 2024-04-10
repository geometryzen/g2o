import { Anchor } from '../anchor.js';
import { G20 } from '../math/G20.js';
import { Path, PathOptions } from '../path.js';
import { HALF_PI, TWO_PI } from '../utils/math.js';
import { Commands } from '../utils/path-commands.js';

export interface CircleOptions {
    position?: G20;
    attitude?: G20;
    radius?: number;
    resolution?: number;
}

export class Circle extends Path {

    _flagRadius = false;

    #radius: number;

    constructor(options: CircleOptions = {}) {

        // At least 2 vertices are required for proper circle.
        const amount = options.resolution ? Math.max(options.resolution, 2) : 4;
        // These anchors will be placed on the circle during the update phase.
        const points: Anchor[] = [];
        for (let i = 0; i < amount; i++) {
            points.push(new Anchor(G20.vector(0, 0), 0, 0, 0, 0));
        }

        super(points, true, true, true, path_options_from_circle_options(options));

        if (typeof options.radius === 'number') {
            this.#radius = options.radius;
            this._flagRadius = true;
        }
        else {
            this.#radius = 0;
            this._flagRadius = true;
        }

        this._update();
    }

    dispose(): void {
        super.dispose();
    }

    static from_center_and_radius(center: G20, radius: number): Circle {
        return new Circle({ position: center, radius: radius });
    }

    _update() {

        if (this._flagVertices || this._flagRadius) {

            let length = this.vertices.length;

            if (!this._closed && length > 2) {
                length -= 1;
            }

            // Coefficient for approximating circular arcs with Bezier curves
            const c = (4 / 3) * Math.tan(Math.PI / (length * 2));
            const radius = this.#radius;
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

        super._update.call(this);
        return this;
    }

    flagReset(dirtyFlag = false): this {
        this._flagRadius = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }

    get radius(): number {
        return this.#radius;
    }
    set radius(v: number) {
        this.#radius = v;
        this._flagRadius = true;
    }
}

function path_options_from_circle_options(circle_options: CircleOptions): PathOptions {
    const path_options: PathOptions = {
        attitude: circle_options.attitude,
        position: circle_options.position
    };
    return path_options;
}
