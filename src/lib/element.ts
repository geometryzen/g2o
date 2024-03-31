import { Observable, Subject } from 'rxjs';
import { Child } from './children.js';
import { View } from './renderers/View.js';

export interface Parent {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // children: Children<Parent, Child<Parent>>
    // children: unknown;
}

/**
 * The foundational object for the scenegraph.
 */
export abstract class Element<P extends Parent> implements Child {
    /**
     * Gradient, Shape, Stop, and Texture all extend Element.
     */
    isShape: boolean;
    /**
     * 
     */
    parent: P;
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
    _id: string | null = null;
    readonly #id: Subject<{ id: string, previous_id: string | null }>;
    readonly id$: Observable<{ id: string, previous_id: string | null }>;

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
        this.#id = new Subject();
        this.id$ = this.#id.asObservable();
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
    set renderer(renderer: View) {
        this._renderer = renderer;
    }
    get id(): string {
        return this._id;
    }
    set id(id: string) {
        const previous_id = this.id;
        if (id === previous_id) {
            return;
        }
        this._id = id;
        this._flagId = true;
        this.#id.next({ id, previous_id });
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
