import { Anchor } from '../anchor.js';
import { Path } from '../path.js';
import { HALF_PI, TWO_PI } from '../utils/math.js';
import { Commands } from '../utils/path-commands.js';

const cos = Math.cos, sin = Math.sin;

/**
 * @name Two.Circle
 * @class
 * @extends Two.Path
 * @param {Number} [x=0] - The x position of the circle.
 * @param {Number} [y=0] - The y position of the circle.
 * @param {Number} [radius=0] - The radius value of the circle.
 * @param {Number} [resolution=4] - The number of vertices used to construct the circle.
 */
export class Circle extends Path {
    /**
     * @name Two.Circle#_flagRadius
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Circle#radius} needs updating.
     */
    _flagRadius = false;

    /**
     * @name Two.Circle#_radius
     * @private
     * @see {@link Two.Circle#radius}
     */
    _radius = 0;

    /**
     * DGH: Wouldn't 1 be a better default for a circle radius.
     * DGH: A vector for the position would show that x and y have a relationship AND be more geometric.
     * @param x 
     * @param y 
     * @param r 
     * @param resolution 
     */
    constructor(x = 0, y = 0, r = 0, resolution = 4) {

        // At least 2 vertices are required for proper circlage
        const amount = resolution ? Math.max(resolution, 2) : 4;
        const points = [];
        for (let i = 0; i < amount; i++) {
            points.push(new Anchor(0, 0, 0, 0, 0, 0));
        }

        super(points, true, true, true);

        /**
         * @name Two.Circle#radius
         * @property {Number} - The size of the radius of the circle.
         */
        if (typeof r === 'number') {
            this.radius = r;
        }

        this._update();

        if (typeof x === 'number') {
            this.position.x = x;
        }
        if (typeof y === 'number') {
            this.position.y = y;
        }

    }

    /**
     * @name Two.Circle.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Circle}.
     */
    static Properties = ['radius'];

    /**
     * @name Two.Circle#_update
     * @function
     * @private
     * @param {Boolean} [bubbles=false] - Force the parent to `_update` as well.
     * @description This is called before rendering happens by the renderer. This applies all changes necessary so that rendering is up-to-date but not updated more than it needs to be.
     * @nota-bene Try not to call this method more than once a frame.
     */
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

    /**
     * @name Two.Circle#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {
        this._flagRadius = false;
        super.flagReset.call(this);
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
