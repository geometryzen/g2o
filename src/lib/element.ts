import { Events } from './events.js';
import { View } from './renderers/View.js';

/**
 * The foundational object for the scenegraph.
 */
export class Element extends Events {

    /**
     * @name Two.Element#_flagId
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Element#id} needs updating.
     */
    _flagId = false;

    /**
     * @name Two.Element#_flagClassName
     * @private
     * @property {Boolean} - Determines whether the {@link Two.Group#className} need updating.
     */
    _flagClassName = false;

    /**
     * @name Two.Element#renderer
     * @property {Object} - Object access to store relevant renderer specific variables. Warning: manipulating this object can create unintended consequences.
     * @nota-bene With the {@link Two.SVGRenderer} you can access the underlying SVG element created via `shape.renderer.elem`.
     */
    _renderer: View = {} as View;

    /**
     * @name Two.Element#id
     * @property {String} - Session specific unique identifier.
     * @nota-bene In the {@link Two.SVGRenderer} change this to change the underlying SVG element's id too.
     */
    #id = '';

    /**
     * @name Two.Element#className
     * @property {String} - A class to be applied to the element to be compatible with CSS styling.
     * @nota-bene Only available for the SVG renderer.
     */
    _className = '';

    /**
     * @name Two.Element#classList
     * @property {String[]}
     * @description A list of class strings stored if imported / interpreted  from an SVG element.
     */
    classList: string[] = [];

    constructor() {
        super();
    }

    /**
     * @name Two.Element#flagReset
     * @function
     * @description Called internally by Two.js's renderer to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {
        this._flagId = this._flagClassName = false;
    }
    get renderer(): View {
        return this._renderer;
    }
    get id(): string {
        return this.#id;
    }
    set id(v: string) {
        const id = this.#id;
        if (v === this.#id) {
            return;
        }
        this.#id = v;
        this._flagId = true;
        if (this.parent) {
            delete this.parent.children.ids[id];
            this.parent.children.ids[this.#id] = this;
        }
    }
    get className(): string {
        return this._className;
    }
    set className(v: string) {
        if (this._className !== v) {
            this._flagClassName = true;
            this.classList = v.split(/\s+?/);
            this._className = v;
        }
    }
}
