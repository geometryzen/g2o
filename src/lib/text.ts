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

const min = Math.min, max = Math.max;

export type TextDecoration = 'none' | 'underline' | 'overline' | 'line-through';

export interface TextAttributes {
    anchor: 'start' | 'middle' | 'end';
    dominantBaseline: 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top';
    decoration: TextDecoration[];
    direction: 'ltr' | 'rtl';
    dx: number | string;
    dy: number | string;
    fontFamily: string;
    fill: string | LinearGradient | RadialGradient | Texture;
    id: string;
    strokeWidth: number;
    opacity: number;
    fontSize: number;
    stroke: string | LinearGradient | RadialGradient | Texture;
    fontStyle: 'normal' | 'italic' | 'oblique';
    value: string;
    visibility: 'visible' | 'hidden' | 'collapse';
    fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
}

export class Text extends Shape<Group> implements TextAttributes {
    automatic: boolean;
    beginning: number;
    cap: 'butt' | 'round' | 'square';
    closed: boolean;
    curved: boolean;
    ending: number;
    join: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
    length: number;
    miter: number;

    /**
     * @deprecated
     */
    _flagFill = true;
    /**
     * @deprecated
     */
    _flagStroke = true;
    /**
     * @deprecated
     */
    _flagMask = false;
    /**
     * @deprecated
     */
    _flagClip = false;

