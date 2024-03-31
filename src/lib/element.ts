import { Observable, Subject } from 'rxjs';
import { Child } from './children.js';
import { View } from './renderers/View.js';

/**
 * The foundational object for the scenegraph.
 */
export abstract class Element<P> implements Child {
    /**
     * Gradient, Shape, Stop, and Texture all extend Element.
     */
    isShape: boolean;
    /**
     * 
     */
    parent: P;

    _flagId = false;
    _flagClassName = false;

    _renderer: View = {} as View;

    _id: string | null = null;
    readonly #id: Subject<{ id: string, previous_id: string | null }>;
    readonly id$: Observable<{ id: string, previous_id: string | null }>;

    _className = '';

    classList: string[] = [];

    constructor() {
        this.#id = new Subject();
        this.id$ = this.#id.asObservable();
    }

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
