import { BehaviorSubject } from 'rxjs';
import { Gradient } from './effects/gradient';
import { LinearGradient } from './effects/linear-gradient';
import { RadialGradient } from './effects/radial-gradient';
import { Texture } from './effects/texture';
import { Flag } from './Flag';
import { Group } from './group';
import { IBoard } from './IBoard';
import { get_dashes_offset, set_dashes_offset } from './path';
import { Observable } from './rxjs/Observable';
import { Subscription } from './rxjs/Subscription';
import { Shape } from './shape';
import { root } from './utils/root';

let canvas: HTMLCanvasElement;
const min = Math.min, max = Math.max;

if (root.document) {
    canvas = document.createElement('canvas');
}

export interface TextStyles {
    alignment: 'center' | 'left' | 'right';
    baseline: 'bottom' | 'middle' | 'top';
    decoration: string;
    direction: 'ltr' | 'rtl';
    family: string;
    fill: string;
    leading: number;
    linewidth: number;
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
    _flagDecoration = true;
    _flagFill = true;
    _flagStroke = true;
    _flagLinewidth = true;
    _flagMask = false;
    _flagClip = false;
    _flagDirection = false;

    readonly #value: BehaviorSubject<string> = new BehaviorSubject('');
    readonly value$: Observable<string> = this.#value.asObservable();

    readonly #family: BehaviorSubject<string> = new BehaviorSubject('sans-serif');
    readonly family$: Observable<string> = this.#family.asObservable();

    readonly #size: BehaviorSubject<number> = new BehaviorSubject(13);
    readonly size$: Observable<number> = this.#size.asObservable();

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
     * The vertical aligment of the text in relation to {@link Two.Text#position}'s coordinates.
     * Possible values include `'top'`, `'middle'`, `'bottom'`, and `'baseline'`. Defaults to `'baseline'`.
     * @nota-bene In headless environments where the canvas is based on {@link https://github.com/Automattic/node-canvas}, `baseline` seems to be the only valid property.
     */
    _baseline: 'bottom' | 'middle' | 'top' = 'middle';

    /**
     * @name Two.Text#style
     * @property {String} - The font's style. Possible values include '`normal`', `'italic'`. Defaults to `'normal'`.
     */
    _style = 'normal';

    /**
     * @name Two.Text#weight
     * @property {Number} - A number at intervals of 100 to describe the font's weight. This compatibility varies with the typeface's variant weights. Larger values are bolder. Smaller values are thinner. Defaults to `'500'`.
     */
    _weight = 500;

    /**
     * @name Two.Text#decoration
     * @property {String} - String to delineate whether text should be decorated with for instance an `'underline'`. Defaults to `'none'`.
     */
    _decoration = 'none';

    /**
     * determine what direction the text should run.
     * Possibly values are `'ltr'` for left-to-right and `'rtl'` for right-to-left. Defaults to `'ltr'`.
     */
    _direction: 'ltr' | 'rtl' = 'ltr';

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    #fill: string | LinearGradient | RadialGradient | Texture = '#000';
    #fill_change_subscription: Subscription | null = null;

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    _stroke: string | LinearGradient | RadialGradient | Texture = 'none';
    #stroke_change_subscription: Subscription | null = null;

    /**
     * @name Two.Text#linewidth
     * @property {Number} - The thickness in pixels of the stroke.
     */
    _linewidth = 1;

    readonly #opacity: BehaviorSubject<number> = new BehaviorSubject(1);
    readonly opacity$: Observable<number> = this.#opacity.asObservable();

    readonly #visible: BehaviorSubject<boolean> = new BehaviorSubject(true) as BehaviorSubject<boolean>;
    readonly visible$: Observable<boolean> = this.#visible.asObservable();

    /**
     * The shape whose alpha property becomes a clipping area for the text.
     * @nota-bene This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    _mask: Shape<Group> | null = null;

    /**
     * @nota-bene This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    #clip = false;

    /**
     * @name Two.Text#_dashes
     * @private
     * @see {@link Two.Text#dashes}
     */
    _dashes: number[] | null = null;

    /**
     * @param message The String to be rendered to the scene.
     * @param x The position in the x direction for the object.
     * @param y The position in the y direction for the object.
     * @param styles An object where styles are applied. Attribute must exist in Two.Text.Properties.
     */
    constructor(board: IBoard, message: string, x: number = 0, y: number = 0, styles: Partial<TextStyles> = {}) {

        super(board);

        this.viewInfo.type = 'text';

        this.value = message;

        if (typeof x === 'number') {
            this.position.x = x;
        }
        if (typeof y === 'number') {
            this.position.y = y;
        }

        /**
         * @name Two.Text#dashes
         * @property {Number[]} - Array of numbers. Odd indices represent dash length. Even indices represent dash space.
         * @description A list of numbers that represent the repeated dash length and dash space applied to the stroke of the text.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray} for more information on the SVG stroke-dasharray attribute.
         */
        this.dashes = [];

        set_dashes_offset(this.dashes, 0);

        for (let i = 0; i < Text.Properties.length; i++) {
            const property = Text.Properties[i];
            if (property in styles) {
                switch (property) {
                    case 'alignment': {
                        this.alignment = styles.alignment;
                        break;
                    }
                    case 'baseline': {
                        this.baseline = styles.baseline;
                        break;
                    }
                    case 'decoration': {
                        this.decoration = styles.decoration;
                        break;
                    }
                    case 'direction': {
                        this.direction = styles.direction;
                        break;
                    }
                    case 'family': {
                        this.family = styles.family;
                        break;
                    }
                    case 'fill': {
                        this.fill = styles.fill;
                        break;
                    }
                    case 'leading': {
                        this.leading = styles.leading;
                        break;
                    }
                    case 'linewidth': {
                        this.linewidth = styles.linewidth;
                        break;
                    }
                    case 'opacity': {
                        this.opacity = styles.opacity;
                        break;
                    }
                    case 'size': {
                        this.size = styles.size;
                        break;
                    }
                    case 'stroke': {
                        this.stroke = styles.stroke;
                        break;
                    }
                    case 'style': {
                        this.style = styles.style;
                        break;
                    }
                    case 'value': {
                        this.value = styles.value;
                        break;
                    }
                    case 'visible': {
                        this.visible = styles.visible;
                        break;
                    }
                    case 'weight': {
                        this.weight = styles.weight;
                        break;
                    }
                    default: {
                        throw new Error(property);
                    }
                }
            }
        }

        this.flagReset(true);
    }

    /**
     * Approximate aspect ratio of a typeface's character width to height.
     */
    static Ratio = 0.6;

    static Properties = [
        'value', 'family', 'size', 'leading', 'alignment', 'linewidth', 'style',
        'weight', 'decoration', 'direction', 'baseline', 'opacity', 'visible',
        'fill', 'stroke'
    ] as const;

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
            const width = text.value.length * text.size * Text.Ratio;
            const height = text.leading;
            // eslint-disable-next-line no-console
            console.warn('Two.Text: unable to accurately measure text, so using an approximation.');
            return {
                width, height
            };
        }
    }

