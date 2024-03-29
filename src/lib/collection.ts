import { Events } from './events.js';

/**
 * @description An `Array` like object with additional event propagation on actions. `pop`, `shift`, and `splice` trigger `removed` events. `push`, `unshift`, and `splice` with more than 2 arguments trigger 'inserted'. Finally, `sort` and `reverse` trigger `order` events.
 */
export class Collection<T> extends Array<T> {

    // Being a base class we have to be careful with private members.
    $events = new Events();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(items: T[]) {

        super();

        if (arguments[0] && Array.isArray(arguments[0])) {
            if (arguments[0].length > 0) {
                this.push.apply(this, arguments[0]);
            }
        }
        else if (arguments.length > 0) {
            this.push.apply(this, arguments);
        }
    }

    // Getters and setters aren't enumerable
    get bound(): boolean {
        return this.$events.bound;
    }
    set bound(v: boolean) {
        this.$events.bound = v;
    }

    addEventListener() {
        return this.$events.addEventListener.apply(this, arguments);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    on(type: 'insert' | 'remove' | 'order', callback: (children: T[]) => void) {
        return this.$events.on(type, callback);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    bind(type: 'insert' | 'remove' | 'order', callback: (children: T[]) => void) {
        return this.$events.bind.apply(this, arguments);
    }
    removeEventListener() {
        return this.$events.removeEventListener.apply(this, arguments);
    }
    off() {
        return this.$events.off.apply(this, arguments);
    }
    unbind() {
        return this.$events.unbind.apply(this, arguments);
    }
    dispatchEvent() {
        return this.$events.dispatchEvent.apply(this, arguments);
    }
    trigger() {
        return this.$events.trigger.apply(this, arguments);
    }
    listen() {
        return this.$events.listen.apply(this, arguments);
    }
    ignore() {
        return this.$events.ignore.apply(this, arguments);
    }

    pop() {
        const popped = super.pop.apply(this, arguments);
        this.trigger(Events.Types.remove, [popped]);
        return popped;
    }

    shift() {
        const shifted = super.shift.apply(this, arguments);
        this.trigger(Events.Types.remove, [shifted]);
        return shifted;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    push(...items: T[]) {
        const pushed = super.push.apply(this, arguments);
        this.trigger(Events.Types.insert, arguments);
        return pushed;
    }

    unshift() {
        const unshifted = super.unshift.apply(this, arguments);
        this.trigger(Events.Types.insert, arguments);
        return unshifted;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    splice(start: number, deleteCount?: number) {
        const spliced = super.splice.apply(this, arguments);
        this.trigger(Events.Types.remove, spliced);
        if (arguments.length > 2) {
            const inserted = this.slice(arguments[0], arguments[0] + arguments.length - 2);
            this.trigger(Events.Types.insert, inserted);
            this.trigger(Events.Types.order);
        }
        return spliced;
    }

    sort() {
        super.sort.apply(this, arguments);
        this.trigger(Events.Types.order);
        return this;
    }

    reverse() {
        super.reverse.apply(this, arguments);
        this.trigger(Events.Types.order);
        return this;
    }

    indexOf() {
        return super.indexOf.apply(this, arguments);
    }

    map(func, scope) {
        const results = [];
        for (let key = 0; key < this.length; key++) {
            const value = this[key];
            let result;
            if (scope) {
                result = func.call(scope, value, key);
            } else {
                result = func(value, key);
            }
            results.push(result);
        }
        return results;
    }

}
