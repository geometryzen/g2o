import { BehaviorSubject } from 'rxjs';
import { Children } from '../children';
import { Constants } from '../constants';
import { Element } from '../element';
import { Group } from '../group';
import { Observable } from '../rxjs/Observable';
import { Subscription } from '../rxjs/Subscription';
import { Stop } from './stop';

/**
 *
 */
export abstract class Gradient extends Element<Group> {

    _flagStops = false;
    _flagSpread = false;
    _flagUnits = false;

    _spread: 'pad' | 'reflect' | 'repeat' | null = null;
    _units: 'userSpaceOnUse' | 'objectBoundingBox' | null = null;

    _stops: Children<Stop> | null = null;
    _stops_insert: Subscription | null = null;
    _stops_remove: Subscription | null = null;

    readonly _change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    readonly _stop_subscriptions: { [id: string]: Subscription } = {};

    constructor(stops?: Stop[]) {

        super();


        this.id = Constants.Identifier + Constants.uniqueId();
        this.classList = [];

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

        this.#set_children(stops);

        this._change = new BehaviorSubject(this);
        this.change$ = this._change.asObservable();
    }

    dispose(): void {
        this.#unset_children();
    }

    /**
     * Trying to stay DRY here, but this may not be the best factoring. 
     */
    #set_children(children: Stop[]): void {
        this._stops = new Children((children || []).slice(0));

        this._stops_insert = this._stops.insert$.subscribe((stops: Stop[]) => {
            let i = stops.length;
            while (i--) {
                const stop = stops[i];
                this._stop_subscriptions[stop.id] = stop.change$.subscribe(() => {
                    this._flagStops = true;
                });
                stop.parent = this;
            }
        });

        this._stops_remove = this._stops.remove$.subscribe((stops: Stop[]) => {
            let i = stops.length;
            while (i--) {
                const stop = stops[i];
                const subscription = this._stop_subscriptions[stop.id];
                subscription.unsubscribe();
                delete this._stop_subscriptions[stop.id];
                delete stops[i].parent;
            }
        });

        // Notify renderer of initial stops.
        this._stops.ping();
    }

    #unset_children(): void {
        if (this._stops_insert) {
            this._stops_insert.unsubscribe();
            this._stops_insert = null;
        }
        if (this._stops_remove) {
            this._stops_remove.unsubscribe();
            this._stops_remove = null;
        }
        if (this._stops) {
            this._stops.dispose();
            this._stops = null;
        }
    }

    /**
     * @name Two.Gradient.Stop
     * @see {@link Two.Stop}
     */
    static Stop = Stop;

    /**
     * A list of properties that are on every Gradient.
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _update(bubbles = false): this {
        if (this._flagSpread || this._flagStops) {
            this._change.next(this);
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
    get spread(): 'pad' | 'reflect' | 'repeat' | null {
        return this._spread;
    }
    set spread(v: 'pad' | 'reflect' | 'repeat' | null) {
        this._spread = v;
        this._flagSpread = true;
    }
    get stops() {
        // TODO: Should we be returning a defensive copy?
        return this._stops.get();
    }
    set stops(stops: Stop[]) {
        this.#unset_children();
        this.#set_children(stops);
    }
    get units(): 'userSpaceOnUse' | 'objectBoundingBox' | null {
        return this._units;
    }
    set units(v: 'userSpaceOnUse' | 'objectBoundingBox' | null) {
        this._units = v;
        this._flagUnits = true;
    }
}
