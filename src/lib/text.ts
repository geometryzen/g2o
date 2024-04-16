import { BehaviorSubject } from 'rxjs';
import { Signal } from 'signal-polyfill';
import { Gradient } from './effects/gradient';
import { LinearGradient } from './effects/linear-gradient';
import { RadialGradient } from './effects/radial-gradient';
import { Texture } from './effects/texture';
import { Flag } from './Flag';
import { Group } from './group';
import { IBoard } from './IBoard';
import { get_dashes_offset, set_dashes_offset } from './path';
import { Disposable } from './reactive/Disposable';
import { DisposableObservable, Observable } from './reactive/Observable';
import { Shape, ShapeAttributes } from './shape';
import { root } from './utils/root';

let canvas: HTMLCanvasElement;
const min = Math.min, max = Math.max;

if (root.document) {
    canvas = document.createElement('canvas');
}

export type TextDecoration = 'none' | 'underline' | 'overline' | 'line-through';

export interface TextAttributes {
    alignment: 'center' | 'left' | 'right';
    baseline: 'bottom' | 'middle' | 'top';
    decoration: TextDecoration[];
    direction: 'ltr' | 'rtl';
    family: string;
    fill: string;
    id: string;
    leading: number;
    strokeWidth: number;
    opacity: number;
    size: number;
    stroke: string;
    style: string;
    value: string;
    visible: boolean;
    weight: number;
}

export class Text extends Shape<Group> {
    automatic: boolean;
    beginning: number;
    cap: 'butt' | 'round' | 'square';
    closed: boolean;
    curved: boolean;
    ending: number;
    join: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
    length: number;
    miter: number;

    _flagLeading = true;
    _flagAlignment = true;
    _flagBaseline = true;
    _flagStyle = true;
    _flagWeight = true;
    _flagFill = true;
    _flagStroke = true;
    _flagLinewidth = true;
    _flagMask = false;
    _flagClip = false;
    _flagDirection = false;

