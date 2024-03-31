import { Gradient } from './effects/gradient.js';
import { LinearGradient } from './effects/linear-gradient.js';
import { RadialGradient } from './effects/radial-gradient.js';
import { Texture } from './effects/texture.js';
import { Events } from './events.js';
import { get_dashes_offset, set_dashes_offset } from './path.js';
import { Shape } from './shape.js';
import { root } from './utils/root.js';
import { _ } from './utils/underscore.js';

let canvas: HTMLCanvasElement;
const min = Math.min, max = Math.max;

if (root.document) {
    canvas = document.createElement('canvas');
}

/**
 * @name Two.Text
 * @class
 * @extends Two.Shape
 * @param {String} [message] - The String to be rendered to the scene.
 * @param {Number} [x=0] - The position in the x direction for the object.
 * @param {Number} [y=0] - The position in the y direction for the object.
 * @param {Object} [styles] - An object where styles are applied. Attribute must exist in Two.Text.Properties.
 * @description This is a primitive class for creating drawable text that can be added to the scenegraph.
 * @returns {Two.Text}
 */
export class Text extends Shape {

    /**
     * @name Two.Text#_flagValue
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#value} need updating.
     */
    _flagValue = true;

    /**
     * @name Two.Text#_flagFamily
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#family} need updating.
     */
    _flagFamily = true;

    /**
     * @name Two.Text#_flagSize
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#size} need updating.
     */
    _flagSize = true;

    /**
     * @name Two.Text#_flagLeading
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#leading} need updating.
     */
    _flagLeading = true;

    /**
     * @name Two.Text#_flagAlignment
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#alignment} need updating.
     */
    _flagAlignment = true;

    /**
     * @name Two.Text#_flagBaseline
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#baseline} need updating.
     */
    _flagBaseline = true;

    /**
     * @name Two.Text#_flagStyle
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#style} need updating.
     */
    _flagStyle = true;

    /**
     * @name Two.Text#_flagWeight
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#weight} need updating.
     */
    _flagWeight = true;

    /**
     * @name Two.Text#_flagDecoration
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#decoration} need updating.
     */
    _flagDecoration = true;

    /**
     * @name Two.Text#_flagFill
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#fill} need updating.
     */
    _flagFill = true;

    /**
     * @name Two.Text#_flagStroke
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#stroke} need updating.
     */
    _flagStroke = true;

    /**
     * @name Two.Text#_flagLinewidth
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#linewidth} need updating.
     */
    _flagLinewidth = true;

    /**
     * @name Two.Text#_flagOpacity
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#opacity} need updating.
     */
    _flagOpacity = true;

    /**
     * @name Two.Text#_flagVisible
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#visible} need updating.
     */
    _flagVisible = true;

    /**
     * @name Two.Path#_flagMask
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Path#mask} needs updating.
     */
    _flagMask = false;

    /**
     * @name Two.Text#_flagClip
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#clip} needs updating.
     */
    _flagClip = false;

    /**
     * @name Two.Text#_flagDirection
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Text#direction} needs updating.
     */
    _flagDirection = false;

    // Underlying Properties

    /**
     * @name Two.Text#value
     * @property {String} - The characters to be rendered to the the screen. Referred to in the documentation sometimes as the `message`.
     */
    _value = '';

    /**
     * @name Two.Text#family
     * @property {String} - The font family Two.js should attempt to register for rendering. The default value is `'sans-serif'`. Comma separated font names can be supplied as a "stack", similar to the CSS implementation of `font-family`.
     */
    _family = 'sans-serif';

    /**
     * @name Two.Text#size
     * @property {Number} - The font size in Two.js point space. Defaults to `13`.
     */
    _size = 13;

    /**
     * @name Two.Text#leading
     * @property {Number} - The height between lines measured from base to base in Two.js point space. Defaults to `17`.
     */
    _leading = 17;

    /**
     * Alignment of text in relation to {@link Text#translation}'s coordinates.
     * Possible values include `'left'`, `'center'`, `'right'`. Defaults to `'center'`.
     */
    _alignment: 'center' | 'left' | 'right' = 'center';

    /**
     * @name Two.Text#baseline
     * @property {String} - The vertical aligment of the text in relation to {@link Two.Text#translation}'s coordinates. Possible values include `'top'`, `'middle'`, `'bottom'`, and `'baseline'`. Defaults to `'baseline'`.
     * @nota-bene In headless environments where the canvas is based on {@link https://github.com/Automattic/node-canvas}, `baseline` seems to be the only valid property.
     */
    _baseline = 'middle';

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
     * @name Two.Text#direction
     * @property {String} - String to determine what direction the text should run. Possibly values are `'ltr'` for left-to-right and `'rtl'` for right-to-left. Defaults to `'ltr'`.
     */
    _direction = 'ltr';

    /**
     * @name Two.Text#fill
     * @property {(String|Two.Gradient|Two.Texture)} - The value of what the text object should be filled in with.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    _fill: string | Gradient | Texture = '#000';

    /**
     * @name Two.Text#stroke
     * @property {(String|Two.Gradient|Two.Texture)} - The value of what the text object should be filled in with.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value} for more information on CSS's colors as `String`.
     */
    _stroke: string | Gradient | Texture = 'none';

    /**
     * @name Two.Text#linewidth
     * @property {Number} - The thickness in pixels of the stroke.
     */
    _linewidth = 1;

    /**
     * @name Two.Text#opacity
     * @property {Number} - The opaqueness of the text object.
     * @nota-bene Can be used in conjunction with CSS Colors that have an alpha value.
     */
    _opacity = 1;

