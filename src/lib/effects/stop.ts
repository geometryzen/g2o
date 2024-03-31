import { BehaviorSubject, Observable } from 'rxjs';
import { Element } from '../element.js';
import { Gradient } from './gradient.js';

export class Stop extends Element<Gradient> {

    /**
     * @name Two.Stop#_flagOffset
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Stop#offset} needs updating.
     */
    _flagOffset = true;

    /**
     * @name Two.Stop#_flagOpacity
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Stop#opacity} needs updating.
     */
    _flagOpacity = true;

    /**
     * @name Two.Stop#_flagColor
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Stop#color} needs updating.
     */
    _flagColor = true;

    /**
     * @name Two.Stop#_offset
     * @private
     * @see {@link Two.Stop#offset}
     */
    _offset = 0;

    /**
     * @name Two.Stop#_opacity
     * @private
     * @see {@link Two.Stop#opacity}
     */
    _opacity = 1;

    /**
     * @name Two.Stop#_color
     * @private
     * @see {@link Two.Stop#color}
     */
    _color = '#fff';

    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    /**
     * @param {Number} [offset] - The offset percentage of the stop represented as a zero-to-one value. Default value flip flops from zero-to-one as new stops are created.
     * @param {String} [color] - The color of the stop. Default value flip flops from white to black as new stops are created.
     * @param {Number} [opacity] - The opacity value. Default value is 1, cannot be lower than 0.
     * @nota-bene Used specifically in conjunction with {@link Two.Gradient}s to control color graduation.
     */
    constructor(offset?: number, color?: string, opacity?: number) {

        super();

        this._renderer.type = 'stop';

        /**
         * @name Two.Stop#offset
         * @property {Number} - The offset percentage of the stop represented as a zero-to-one value.
         */
        this.offset = typeof offset === 'number' ? offset
            : Stop.Index <= 0 ? 0 : 1;

        /**
         * @name Two.Stop#opacity
         * @property {Number} - The alpha percentage of the stop represented as a zero-to-one value.
         * @nota-bene This is only supported on the {@link Two.SVGRenderer}. You can get the same effect by encoding opacity into `rgba` strings in the color.
         */
        this.opacity = typeof opacity === 'number' ? opacity : 1;

        /**
         * @name Two.Stop#color
         * @property {String} - The color of the stop.
         */
        this.color = (typeof color === 'string') ? color
            : Stop.Index <= 0 ? '#fff' : '#000';

        Stop.Index = (Stop.Index + 1) % 2;

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();
    }

    /**
     * @name Two.Stop.Index
     * @property {Number} - The current index being referenced for calculating a stop's default offset value.
     */
    static Index = 0;

    /**
     * @name Two.Stop.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Stop}.
     */
    static Properties = ['offset', 'opacity', 'color'];

    flagReset() {
        this._flagOffset = this._flagColor = this._flagOpacity = false;
        super.flagReset.call(this);
        return this;
    }
    get color(): string {
        return this._color;
    }
    set color(v: string) {
        this._color = v;
        this._flagColor = true;
        if (this.parent) {
            this.parent._flagStops = true;
        }
        this.#change.next(this);
    }
    get offset(): number {
        return this._offset;
    }
    set offset(v: number) {
        this._offset = v;
        this._flagOffset = true;
        if (this.parent) {
            this.parent._flagStops = true;
        }
        this.#change.next(this);
    }
    get opacity(): number {
        return this._opacity;
    }
    set opacity(v: number) {
        this._opacity = v;
        this._flagOpacity = true;
        if (this.parent) {
            this.parent._flagStops = true;
        }
        this.#change.next(this);
    }
}
