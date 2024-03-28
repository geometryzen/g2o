import { Anchor } from '../anchor.js';
import { Path } from '../path.js';
import { HALF_PI, TWO_PI } from '../utils/math.js';
import { Commands } from '../utils/path-commands.js';


const cos = Math.cos, sin = Math.sin;

/**
 * @name Two.Ellipse
 * @class
 * @extends Two.Path
 * @param {Number} [x=0] - The x position of the ellipse.
 * @param {Number} [y=0] - The y position of the ellipse.
 * @param {Number} [rx=0] - The radius value of the ellipse in the x direction.
 * @param {Number} [ry=0] - The radius value of the ellipse in the y direction.
 * @param {Number} [resolution=4] - The number of vertices used to construct the ellipse.
 */
export class Ellipse extends Path {

    /**
     * @name Two.Ellipse#_flagWidth
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Ellipse#width} needs updating.
     */
    _flagWidth = false;
    /**
     * @name Two.Ellipse#_flagHeight
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Ellipse#height} needs updating.
     */
    _flagHeight = false;

    /**
     * @name Two.Ellipse#_width
     * @private
     * @see {@link Two.Ellipse#width}
     */
    _width = 0;
    /**
     * @name Two.Ellipse#_height
     * @private
     * @see {@link Two.Ellipse#height}
     */
    _height = 0;

    constructor(x: number, y: number, rx: number, ry: number, resolution: number) {

        if (typeof ry !== 'number' && typeof rx === 'number') {
            ry = rx;
        }

        // At least 2 vertices are required for proper circlage
        const amount = resolution ? Math.max(resolution, 2) : 4;
        const points = [];
        for (let i = 0; i < amount; i++) {
            points.push(new Anchor());
        }

        super(points, true, true, true);

        for (let prop in proto) {
            Object.defineProperty(this, prop, proto[prop]);
        }

        /**
         * @name Two.Ellipse#width
         * @property {Number} - The width of the ellipse.
         */
        if (typeof rx === 'number') {
            this.width = rx * 2;
        }

        /**
         * @name Two.Ellipse#height
         * @property {Number} - The height of the ellipse.
         */
        if (typeof ry === 'number') {
            this.height = ry * 2;
        }

        this._update();

        if (typeof x === 'number') {
            this.translation.x = x;
        }
        if (typeof y === 'number') {
            this.translation.y = y;
        }

    }

    /**
     * @name Two.Ellipse.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Ellipse}.
     */
    static Properties = ['width', 'height'];

    /**
     * @name Two.Ellipse#_update
     * @function
     * @private
     * @param {Boolean} [bubbles=false] - Force the parent to `_update` as well.
     * @description This is called before rendering happens by the renderer. This applies all changes necessary so that rendering is up-to-date but not updated more than it needs to be.
     * @nota-bene Try not to call this method more than once a frame.
     */
    _update() {

        if (this._flagVertices || this._flagWidth || this._flagHeight) {

            let length = this.vertices.length;

            if (!this._closed && length > 2) {
                length -= 1;
            }

            // Coefficient for approximating circular arcs with Bezier curves
            const c = (4 / 3) * Math.tan(Math.PI / (this.vertices.length * 2));
            const radiusX = this._width / 2;
            const radiusY = this._height / 2;

            for (let i = 0; i < this.vertices.length; i++) {
                const pct = i / length;
                const theta = pct * TWO_PI;

                const x = radiusX * cos(theta);
                const y = radiusY * sin(theta);

                const lx = radiusX * c * cos(theta - HALF_PI);
                const ly = radiusY * c * sin(theta - HALF_PI);

                const rx = radiusX * c * cos(theta + HALF_PI);
                const ry = radiusY * c * sin(theta + HALF_PI);

                const v = this.vertices[i];

                v.command = i === 0 ? Commands.move : Commands.curve;
                v.set(x, y);
                v.controls.left.set(lx, ly);
                v.controls.right.set(rx, ry);
            }
        }

        super._update.call(this);
        return this;

    }

    /**
     * @name Two.Ellipse#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {

        this._flagWidth = this._flagHeight = false;

        super.flagReset.call(this);
        return this;

    }

    /**
     * @name Two.Ellipse#clone
     * @function
     * @param {Two.Group} [parent] - The parent group or scene to add the clone to.
     * @returns {Two.Ellipse}
     * @description Create a new instance of {@link Two.Ellipse} with the same properties of the current path.
     */
    clone(parent) {

        const rx = this.width / 2;
        const ry = this.height / 2;
        const resolution = this.vertices.length;
        const clone = new Ellipse(0, 0, rx, ry, resolution);

        clone.translation.copy(this.translation);
        clone.rotation = this.rotation;
        clone.scale = this.scale;
        clone.skewX = this.skewX;
        clone.skewY = this.skewY;

        if (this.matrix.manual) {
            clone.matrix.copy(this.matrix);
        }

        for (let i = 0; i < Path.Properties.length; i++) {
            const k = Path.Properties[i];
            clone[k] = this[k];
        }

        if (parent) {
            parent.add(clone);
        }

        return clone;

    }

    /**
     * @name Two.Ellipse#toObject
     * @function
     * @returns {Object}
     * @description Return a JSON compatible plain object that represents the path.
     */
    toObject() {

        const object = super.toObject.call(this);

        for (let i = 0; i < Ellipse.Properties.length; i++) {
            const k = Ellipse.Properties[i];
            object[k] = this[k];
        }

        return object;

    }

}

const proto = {
    width: {
        enumerable: true,
        get: function () {
            return this._width;
        },
        set: function (v) {
            this._width = v;
            this._flagWidth = true;
        }
    },
    height: {
        enumerable: true,
        get: function () {
            return this._height;
        },
        set: function (v) {
            this._height = v;
            this._flagHeight = true;
        }
    }
};
