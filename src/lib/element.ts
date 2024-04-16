import { Subject } from 'rxjs';
import { Child } from './children';
import { Flag } from './Flag';
import { SharedInfo } from './renderers/SharedInfo';
import { Observable } from './rxjs/Observable';

/**
 * The foundational object for the scenegraph.
 */
export abstract class ElementBase<P> implements Child {
    /**
     * Gradient, Shape, Stop, and Texture all extend Element.
     */
    isShape: boolean;
    /**
     * 
     */
    parent: P;

    readonly flags: { [flag: number]: boolean } = {};

    /**
     * TODO: Since every element has an identifier, it should be possible to store this information that is shared
     * between the model and view in a map elsewhere. I suspect, though, that this is faster.
     */
    viewInfo: SharedInfo = {
        disposables: []
    };

    #id: string | null = null;
    readonly #id_and_previous: Subject<{ id: string, previous_id: string | null }>;
    readonly id$: Observable<{ id: string, previous_id: string | null }>;

    #className = '';

    classList: string[] = [];

    constructor() {
        this.#id_and_previous = new Subject();
        this.id$ = this.#id_and_previous.asObservable();
        this.flagReset(false);
    }

    flagReset(dirtyFlag = false): this {
        this.flags[Flag.Id] = dirtyFlag;
        this.flags[Flag.ClassName] = dirtyFlag;
        return this;
    }
    get id(): string {
        return this.#id;
    }
    set id(id: string) {
        const previous_id = this.id;
        if (id === previous_id) {
            return;
        }
        this.#id = id;
        this.flags[Flag.Id] = true;
        this.#id_and_previous.next({ id, previous_id });
    }
    get className(): string {
        return this.#className;
    }
    set className(className: string) {
        if (this.className !== className) {
            this.flags[Flag.ClassName] = true;
            this.classList = className.split(/\s+?/);
            this.#className = className;
        }
    }
}
