import { Collection } from './collection.js';
import { Group } from './group.js';

export interface Child {
    id: string;
    parent: Group;
}

/**
 * A children collection which is accesible both by index and by object `id`.
 */
export class Children<T extends Child> extends Collection<T> {

    /**
     * @name Two.Group.Children#ids
     * @property {Object} - Map of all elements in the list keyed by `id`s.
     */
    ids: { [id: string]: T } = {};

    constructor(children: T[]) {

        children = Array.isArray(children)
            ? children : Array.prototype.slice.call(arguments);

        super(children);

        this.attach(children);

        const insert_event_handler = (ts: T[]) => {
            this.attach(ts);
        };

        const remove_event_handler = (ts: T[]) => {
            this.detach(ts);
        };

        this.on('insert', insert_event_handler);
        this.on('remove', remove_event_handler);
    }

    /**
     * @function
     * @name Two.Group.Children#attach
     * @param {Two.Shape[]} children - The objects which extend {@link Two.Shape} to be added.
     * @description Adds elements to the `ids` map.
     */
    attach(children: T[]): this {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child && child.id) {
                this.ids[child.id] = child;
            }
        }
        return this;
    }

    /**
     * @function
     * @name Two.Group.Children#detach
     * @param {Two.Shape[]} children - The objects which extend {@link Two.Shape} to be removed.
     * @description Removes elements to the `ids` map.
     */
    detach(children: T[]): this {
        for (let i = 0; i < children.length; i++) {
            delete this.ids[children[i].id];
        }
        return this;
    }
}
