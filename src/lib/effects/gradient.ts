import { Collection } from '../collection.js';
import { Constants } from '../constants.js';
import { Element } from '../element.js';
import { Events } from '../events.js';
import { Group } from '../group.js';
import { _ } from '../utils/underscore.js';
import { Stop } from './stop.js';


/**
 * @name Two.Gradient
 * @class
 * @extends Two.Element
 * @param {Two.Stop[]} [stops] - A list of {@link Two.Stop}s that contain the gradient fill pattern for the gradient.
 * @description This is the base class for constructing different types of gradients with Two.js. The two common gradients are {@link Two.LinearGradient} and {@link Two.RadialGradient}.
 */
export class Gradient extends Element {

    _flagStops = false;
    _flagSpread = false;
    _flagUnits = false;

    _spread = '';
    _units = '';
    _stops: Collection<Stop>;

    constructor(stops?: Stop[]) {

        super();

        this._renderer.type = 'gradient';

        /**
         * @name Two.Gradient#renderer
         * @property {Object}
         * @description Object access to store relevant renderer specific variables. Warning: manipulating this object can create unintended consequences.
         * @nota-bene With the {@link Two.SVGRenderer} you can access the underlying SVG element created via `shape.renderer.elem`.
         */

        /**
         * @name Two.Gradient#id
         * @property {String} - Session specific unique identifier.
         * @nota-bene In the {@link Two.SVGRenderer} change this to change the underlying SVG element's id too.
         */
        this.id = Constants.Identifier + Constants.uniqueId();
        this.classList = [];

        this._renderer.flagStops = FlagStops.bind(this);
        this._renderer.bindStops = BindStops.bind(this);
        this._renderer.unbindStops = UnbindStops.bind(this);

        /**
         * @name Two.Gradient#spread
         * @property {String} - Indicates what happens if the gradient starts or ends inside the bounds of the target rectangle. Possible values are `'pad'`, `'reflect'`, and `'repeat'`.
         * @see {@link https://www.w3.org/TR/SVG11/pservers.html#LinearGradientElementSpreadMethodAttribute} for more information
         */
        this.spread = 'pad';

        /**
         * @name Two.Gradient#units
         * @property {String} [units='objectBoundingBox'] - Indicates how coordinate values are interpreted by the renderer. Possible values are `'userSpaceOnUse'` and `'objectBoundingBox'`.
         * @see {@link https://www.w3.org/TR/SVG11/pservers.html#RadialGradientElementGradientUnitsAttribute} for more information
         */
        this.units = 'objectBoundingBox';

        /**
         * @name Two.Gradient#stops
         * @property {Two.Stop[]} - An ordered list of {@link Two.Stop}s for rendering the gradient.
         */
        if (stops) {
            this.stops = stops;
        }

    }

    /**
     * @name Two.Gradient.Stop
     * @see {@link Two.Stop}
     */
    static Stop = Stop;

    /**
     * @name Two.Gradient.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Gradient}.
     */
    static Properties = ['spread', 'stops', 'renderer', 'units'];

    /**
     * @name Two.Gradient#_update
     * @function
     * @private
     * @param {Boolean} [bubbles=false] - Force the parent to `_update` as well.
     * @description This is called before rendering happens by the renderer. This applies all changes necessary so that rendering is up-to-date but not updated more than it needs to be.
     * @nota-bene Try not to call this method more than once a frame.
     */
    _update() {

        if (this._flagSpread || this._flagStops) {
            this.trigger(Events.Types.change);
        }

        return this;

    }

    /**
     * @name Two.Gradient#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {

        this._flagSpread = this._flagUnits = this._flagStops = false;

        super.flagReset.call(this);

        return this;

    }
    get spread(): string {
        return this._spread;
    }
    set spread(v: string) {
        this._spread = v;
        this._flagSpread = true;
    }
    get stops() {
        return this._stops;
    }
    set stops(stops: Stop[]) {

        const bindStops = this._renderer.bindStops;
        const unbindStops = this._renderer.unbindStops;

        // Remove previous listeners
        if (this._stops) {
            this._stops
                .unbind(Events.Types.insert, bindStops)
                .unbind(Events.Types.remove, unbindStops);
        }

        // Create new Collection with copy of Stops
        this._stops = new Collection((stops || []).slice(0));

        // Listen for Collection changes and bind / unbind
        this._stops
            .bind(Events.Types.insert, bindStops)
            .bind(Events.Types.remove, unbindStops);

        // Bind Initial Stops
        bindStops(this._stops);
    }
    get units(): string {
        return this._units;
    }
    set units(v: string) {
        this._units = v;
        this._flagUnits = true;
    }
}

/**
 * @name FlagStops
 * @private
 * @function
 * @description Cached method to let renderers know stops have been updated on a {@link Two.Gradient}.
 */
function FlagStops(this: Gradient) {
    this._flagStops = true;
}

/**
 * @name BindVertices
 * @private
 * @function
 * @description Cached method to let {@link Two.Gradient} know vertices have been added to the instance.
 */
function BindStops(this: Gradient, items) {

    // This function is called a lot
    // when importing a large SVG
    let i = items.length;
    while (i--) {
        items[i].bind(Events.Types.change, this._renderer.flagStops);
        items[i].parent = this;
    }

    this._renderer.flagStops();

}

/**
 * @name UnbindStops
 * @private
 * @function
 * @description Cached method to let {@link Two.Gradient} know vertices have been removed from the instance.
 */
function UnbindStops(this: Gradient, items) {

    let i = items.length;
    while (i--) {
        items[i].unbind(Events.Types.change, this._renderer.flagStops);
        delete items[i].parent;
    }

    this._renderer.flagStops();

}