    /**
     * @name Two.Text#noFill
     * @function
     * @description Short hand method to set fill to `none`.
     */
    noFill() {
        this.fill = 'none';
        return this;
    }

    /**
     * @name Two.Text#noStroke
     * @function
     * @description Short hand method to set stroke to `none`.
     */
    noStroke() {
        this.stroke = 'none';
        this.linewidth = 0;
        return this;
    }

    // A shim to not break `getBoundingClientRect` calls.
    // TODO: Implement a way to calculate proper bounding
    // boxes of `Two.Text`.

    /**
     * @name Two.Text#getBoundingClientRect
     * @function
     * @param {Boolean} [shallow=false] - Describes whether to calculate off local matrix or world matrix.
     * @returns {Object} - Returns object with top, left, right, bottom, width, height attributes.
     * @description Return an object with top, left, right, bottom, width, and height parameters of the text object.
     */
    getBoundingClientRect(shallow = false) {

        let left: number;
        let right: number;
        let top: number;
        let bottom: number;

        // TODO: Update this to not __always__ update. Just when it needs to.
        this.update(true);

        const matrix = shallow ? this.matrix : this.worldMatrix;

        const { width, height } = Text.Measure(this);
        const border = (this._linewidth || 0) / 2;

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
        this._flagDecoration = dirtyFlag;
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
    get decoration() {
        return this._decoration;
    }
    set decoration(v) {
        this._decoration = v;
        this._flagDecoration = true;
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
        if (this.#fill_change_subscription) {
            this.#fill_change_subscription.unsubscribe();
            this.#fill_change_subscription = null;
        }
        this.#fill = f;
        this._flagFill = true;
        if (this.fill instanceof Gradient) {
            this.#fill_change_subscription = this.fill.change$.subscribe(() => {
                this._flagFill = true;
            });
        }
        if (this.fill instanceof Texture) {
            this.#fill_change_subscription = this.fill.change$.subscribe(() => {
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
    get linewidth() {
        return this._linewidth;
    }
    set linewidth(v) {
        this._linewidth = v;
        this._flagLinewidth = true;
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
        if (this.#stroke_change_subscription) {
            this.#stroke_change_subscription.unsubscribe();
            this.#stroke_change_subscription = null;
        }
        this._stroke = f;
        this._flagStroke = true;
        if (this.stroke instanceof Gradient) {
            this.#stroke_change_subscription = this.stroke.change$.subscribe(() => {
                this._flagStroke = true;
            });
        }
        if (this.stroke instanceof Texture) {
            this.#stroke_change_subscription = this.stroke.change$.subscribe(() => {
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
