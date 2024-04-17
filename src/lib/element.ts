import { Child } from './children';
import { Flag } from './Flag';
import { SharedInfo } from './renderers/SharedInfo';

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

    readonly #id: string;

    #className = '';

    classList: string[] = [];

    constructor(id: string) {
        this.#id = id;
        this.flagReset(false);
    }

    flagReset(dirtyFlag = false): this {
        this.flags[Flag.ClassName] = dirtyFlag;
        return this;
    }
    get id(): string {
        return this.#id;
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
