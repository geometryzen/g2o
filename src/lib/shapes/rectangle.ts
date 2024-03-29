import { Anchor } from '../anchor.js';
import { Events } from '../events.js';
import { Group } from '../group.js';
import { Path } from '../path.js';
import { Commands } from '../utils/path-commands.js';
import { Vector } from '../vector.js';


/**
 * @name Two.Rectangle
 * @class
 * @extends Two.Path
 * @param {Number} [x=0] - The x position of the rectangle.
 * @param {Number} [y=0] - The y position of the rectangle.
 * @param {Number} [width=1] - The width value of the rectangle.
 * @param {Number} [height=1] - The width value of the rectangle.
 */
export class Rectangle extends Path {

    constructor(x = 0, y = 0, width = 1, height = 1) {

        const points = [
            new Anchor(),
            new Anchor(),
            new Anchor(),
            new Anchor()
            // new Anchor() // TODO: Figure out how to handle this for `beginning` / `ending` animations
        ];

        super(points, true, false, true);

        /**
         * @name Two.Rectangle#width
         * @property {Number} - The size of the width of the rectangle.
         */
        this.width = typeof width === 'number' ? width : 1;
        /**
         * @name Two.Rectangle#height
         * @property {Number} - The size of the height of the rectangle.
         */
        this.height = typeof height === 'number' ? height : 1;

        /**
         * @name Two.Rectangle#origin
         * @property {Number} - A two-component vector describing the origin offset to draw the rectangle. Default is `0, 0`.
         */
        this.origin = new Vector();

        if (typeof x === 'number') {
            this.translation.x = x;
        }
        if (typeof y === 'number') {
            this.translation.y = y;
        }

        this._update();

    }

    /**
     * @name Two.Rectangle.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Rectangle}.
     */
    static Properties = ['width', 'height'];

    /**
     * @name Two.Rectangle#_flagWidth
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Rectangle#width} needs updating.
     */
    _flagWidth = false;
    /**
     * @name Two.Rectangle#_flagHeight
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Rectangle#height} needs updating.
     */
    _flagHeight = false;

    /**
     * @name Two.Rectangle#_width
     * @private
     * @see {@link Two.Rectangle#width}
     */
    _width = 0;
    /**
     * @name Two.Rectangle#_height
     * @private
     * @see {@link Two.Rectangle#height}
     */
    _height = 0;

    _origin: Vector = null;

    /**
     * @name Two.Rectangle#_update
     * @function
     * @private
     * @param {Boolean} [bubbles=false] - Force the parent to `_update` as well.
     * @description This is called before rendering happens by the renderer. This applies all changes necessary so that rendering is up-to-date but not updated more than it needs to be.
     * @nota-bene Try not to call this method more than once a frame.
     */
    _update() {

        if (this._flagVertices || this._flagWidth || this._flagHeight) {

            const xr = this._width / 2;
            const yr = this._height / 2;

            if (!this._closed && this.vertices.length === 4) {
                this.vertices.push(new Anchor());
            }

            this.vertices[0].set(-xr, -yr).sub(this._origin).command = Commands.move;
            this.vertices[1].set(xr, -yr).sub(this._origin).command = Commands.line;
            this.vertices[2].set(xr, yr).sub(this._origin).command = Commands.line;
            this.vertices[3].set(-xr, yr).sub(this._origin).command = Commands.line;
            // FYI: Two.Sprite and Two.ImageSequence have 4 verts
            if (this.vertices[4]) {
                this.vertices[4].set(-xr, -yr).sub(this._origin).command = Commands.line;
            }

        }

        super._update.call(this);

        return this;

    }

    /**
     * @name Two.Rectangle#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {

        this._flagWidth = this._flagHeight = false;
        super.flagReset.call(this);

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
        if (this._origin) {
            this._origin.unbind(Events.Types.change, this._renderer.flagVertices);
        }
        this._origin = v;
        this._origin.bind(Events.Types.change, this._renderer.flagVertices);
        this._renderer.flagVertices();
    }
    get width(): number {
        return this._width;
    }
    set width(v: number) {
        this._width = v;
        this._flagWidth = true;
    }
}
