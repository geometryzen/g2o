import { effect, state } from '@geometryzen/reactive';
import { Color, is_color_provider, serialize_color } from './effects/ColorProvider';
import { Flag } from './Flag';
import { Group } from './group';
import { IBoard } from './IBoard';
import { compose_2d_3x3_transform } from './math/compose_2d_3x3_transform';
import { get_dashes_offset, set_dashes_offset } from './path';
import { Disposable } from './reactive/Disposable';
import { Observable } from './reactive/Observable';
import { variable } from './reactive/variable';
import { get_dom_element_defs, set_defs_flag_update, svg, SVGAttributes, transform_value_of_matrix } from './renderers/SVGView';
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
    fill: Color;
    id: string;
    strokeWidth: number;
    opacity: number;
    fontSize: number;
    stroke: Color;
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

    readonly #value = state('');

    readonly #fontFamily = variable('sans-serif');
    readonly fontFamily$: Observable<string> = this.#fontFamily.asObservable();

    readonly #fontSize = variable(13);
    readonly fontSize$: Observable<number> = this.#fontSize.asObservable();

    readonly #anchor = state('start' as 'start' | 'middle' | 'end');

    readonly #dominant_baseline = state('auto' as 'auto' | 'text-bottom' | 'alphabetic' | 'ideographic' | 'middle' | 'central' | 'mathematical' | 'hanging' | 'text-top');

    readonly #fontStyle = state('normal' as 'normal' | 'italic' | 'oblique');

    readonly #fontWeight = state('normal' as 'normal' | 'bold' | 'bolder' | 'lighter' | number);

    readonly #decoration = state(['none' as TextDecoration]);

    /**
     * determine what direction the text should run.
     * Possibly values are `'ltr'` for left-to-right and `'rtl'` for right-to-left. Defaults to `'ltr'`.
     */
    readonly #direction = state('ltr' as 'ltr' | 'rtl');

    readonly #dx = state(0 as number | string);
    readonly #dy = state(0 as number | string);

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    #fill: Color = '#000';
    #fill_change: Disposable | null = null;

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    #stroke: Color = 'none';
    #stroke_change: Disposable | null = null;

    readonly #stroke_width = state(1);

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

    render(domElement: HTMLElement | SVGElement, svgElement: SVGElement): void {

        this.update();

        // The styles that will be applied to an SVG
        const changed: SVGAttributes = {};

        const flagMatrix = this.matrix.manual || this.flags[Flag.Matrix];

        if (flagMatrix) {
            update_text_matrix(this);
            changed.transform = transform_value_of_matrix(this.matrix);
        }

        if (this.flags[Flag.Size]) {
            changed['font-size'] = `${this.fontSize}`;
        }
        {
            const fill = this.fill;
            if (fill) {
                if (is_color_provider(fill)) {
                    this.zzz.hasFillEffect = true;
                    fill.render(svgElement);
                }
                else {
                    changed.fill = serialize_color(fill);
                    if (this.zzz.hasFillEffect) {
                        set_defs_flag_update(get_dom_element_defs(svgElement), true);
                        delete this.zzz.hasFillEffect;
                    }
                }
            }
        }
        {
            const stroke = this.stroke;
            if (stroke) {
                if (is_color_provider(stroke)) {
                    this.zzz.hasStrokeEffect = true;
                    stroke.render(svgElement);
                }
                else {
                    changed.stroke = serialize_color(stroke);
                    if (this.zzz.hasStrokeEffect) {
                        set_defs_flag_update(get_dom_element_defs(svgElement), true);
                        delete this.zzz.hasFillEffect;
                    }
                }
            }
        }
        if (this.flags[Flag.ClassName]) {
            changed['class'] = this.classList.join(' ');
        }
        if (this.dashes && this.dashes.length > 0) {
            changed['stroke-dasharray'] = this.dashes.join(' ');
            changed['stroke-dashoffset'] = `${get_dashes_offset(this.dashes) || 0}`;
        }

        if (this.zzz.elem) {
            svg.setAttributes(this.zzz.elem, changed);
        }
        else {
            changed.id = this.id;
            this.zzz.elem = svg.createElement('text', changed);
            domElement.appendChild(this.zzz.elem);

            this.zzz.disposables.push(effect(() => {
                update_text_matrix(this);
                const change: SVGAttributes = {};
                change.transform = transform_value_of_matrix(this.matrix);
                svg.setAttributes(this.zzz.elem, change);
                return function () {
                    // Nothing to do here...
                };
            }));

            // anchor
            this.zzz.disposables.push(effect(() => {
                const anchor = this.anchor;
                switch (anchor) {
                    case 'start': {
                        svg.removeAttributes(this.zzz.elem, { 'text-anchor': anchor });
                        break;
                    }
                    case 'middle':
                    case 'end': {
                        svg.setAttributes(this.zzz.elem, { 'text-anchor': anchor });
                        break;
                    }
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // decoration
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = {};
                change['text-decoration'] = this.decoration.join(' ');
                svg.setAttributes(this.zzz.elem, change);
                return function () {
                    // No cleanup to be done.
                };
            }));

            // direction
            this.zzz.disposables.push(effect(() => {
                const direction = this.direction;
                if (direction === 'rtl') {
                    svg.setAttributes(this.zzz.elem, { direction });
                }
                else {
                    svg.removeAttributes(this.zzz.elem, { direction });
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // dominant-baseline
            this.zzz.disposables.push(effect(() => {
                const dominantBaseline = this.dominantBaseline;
                switch (dominantBaseline) {
                    case 'auto': {
                        svg.removeAttributes(this.zzz.elem, { 'dominant-baseline': dominantBaseline });
                        break;
                    }
                    default: {
                        svg.setAttributes(this.zzz.elem, { 'dominant-baseline': dominantBaseline });
                        break;
                    }
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // dx
            this.zzz.disposables.push(effect(() => {
                const dx = this.dx;
                if (typeof dx === 'number' && dx === 0) {
                    svg.removeAttributes(this.zzz.elem, { dx: "" });
                }
                else {
                    svg.setAttributes(this.zzz.elem, { dx: `${dx}` });
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // dy
            this.zzz.disposables.push(effect(() => {
                const dy = this.dy;
                if (typeof dy === 'number' && dy === 0) {
                    svg.removeAttributes(this.zzz.elem, { dy: "" });
                }
                else {
                    svg.setAttributes(this.zzz.elem, { dy: `${dy}` });
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // font-family
            this.zzz.disposables.push(this.fontFamily$.subscribe((family) => {
                svg.setAttributes(this.zzz.elem, { 'font-family': family });
            }));

            // font-size
            this.zzz.disposables.push(this.fontSize$.subscribe((size) => {
                svg.setAttributes(this.zzz.elem, { 'font-size': `${size}` });
            }));

            // font-style
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = { 'font-style': this.fontStyle };
                if (change['font-style'] === 'normal') {
                    svg.removeAttributes(this.zzz.elem, change);
                }
                else {
                    svg.setAttributes(this.zzz.elem, change);
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // font-weight
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = { 'font-weight': `${this.fontWeight}` };
                if (change['font-weight'] === 'normal') {
                    svg.removeAttributes(this.zzz.elem, change);
                }
                else {
                    svg.setAttributes(this.zzz.elem, change);
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // opacity
            this.zzz.disposables.push(effect(() => {
                const opacity = this.opacity;
                const change: SVGAttributes = { opacity: `${opacity}` };
                if (opacity === 1) {
                    svg.removeAttributes(this.zzz.elem, change);
                }
                else {
                    svg.setAttributes(this.zzz.elem, change);
                }
                return function () {
                    // No cleanup to be done.
                };
            }));

            // stroke-width
            this.zzz.disposables.push(effect(() => {
                const change: SVGAttributes = {};
                change['stroke-width'] = `${this.strokeWidth}`;
                svg.setAttributes(this.zzz.elem, change);
                return function () {
                    // No cleanup to be done.
                };
            }));

            // textContent
            this.zzz.disposables.push(effect(() => {
                this.zzz.elem.textContent = this.value;
            }));

            // visibility
            this.zzz.disposables.push(effect(() => {
                const visibility = this.visibility;
                switch (visibility) {
                    case 'visible': {
                        const change: SVGAttributes = { visibility };
                        svg.removeAttributes(this.zzz.elem, change);
                        break;
                    }
                    default: {
                        const change: SVGAttributes = { visibility };
                        svg.setAttributes(this.zzz.elem, change);
                        break;
                    }
                }
                return function () {
                    // No cleanup to be done.
                };
            }));
        }

        if (this._flagClip) {
            const clip = svg.getClip(this, svgElement);
            const elem = this.zzz.elem;

            if (this.clip) {
                elem.removeAttribute('id');
                clip.setAttribute('id', this.id);
                clip.appendChild(elem);
            }
            else {
                clip.removeAttribute('id');
                elem.setAttribute('id', this.id);
                this.parent.zzz.elem.appendChild(elem); // TODO: should be insertBefore
            }
        }

        // Commented two-way functionality of clips / masks with groups and
        // polygons. Uncomment when this bug is fixed:
        // https://code.google.com/p/chromium/issues/detail?id=370951

        if (this._flagMask) {
            if (this.mask) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                // (svg as any)[this.mask.zzz.type].render.call(this.mask, domElement);
                this.zzz.elem.setAttribute('clip-path', 'url(#' + this.mask.id + ')');
                throw new Error("TODO");
            }
            else {
                this.zzz.elem.removeAttribute('clip-path');
            }
        }

        this.flagReset();
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

    getBoundingBox(shallow = false): { top: number; left: number; right: number; bottom: number; } {

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

        return { top, left, right, bottom };
    }

    hasBoundingBox(): boolean {
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subdivide(limit: number): this {
        throw new Error('Method not implemented.');
    }

    override flagReset(dirtyFlag = false) {
        super.flagReset(dirtyFlag);
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
        return this.#fontFamily.get();
    }
    set fontFamily(family: string) {
        if (typeof family === 'string') {
            if (this.fontFamily !== family) {
                this.#fontFamily.set(family);
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
        if (is_color_provider(this.fill)) {
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
        return this.#fontSize.get();
    }
    set fontSize(size: number) {
        if (typeof size === 'number') {
            if (this.fontSize !== size) {
                this.#fontSize.set(size);
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
        if (is_color_provider(this.stroke)) {
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
        return this.#value.get();
    }
    set value(value: string) {
        if (typeof value === 'string') {
            if (this.value !== value) {
                this.#value.set(value);
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

function update_text_matrix(text: Text) {
    // Text and Images, unlike Path(s), are not compensated (yet) for the 90 degree rotation that makes the  
    const goofy = text.board.goofy;
    const position = text.position;
    const x = position.x;
    const y = position.y;
    const attitude = text.attitude;
    const scale = text.scaleXY;
    const sx = scale.x;
    const sy = scale.y;
    if (goofy) {
        const cos_φ = attitude.a;
        const sin_φ = attitude.b;
        compose_2d_3x3_transform(x, y, sx, sy, cos_φ, sin_φ, text.skewX, text.skewY, text.matrix);
    }
    else {
        // Text needs an additional rotation of -π/2 (i.e. clockwise 90 degrees) to compensate for 
        // the use of a right-handed coordinate frame. The rotor for this is cos(π/4)+sin(π/4)*I.
        // Here we compute the effective rotator (which is obtained by multiplying the two rotors),
        // and use that to compose the transformation matrix.
        const a = attitude.a;
        const b = attitude.b;
        const cos_φ = (a - b) / Math.SQRT2;
        const sin_φ = (a + b) / Math.SQRT2;
        compose_2d_3x3_transform(y, x, sy, sx, cos_φ, sin_φ, text.skewY, text.skewX, text.matrix);
    }
}
