import { BehaviorSubject } from 'rxjs';
import { Children } from '../children';
import { Constants } from '../constants';
import { ElementBase } from '../element';
import { Group } from '../group';
import { Disposable } from '../reactive/Disposable';
import { DisposableObservable, Observable } from '../reactive/Observable';
import { Stop } from './stop';

/**
 *
 */
export abstract class Gradient extends ElementBase<Group> {

    _flagStops = false;
    _flagSpread = false;
    _flagUnits = false;

    _spread: 'pad' | 'reflect' | 'repeat' | null = null;
    _units: 'userSpaceOnUse' | 'objectBoundingBox' | null = null;

    _stops: Children<Stop> | null = null;
    _stops_insert: Disposable | null = null;
    _stops_remove: Disposable | null = null;

    readonly _change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    readonly _stop_subscriptions: { [id: string]: Disposable } = {};

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
        this.change$ = new DisposableObservable(this._change.asObservable());
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
                subscription.dispose();
                delete this._stop_subscriptions[stop.id];
                delete stops[i].parent;
            }
        });

        // Notify renderer of initial stops.
        this._stops.ping();
    }

    #unset_children(): void {
        if (this._stops_insert) {
            this._stops_insert.dispose();
            this._stops_insert = null;
        }
        if (this._stops_remove) {
            this._stops_remove.dispose();
            this._stops_remove = null;
        }
        if (this._stops) {
            this._stops.dispose();
            this._stops = null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(bubbles = false): this {
        if (this._flagSpread || this._flagStops) {
            this._change.next(this);
        }
        return this;
    }

    flagReset(dirtyFlag = false): this {
        this._flagSpread = dirtyFlag;
        this._flagUnits = dirtyFlag;
        this._flagStops = dirtyFlag;
        super.flagReset(dirtyFlag);
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