    readonly #value: BehaviorSubject<string> = new BehaviorSubject('');
    readonly value$: Observable<string> = new DisposableObservable(this.#value.asObservable());

    readonly #fontFamily: BehaviorSubject<string> = new BehaviorSubject('sans-serif');
    readonly fontFamily$: Observable<string> = new DisposableObservable(this.#fontFamily.asObservable());

    readonly #fontSize: BehaviorSubject<number> = new BehaviorSubject(13);
    readonly fontSize$: Observable<number> = new DisposableObservable(this.#fontSize.asObservable());

    readonly #anchor = new Signal.State('start' as 'start' | 'middle' | 'end');

    readonly #dominant_baseline = new Signal.State('auto' as 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top');

    readonly #fontStyle = new Signal.State('normal' as 'normal' | 'italic' | 'oblique');

    readonly #fontWeight = new Signal.State('normal' as 'normal' | 'bold' | 'bolder' | 'lighter' | number);

    readonly #decoration: Signal.State<TextDecoration[]> = new Signal.State(['none' as TextDecoration]);

    /**
     * determine what direction the text should run.
     * Possibly values are `'ltr'` for left-to-right and `'rtl'` for right-to-left. Defaults to `'ltr'`.
     */
    readonly #direction = new Signal.State('ltr' as 'ltr' | 'rtl');

    readonly #dx = new Signal.State(0 as number | string);
    readonly #dy = new Signal.State(0 as number | string);

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    #fill: string | LinearGradient | RadialGradient | Texture = '#000';
    #fill_change: Disposable | null = null;

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    #stroke: string | LinearGradient | RadialGradient | Texture = 'none';
    #stroke_change: Disposable | null = null;

    readonly #stroke_width = new Signal.State(1);

    /**
     * The shape whose alpha property becomes a clipping area for the text.
     * This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    #mask: Shape<Group> | null = null;

    /**
     * This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    #clip = false;

    #dashes: number[] | null = null;

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

        if (attributes.anchor) {
            this.anchor = attributes.anchor;
        }
        if (attributes.dominantBaseline) {
            this.dominantBaseline = attributes.dominantBaseline;
        }
        if (attributes.decoration) {
            this.decoration = attributes.decoration;
        }
        if (attributes.direction) {
            this.direction = attributes.direction;
        }
        if (typeof attributes.dx === 'number' || typeof attributes.dx === 'string') {
            this.dx = attributes.dx;
        }
        if (typeof attributes.dy === 'number' || typeof attributes.dy === 'string') {
            this.dy = attributes.dy;
        }
        if (attributes.fontFamily) {
            this.fontFamily = attributes.fontFamily;
        }
        if (attributes.fill) {
            this.fill = attributes.fill;
        }
        if (attributes.strokeWidth) {
            this.strokeWidth = attributes.strokeWidth;
        }
        if (attributes.opacity) {
            this.opacity = attributes.opacity;
        }
        if (attributes.fontSize) {
            this.fontSize = attributes.fontSize;
        }
        if (attributes.stroke) {
            this.stroke = attributes.stroke;
        }
        if (attributes.fontStyle) {
            this.fontStyle = attributes.fontStyle;
        }
        if (attributes.value) {
            this.value = attributes.value;
        }
        if (typeof attributes.visibility === 'string') {
            this.visibility = attributes.visibility;
        }
        if (attributes.fontWeight) {
            this.fontWeight = attributes.fontWeight;
        }

        this.flagReset(true);
    }

    static Measure(text: Text): { width: number; height: number } {
        // 0.6 is approximate aspect ratio of a typeface's character width to height.
        const width = text.value.length * text.fontSize * 0.6;
        const height = text.fontSize;
        // eslint-disable-next-line no-console
        console.warn('Two.Text: unable to accurately measure text, so using an approximation.');
        return {
            width, height
        };
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

        switch (this.anchor) {
            case 'start': {
                left = - border;
                right = width + border;
                break;
            }
            case 'middle': {
                left = - (width / 2 + border);
                right = width / 2 + border;
                break;
            }
            case 'end': {
                left = - (width + border);
                right = border;
                break;
            }
        }

        switch (this.dominantBaseline) {
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
        this.flags[Flag.Size] = dirtyFlag;
        this._flagFill = dirtyFlag;
        this._flagStroke = dirtyFlag;
        this._flagClip = dirtyFlag;
        this.flags[Flag.ClassName] = dirtyFlag;
        return this;
    }
    get anchor(): 'start' | 'middle' | 'end' {
        return this.#anchor.get();
    }
    set anchor(anchor: 'start' | 'middle' | 'end') {
        if (typeof anchor === 'string') {
            switch (anchor) {
                case 'start':
                case 'middle':
                case 'end': {
                    this.#anchor.set(anchor);
                    break;
                }
            }
        }
    }
    get dominantBaseline(): 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top' {
        return this.#dominant_baseline.get();
    }
    set dominantBaseline(dominantBaseline: 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top') {
        if (typeof dominantBaseline === 'string') {
            switch (dominantBaseline) {
                case 'alphabetic':
                case 'auto':
                case 'central':
                case 'hanging':
                case 'ideographic':
                case 'mathematical':
                case 'middle':
                case 'text-bottom':
                case 'text-top': {
                    this.#dominant_baseline.set(dominantBaseline);
                }
            }
        }
    }
    get clip(): boolean {
        return this.#clip;
    }
    set clip(clip: boolean) {
        this.#clip = clip;
        this._flagClip = true;
    }
    get dashes() {
        return this.#dashes;
    }
    set dashes(v) {
        if (typeof get_dashes_offset(v) !== 'number') {
            set_dashes_offset(v, (this.dashes && get_dashes_offset(this.#dashes)) || 0);
        }
        this.#dashes = v;
    }
    get decoration(): TextDecoration[] {
        return this.#decoration.get();
    }
    set decoration(v: TextDecoration[]) {
        this.#decoration.set(v);
    }
    get direction(): 'ltr' | 'rtl' {
        return this.#direction.get();
    }
    set direction(direction: 'ltr' | 'rtl') {
        if (typeof direction === 'string') {
            if (direction === 'ltr' || direction === 'rtl') {
                if (this.direction !== direction) {
                    this.#direction.set(direction);
                }
            }
        }
    }
    get dx(): number | string {
        return this.#dx.get();
    }
    set dx(dx: number | string) {
        if (typeof dx === 'number' || typeof dx === 'string') {
            if (this.dx !== dx) {
                this.#dx.set(dx);
            }
        }
    }
    get dy(): number | string {
        return this.#dy.get();
    }
    set dy(dy: number | string) {
        if (typeof dy === 'number' || typeof dy === 'string') {
            if (this.dy !== dy) {
                this.#dy.set(dy);
            }
        }
    }
    get fontFamily(): string {
        return this.#fontFamily.value;
    }
    set fontFamily(family: string) {
        if (typeof family === 'string') {
            if (this.fontFamily !== family) {
                this.#fontFamily.next(family);
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
    get strokeWidth(): number {
        return this.#stroke_width.get();
    }
    set strokeWidth(strokeWidth: number) {
        if (typeof strokeWidth === 'number') {
            if (this.strokeWidth !== strokeWidth) {
                this.#stroke_width.set(strokeWidth);
            }
        }
    }
    get mask(): Shape<Group> | null {
        return this.#mask;
    }
    set mask(mask) {
        this.#mask = mask;
        this._flagMask = true;
        if (mask instanceof Shape && !mask.clip) {
            mask.clip = true;
        }
    }
    get fontSize(): number {
        return this.#fontSize.value;
    }
    set fontSize(size: number) {
        if (typeof size === 'number') {
            if (this.fontSize !== size) {
                this.#fontSize.next(size);
                this.flags[Flag.Size] = true;
            }
        }
    }
    get stroke() {
        return this.#stroke;
    }
    set stroke(f) {
        if (this.#stroke_change) {
            this.#stroke_change.dispose();
            this.#stroke_change = null;
        }
        this.#stroke = f;
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
    get fontStyle(): 'normal' | 'italic' | 'oblique' {
        return this.#fontStyle.get();
    }
    set fontStyle(fontStyle: 'normal' | 'italic' | 'oblique') {
        if (typeof fontStyle === 'string') {
            this.#fontStyle.set(fontStyle);
        }
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
    get fontWeight() {
        return this.#fontWeight.get();
    }
    set fontWeight(fontWeight) {
        this.#fontWeight.set(fontWeight);
    }
}

function shape_attributes_from_text_attributes(attributes: Partial<TextAttributes>): Partial<ShapeAttributes> {
    const retval: Partial<ShapeAttributes> = {
        id: attributes.id
    };
    return retval;
}
