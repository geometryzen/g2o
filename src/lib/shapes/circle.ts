import { Anchor } from '../anchor.js';
import { Path } from '../path.js';
import { HALF_PI, TWO_PI } from '../utils/math.js';
import { Commands } from '../utils/path-commands.js';
import { Vector } from '../vector.js';

export class Circle extends Path {

    _flagRadius = false;

    _radius = 0;

    constructor(position: Vector = new Vector(0, 0), r = 0, resolution = 4) {

        // At least 2 vertices are required for proper circle.
        const amount = resolution ? Math.max(resolution, 2) : 4;
        const points = [];
        for (let i = 0; i < amount; i++) {
            points.push(new Anchor(0, 0, 0, 0, 0, 0));
        }

        super(points, true, true, true);

        if (typeof r === 'number') {
            this.radius = r;
        }

        this.usePosition(position);

        this._update();
    }

    dispose(): void {
        super.dispose();
    }

    _update() {

        if (this._flagVertices || this._flagRadius) {

            let length = this.vertices.length;

            if (!this._closed && length > 2) {
                length -= 1;
            }

            // Coefficient for approximating circular arcs with Bezier curves
            const c = (4 / 3) * Math.tan(Math.PI / (length * 2));
            const radius = this._radius;
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
        return this._radius;
    }
    set radius(v: number) {
        this._radius = v;
        this._flagRadius = true;
    }
}
