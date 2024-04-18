import { Signal } from 'signal-polyfill';
import { G20 } from '../math/G20';
import { Disposable } from '../reactive/Disposable';
import { get_dom_element_defs, svg, SVGAttributes } from '../renderers/SVGView';
import { effect } from '../utils/effect';
import { ColorProvider } from './ColorProvider';
import { Gradient } from './gradient';
import { Stop } from './stop';

export class RadialGradient extends Gradient<'radial-gradient'> implements ColorProvider {

    _flagCenter = false;
    _flagFocal = false;

    readonly #radius = new Signal.State(null as number | null);

    #center: G20 | null = null;
    #center_change: Disposable | null = null;

    #focal: G20 | null = null;
    #focal_change: Disposable | null = null;

    /**
     * @param cx The x position of the origin of the radial gradient.
     * @param cy The y position of the origin of the radial gradient.
     * @param r The radius of the radial gradient.
     * @param stops A list of {@link Stop}s that contain the gradient fill pattern for the gradient.
     * @param fx The x position of the focal point on the radial gradient.
     * @param fy The y position of the focal point on the radial gradient.
     */
    constructor(cx: number = 0, cy: number = 0, r: number = 1, stops: Stop[] = [], fx?: number, fy?: number) {

        super(stops);

        this.zzz.type = 'radial-gradient';

        this.center = new G20(cx, cy);

        this.radius = r;

        this.focal = new G20(fx, fy);
        this.focal.copy(this.center);
        if (typeof fx === 'number') {
            this.focal.x = fx;
        }
        if (typeof fy === 'number') {
            this.focal.y = fy;
        }
    }

    render(svgElement: SVGElement): this {
        const changed: SVGAttributes = {};

        if (this._flagCenter) {
            changed.cx = `${this.center.x}`;
            changed.cy = `${this.center.y}`;
        }
        if (this._flagFocal) {
            changed.fx = `${this.focal.x}`;
            changed.fy = `${this.focal.y}`;
        }

        if (this.zzz.elem) {
            svg.setAttributes(this.zzz.elem, changed);
        }
        else {
            changed.id = this.id;
            this.zzz.elem = svg.createElement('radialGradient', changed);
            // gradientUnits
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = {};
                change.gradientUnits = this.units;
                svg.setAttributes(this.zzz.elem, change);
            }));
            // radius
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = {};
                change.r = `${this.radius}`;
                svg.setAttributes(this.zzz.elem, change);
            }));
            // spreadMethod
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = {};
                change.spreadMethod = this.spreadMethod;
                svg.setAttributes(this.zzz.elem, change);
            }));
        }

        if (this.zzz.elem.parentNode === null) {
            get_dom_element_defs(svgElement).appendChild(this.zzz.elem);
        }

        if (this._flagStops) {

            const lengthChanged = this.zzz.elem.childNodes.length !== this.stops.length;

            if (lengthChanged) {
                while (this.zzz.elem.lastChild) {
                    this.zzz.elem.removeChild(this.zzz.elem.lastChild);
                }
            }

            for (let i = 0; i < this.stops.length; i++) {

                const stop = this.stops[i];
                const attrs: SVGAttributes = {};

                if (stop._flagOffset) {
                    attrs.offset = 100 * stop.offset + '%';
                }
                if (stop._flagColor) {
                    attrs['stop-color'] = stop._color;
                }
                if (stop._flagOpacity) {
                    attrs['stop-opacity'] = `${stop._opacity}`;
                }

                if (stop.zzz.elem) {
                    svg.setAttributes(stop.zzz.elem, attrs);
                }
                else {
                    stop.zzz.elem = svg.createElement('stop', attrs);
                }

                if (lengthChanged) {
                    this.zzz.elem.appendChild(stop.zzz.elem);
                }
                stop.flagReset();
            }
        }
        return this.flagReset();
    }

    static Stop = Stop;
    static Properties = ['center', 'radius', 'focal'];

    update() {
        if (this._flagCenter || this._flagFocal || this._flagStops) {
            this._change.next(this);
        }
        return this;
    }

    override flagReset(dirtyFlag = false) {
        this._flagCenter = this._flagFocal = false;
        super.flagReset(dirtyFlag);
        return this;
    }

    get center() {
        return this.#center;
    }

    set center(v) {
        if (this.#center_change) {
            this.#center_change.dispose();
            this.#center_change = null;
        }
        this.#center = v;
        this.#center_change = this.#center.change$.subscribe(() => {
            this._flagCenter = true;
        });
        this._flagCenter = true;
    }

    get focal() {
        return this.#focal;
    }

    set focal(v) {
        if (this.#focal_change) {
            this.#focal_change.dispose();
            this.#focal_change = null;
        }
        this.#focal = v;
        this.#focal_change = this.#focal.change$.subscribe(() => {
            this._flagFocal = true;
        });
        this._flagFocal = true;
    }
    get radius(): number | null {
        return this.#radius.get();
    }
    set radius(radius: number | null) {
        this.#radius.set(radius);
    }
}