    /**
     * @name Two.Text#visible
     * @property {Boolean} - Display the text object or not.
     * @nota-bene For {@link Two.CanvasRenderer} and {@link Two.WebGLRenderer} when set to false all updating is disabled improving performance dramatically with many objects in the scene.
     */
    _visible = true;

    /**
     * @name Two.Text#mask
     * @property {Two.Shape} - The shape whose alpha property becomes a clipping area for the text.
     * @nota-bene This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    _mask: Shape = null;

    /**
     * @name Two.Text#clip
     * @property {Two.Shape} - Object to define clipping area.
     * @nota-bene This property is currently not working because of SVG spec issues found here {@link https://code.google.com/p/chromium/issues/detail?id=370951}.
     */
    _clip = false;

    /**
     * @name Two.Text#_dashes
     * @private
     * @see {@link Two.Text#dashes}
     */
    _dashes: number[] | null = null;

    constructor(message: string, x: number = 0, y: number = 0, styles?: object) {

        super();

        this._renderer.type = 'text';
        this._renderer.flagFill = FlagFill.bind(this);
        this._renderer.flagStroke = FlagStroke.bind(this);

        this.value = message;

        if (typeof x === 'number') {
            this.translation.x = x;
        }
        if (typeof y === 'number') {
            this.translation.y = y;
        }

        /**
         * @name Two.Text#dashes
         * @property {Number[]} - Array of numbers. Odd indices represent dash length. Even indices represent dash space.
         * @description A list of numbers that represent the repeated dash length and dash space applied to the stroke of the text.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray} for more information on the SVG stroke-dasharray attribute.
         */
        this.dashes = [];

        set_dashes_offset(this.dashes, 0);

        if (!_.isObject(styles)) {
            return this;
        }

        for (let i = 0; i < Text.Properties.length; i++) {
            const property = Text.Properties[i];
            if (property in styles) {
                this[property] = styles[property];
            }
        }

    }

    /**
     * @name Two.Text.Ratio
     * @property {Number} - Approximate aspect ratio of a typeface's character width to height.
     */
    static Ratio = 0.6;

    /**
     * @name Two.Text.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Text}.
     */
    static Properties = [
        'value', 'family', 'size', 'leading', 'alignment', 'linewidth', 'style',
        'weight', 'decoration', 'direction', 'baseline', 'opacity', 'visible',
        'fill', 'stroke'
    ];

    static Measure(text: Text): { width: number; height: number } {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.font = [text._style, text._weight, `${text._size}px/${text._leading}px`,
            text._family].join(' ');
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
        this._update(true);

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

    flagReset() {
        super.flagReset.call(this);
        this._flagValue = this._flagFamily = this._flagSize =
            this._flagLeading = this._flagAlignment = this._flagFill =
            this._flagStroke = this._flagLinewidth = this._flagOpacity =
            this._flagVisible = this._flagClip = this._flagDecoration =
            this._flagClassName = this._flagBaseline = this._flagWeight =
            this._flagStyle = this._flagDirection = false;
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
    get clip() {
        return this._clip;
    }
    set clip(v) {
        this._clip = v;
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
    get family() {
        return this._family;
    }
    set family(v) {
        this._family = v;
        this._flagFamily = true;
    }
    get fill() {
        return this._fill;
    }
    set fill(f) {
        if (this._fill instanceof Gradient
            || this._fill instanceof LinearGradient
            || this._fill instanceof RadialGradient
            || this._fill instanceof Texture) {
            this._fill.unbind(Events.Types.change, this._renderer.flagFill);
        }
        this._fill = f;
        this._flagFill = true;
        if (this._fill instanceof Gradient
            || this._fill instanceof LinearGradient
            || this._fill instanceof RadialGradient
            || this._fill instanceof Texture) {
            this._fill.bind(Events.Types.change, this._renderer.flagFill);
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
    get mask() {
        return this._mask;
    }
    set mask(v) {
        this._mask = v;
        this._flagMask = true;
        if (_.isObject(v) && !v.clip) {
            v.clip = true;
        }
    }
    get opacity() {
        return this._opacity;
    }
    set opacity(v) {
        this._opacity = v;
        this._flagOpacity = true;
    }
    get size() {
        return this._size;
    }
    set size(v) {
        this._size = v;
        this._flagSize = true;
    }
    get stroke() {
        return this._stroke;
    }
    set stroke(f) {

        if (this._stroke instanceof Gradient
            || this._stroke instanceof LinearGradient
            || this._stroke instanceof RadialGradient
            || this._stroke instanceof Texture) {
            this._stroke.unbind(Events.Types.change, this._renderer.flagStroke);
        }

        this._stroke = f;
        this._flagStroke = true;

        if (this._stroke instanceof Gradient
            || this._stroke instanceof LinearGradient
            || this._stroke instanceof RadialGradient
            || this._stroke instanceof Texture) {
            this._stroke.bind(Events.Types.change, this._renderer.flagStroke);
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
        return this._value;
    }
    set value(v: string) {
        this._value = v;
        this._flagValue = true;
    }
    get visible() {
        return this._visible;
    }
    set visible(v) {
        this._visible = v;
        this._flagVisible = true;
    }
    get weight() {
        return this._weight;
    }
    set weight(v) {
        this._weight = v;
        this._flagWeight = true;
    }
}

/**
 * @name Two.Text.FlagFill
 * @function
 * @private
 * @description Cached method to let renderers know the fill property have been updated on a {@link Two.Text}.
 */
function FlagFill() {
    this._flagFill = true;
}

/**
 * @name Two.Text.FlagStroke
 * @function
 * @private
 * @description Cached method to let renderers know the stroke property have been updated on a {@link Two.Text}.
 */
function FlagStroke() {
    this._flagStroke = true;
}
