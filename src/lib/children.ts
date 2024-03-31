import { Observable, Subscription } from 'rxjs';
import { Collection } from './collection.js';

export interface Child {
    id: string;
    id$: Observable<{ id: string, previous_id: string }>;
}

/**
 * A children collection which is accesible both by index and by object `id`.
 */
export class Children<T extends Child> extends Collection<T> {

    readonly ids: { [id: string]: T } = {};
    readonly #child_subscriptions: { [id: string]: Subscription } = {};

    readonly #insert_subscription: Subscription;
    readonly #remove_subscription: Subscription;

    constructor(children: T[]) {
        super(children);

        this.#attach(children);

        this.#insert_subscription = this.insert$.subscribe((cs: T[]) => {
            this.#attach(cs);
        });

        this.#remove_subscription = this.remove$.subscribe((cs: T[]) => {
            this.#detach(cs);
        });
    }

    dispose(): void {
        this.#insert_subscription.unsubscribe();
        this.#remove_subscription.unsubscribe();
    }

    #attach(children: T[]): this {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child && child.id) {
                this.ids[child.id] = child;
            }
            this.#child_subscriptions[child.id] = child.id$.subscribe(({ id, previous_id }) => {
                if (previous_id) {
                    delete this.ids[previous_id];
                    // Move the subscription to the new id and delete the reference for the previous_id
                    this.#child_subscriptions[id] = this.#child_subscriptions[previous_id];
                    delete this.#child_subscriptions[previous_id];
                }
                this.ids[id] = child;
            });
        }
        return this;
    }

    #detach(children: T[]): this {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            this.#child_subscriptions[child.id].unsubscribe();
            delete this.#child_subscriptions[child.id];
            delete this.ids[child.id];
        }
        return this;
    }
}