    readonly #value: BehaviorSubject<string> = new BehaviorSubject('');
    readonly value$: Observable<string> = new DisposableObservable(this.#value.asObservable());

    readonly #family: BehaviorSubject<string> = new BehaviorSubject('sans-serif');
    readonly family$: Observable<string> = new DisposableObservable(this.#family.asObservable());

    readonly #size: BehaviorSubject<number> = new BehaviorSubject(13);
    readonly size$: Observable<number> = new DisposableObservable(this.#size.asObservable());

    /**
     * The height between lines measured from base to base in Two.js point space. Defaults to `17`.
     */
    _leading = 17;

    /**
     * Alignment of text in relation to {@link Text#position}'s coordinates.
     * Possible values include `'left'`, `'center'`, `'right'`. Defaults to `'center'`.
     */
    _alignment: 'center' | 'left' | 'right' = 'center';

    /**
     * The vertical aligment of the text in relation to {@link Text#position}'s coordinates.
     * Possible values include `'top'`, `'middle'`, `'bottom'`, and `'baseline'`. Defaults to `'baseline'`.
     * @nota-bene In headless environments where the canvas is based on {@link https://github.com/Automattic/node-canvas}, `baseline` seems to be the only valid property.
     */
    _baseline: 'bottom' | 'middle' | 'top' = 'middle';

    _style = 'normal';

    _weight = 500;

    #decoration: Signal.State<TextDecoration[]> = new Signal.State(['none' as TextDecoration]);

    /**
     * determine what direction the text should run.
     * Possibly values are `'ltr'` for left-to-right and `'rtl'` for right-to-left. Defaults to `'ltr'`.
     */
    _direction: 'ltr' | 'rtl' = 'ltr';

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    #fill: string | LinearGradient | RadialGradient | Texture = '#000';
    #fill_change: Disposable | null = null;

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    _stroke: string | LinearGradient | RadialGradient | Texture = 'none';
    #stroke_change: Disposable | null = null;

    readonly #stroke_width = new Signal.State(1);

    readonly #opacity: BehaviorSubject<number> = new BehaviorSubject(1);
    readonly opacity$: Observable<number> = new DisposableObservable(this.#opacity.asObservable());

    readonly #visible: BehaviorSubject<boolean> = new BehaviorSubject(true) as BehaviorSubject<boolean>;
    readonly visible$: Observable<boolean> = new DisposableObservable(this.#visible.asObservable());

    /**
     * The shape whose alpha property becomes a clipping area for the text.
     * @nota-bene This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    _mask: Shape<Group> | null = null;

    /**
     * @nota-bene This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    #clip = false;

    _dashes: number[] | null = null;

    constructor(board: IBoard, message: string, x: number = 0, y: number = 0, attributes: Partial<TextAttributes> = {}) {

        super(board, shape_attributes_from_text_attributes(attributes));

        this.viewInfo.type = 'text';

        this.value = message;

        if (typeof x === 'number') {
            this.position.x = x;
        }
        if (typeof y === 'number') {
            this.position.y = y;
        }

        /**
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray} for more information on the SVG stroke-dasharray attribute.
         */
        this.dashes = [];

        set_dashes_offset(this.dashes, 0);

        if (attributes.alignment) {
            this.alignment = attributes.alignment;
        }
        if (attributes.baseline) {
            this.baseline = attributes.baseline;
        }
        if (attributes.decoration) {
            this.decoration = attributes.decoration;
        }
        if (attributes.direction) {
            this.direction = attributes.direction;
        }
        if (attributes.family) {
            this.family = attributes.family;
        }
        if (attributes.fill) {
            this.fill = attributes.fill;
        }
        if (attributes.leading) {
            this.leading = attributes.leading;
        }
        if (attributes.strokeWidth) {
            this.strokeWidth = attributes.strokeWidth;
        }
        if (attributes.opacity) {
            this.opacity = attributes.opacity;
        }
        if (attributes.size) {
            this.size = attributes.size;
        }
        if (attributes.stroke) {
            this.stroke = attributes.stroke;
        }
        if (attributes.style) {
            this.style = attributes.style;
        }
        if (attributes.value) {
            this.value = attributes.value;
        }
        if (attributes.visible) {
            this.visible = attributes.visible;
        }
        if (attributes.weight) {
            this.weight = attributes.weight;
        }

        this.flagReset(true);
    }

    static Measure(text: Text): { width: number; height: number } {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.font = [text._style, text._weight, `${text.size}px/${text._leading}px`,
            text.family].join(' ');
            const metrics = ctx.measureText(text.value);
            const height = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent;
            return {
                width: metrics.width,
                height
            };
        }
        else {
            // 0.6 is approximate aspect ratio of a typeface's character width to height.
            const width = text.value.length * text.size * 0.6;
            const height = text.leading;
            // eslint-disable-next-line no-console
            console.warn('Two.Text: unable to accurately measure text, so using an approximation.');
            return {
                width, height
            };
        }
    }

    /**
     * Convenience method to set fill to `none`.
     */
    noFill() {
        this.fill = 'none';
        return this;
    }

    /**
     * Convenience method to set stroke to `none`.
     */
    noStroke() {
        this.stroke = 'none';
        return this;
    }

    getBoundingClientRect(shallow = false): { top: number; left: number; right: number; bottom: number; width: number; height: number } {

        let left: number;
        let right: number;
        let top: number;
        let bottom: number;

        // TODO: Update this to not __always__ update. Just when it needs to.
        this.update(true);

        const matrix = shallow ? this.matrix : this.worldMatrix;

        const { width, height } = Text.Measure(this);
        const border = (this.strokeWidth || 0) / 2;

        switch (this.alignment) {
            case 'left':
                left = - border;
                right = width + border;
                break;
            case 'right':
                left = - (width + border);
                right = border;
                break;
            default:
                left = - (width / 2 + border);
                right = width / 2 + border;
        }

        switch (this.baseline) {
            case 'middle':
                top = - (height / 2 + border);
                bottom = height / 2 + border;
                break;
            default:
                top = - (height + border);
                bottom = border;
        }

        const [ax, ay] = matrix.multiply_vector(left, top);
        const [bx, by] = matrix.multiply_vector(left, bottom);
        const [cx, cy] = matrix.multiply_vector(right, top);
        const [dx, dy] = matrix.multiply_vector(right, bottom);

        top = min(ay, by, cy, dy);
        left = min(ax, bx, cx, dx);
        right = max(ax, bx, cx, dx);
        bottom = max(ay, by, cy, dy);

        return {
            top,
            left,
            right,
            bottom,
            width: right - left,
            height: bottom - top
        };
    }

    hasBoundingClientRect(): boolean {
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subdivide(limit: number): this {
        throw new Error('Method not implemented.');
    }

    flagReset(dirtyFlag = false) {
        super.flagReset(dirtyFlag);

        this.flags[Flag.Value] = dirtyFlag;
        this.flags[Flag.Family] = dirtyFlag;
        this.flags[Flag.Size] = dirtyFlag;
        this._flagLeading = dirtyFlag;
        this._flagAlignment = dirtyFlag;
        this._flagFill = dirtyFlag;
        this._flagStroke = dirtyFlag;
        this._flagLinewidth = dirtyFlag;
        this.flags[Flag.Opacity] = dirtyFlag;
        this.flags[Flag.Visible] = dirtyFlag;
        this._flagClip = dirtyFlag;
        this.flags[Flag.ClassName] = dirtyFlag;
        this._flagBaseline = dirtyFlag;
        this._flagWeight = dirtyFlag;
        this._flagStyle = dirtyFlag;
        this._flagDirection = dirtyFlag;
        return this;
    }
    get alignment(): 'center' | 'left' | 'right' {
        return this._alignment;
    }
    set alignment(v: 'center' | 'left' | 'right') {
        this._alignment = v;
        this._flagAlignment = true;
    }
    get baseline() {
        return this._baseline;
    }
    set baseline(v) {
        this._baseline = v;
        this._flagBaseline = true;
    }
    get clip(): boolean {
        return this.#clip;
    }
    set clip(clip: boolean) {
        this.#clip = clip;
        this._flagClip = true;
    }
    get dashes() {
        return this._dashes;
    }
    set dashes(v) {
        if (typeof get_dashes_offset(v) !== 'number') {
            set_dashes_offset(v, (this.dashes && get_dashes_offset(this._dashes)) || 0);
        }
        this._dashes = v;
    }
    get decoration(): TextDecoration[] {
        return this.#decoration.get();
    }
    set decoration(v: TextDecoration[]) {
        this.#decoration.set(v);
    }
    get direction() {
        return this._direction;
    }
    set direction(v) {
        this._direction = v;
        this._flagDirection = true;
    }
    get family(): string {
        return this.#family.value;
    }
    set family(family: string) {
        if (typeof family === 'string') {
            if (this.family !== family) {
                this.#family.next(family);
                this.flags[Flag.Family] = true;
            }
        }
    }
    get fill() {
        return this.#fill;
    }
    set fill(f) {
        if (this.#fill_change) {
            this.#fill_change.dispose();
            this.#fill_change = null;
        }
        this.#fill = f;
        this._flagFill = true;
        if (this.fill instanceof Gradient) {
            this.#fill_change = this.fill.change$.subscribe(() => {
                this._flagFill = true;
            });
        }
        if (this.fill instanceof Texture) {
            this.#fill_change = this.fill.change$.subscribe(() => {
                this._flagFill = true;
            });
        }
    }
    get leading() {
        return this._leading;
    }
    set leading(v) {
        this._leading = v;
        this._flagLeading = true;
    }
    get strokeWidth(): number {
        return this.#stroke_width.get();
    }
    set strokeWidth(strokeWidth: number) {
        if (typeof strokeWidth === 'number') {
            if (this.strokeWidth !== strokeWidth) {
                this.#stroke_width.set(strokeWidth);
                this._flagLinewidth = true;
            }
        }
    }
    get mask(): Shape<Group> | null {
        return this._mask;
    }
    set mask(mask) {
        this._mask = mask;
        this._flagMask = true;
        if (mask instanceof Shape && !mask.clip) {
            mask.clip = true;
        }
    }
    get opacity(): number {
        return this.#opacity.value;
    }
    set opacity(opacity: number) {
        if (typeof opacity === 'number') {
            if (this.opacity !== opacity) {
                this.#opacity.next(opacity);
                this.flags[Flag.Opacity] = true;
            }
        }
    }
    get size(): number {
        return this.#size.value;
    }
    set size(size: number) {
        if (typeof size === 'number') {
            if (this.size !== size) {
                this.#size.next(size);
                this.flags[Flag.Size] = true;
            }
        }
    }
    get stroke() {
        return this._stroke;
    }
    set stroke(f) {
        if (this.#stroke_change) {
            this.#stroke_change.dispose();
            this.#stroke_change = null;
        }
        this._stroke = f;
        this._flagStroke = true;
        if (this.stroke instanceof Gradient) {
            this.#stroke_change = this.stroke.change$.subscribe(() => {
                this._flagStroke = true;
            });
        }
        if (this.stroke instanceof Texture) {
            this.#stroke_change = this.stroke.change$.subscribe(() => {
                this._flagStroke = true;
            });
        }
    }
    get style() {
        return this._style;
    }
    set style(v) {
        this._style = v;
        this._flagStyle = true;
    }
    get value(): string {
        return this.#value.value;
    }
    set value(value: string) {
        if (typeof value === 'string') {
            if (this.value !== value) {
                this.#value.next(value);
                this.flags[Flag.Value] = true;
            }
        }
    }
    get visible(): boolean {
        return this.#visible.value;
    }
    set visible(visible: boolean) {
        if (this.visible !== visible) {
            this.#visible.next(visible);
            this.flags[Flag.Visible] = true;
        }
    }
    get weight() {
        return this._weight;
    }
    set weight(v) {
        this._weight = v;
        this._flagWeight = true;
    }
}

function shape_attributes_from_text_attributes(attributes: Partial<TextAttributes>): Partial<ShapeAttributes> {
    const retval: Partial<ShapeAttributes> = {
        id: attributes.id
    };
    return retval;
}
