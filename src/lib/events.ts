export type EventHandler = (...args: unknown[]) => void;
/**
 * @name Two.Events
 * @class
 * @description Object inherited by many Two.js objects in order to facilitate custom events.
 */
export class Events {

    // Being a base class, we have to be careful when creating private members.
    // Containment may be a better approach.
    readonly $event_type_to_handlers: { [name: string]: EventHandler[] } = {};
    $bound = false;

    constructor() { }

    get bound() {
        return this.$bound;
    }
    set bound(v) {
        this.$bound = v;
    }

    /**
     * @name Two.Events#addEventListener
     * @function
     * @param {String} [name] - The name of the event to bind a function to.
     * @param {Function} [handler] - The function to be invoked when the event is dispatched.
     * @description Call to add a listener to a specific event name.
     */
    addEventListener(name: string, handler: EventHandler): this {

        const handlers = this.$event_type_to_handlers[name] || (this.$event_type_to_handlers[name] = []);
        handlers.push(handler);
        this.$bound = true;
        return this;
    }

    /**
     * @name Two.Events#on
     * @function
     * @description Alias for {@link Two.Events#addEventListener}.
     */
    on(name: string, handler: EventHandler) {
        return this.addEventListener(name, handler);
    }
    /**
     * @name Two.Events#bind
     * @function
     * @description Alias for {@link Two.Events#addEventListener}.
     */
    bind(name: string, handler: EventHandler): this {
        return this.addEventListener(name, handler);
    }

    /**
     * @name Two.Events#removeEventListener
     * @function
     * @param {String} [name] - The name of the event intended to be removed.
     * @param {Function} [handler] - The handler intended to be removed.
     * @description Call to remove listeners from a specific event. If only `name` is passed then all the handlers attached to that `name` will be removed. If no arguments are passed then all handlers for every event on the obejct are removed.
     */
    removeEventListener(name: string, handler: EventHandler) {

        if (!this.$event_type_to_handlers) {
            return this;
        }
        if (!name && !handler) {
            this.$event_type_to_handlers = {};
            this.$bound = false;
            return this;
        }

        const names = name ? [name] : Object.keys(this.$event_type_to_handlers);
        for (let i = 0, l = names.length; i < l; i++) {

            name = names[i];
            const list = this.$event_type_to_handlers[name];

            if (list) {
                const events:EventHandler[] = [];
                if (handler) {
                    for (let j = 0, k = list.length; j < k; j++) {
                        let e = list[j];
                        e = e.handler ? e.handler : e;
                        if (handler !== e) {
                            events.push(e);
                        }
                    }
                }
                this.$event_type_to_handlers[name] = events;
            }
        }

        return this;

    }

    /**
     * @name Two.Events#off
     * @function
     * @description Alias for {@link Two.Events#removeEventListener}.
     */
    off(name: string, handler: EventHandler) {
        return this.removeEventListener(name, handler);
    }
    /**
     * @name Two.Events#unbind
     * @function
     * @description Alias for {@link Two.Events#removeEventListener}.
     */
    unbind(name: string, handler: EventHandler) {
        return this.removeEventListener(name, handler);
    }

    /**
     * @name Two.Events#dispatchEvent
     * @function
     * @param {String} name - The name of the event to dispatch.
     * @param args - Anything can be passed after the name and those will be passed on to handlers attached to the event in the order they are passed.
     * @description Call to trigger a custom event. Any additional arguments passed after the name will be passed along to the attached handlers.
     */
    dispatchEvent(name: string, ...values: unknown[]): this {

        if (!this.$event_type_to_handlers) {
            return this;
        }

        const args = Array.prototype.slice.call(arguments, 1);
        const events = this.$event_type_to_handlers[name];

        if (events) {
            for (let i = 0; i < events.length; i++) {
                events[i].call(this, ...args);
            }
        }

        return this;

    }

    trigger() {
        return this.dispatchEvent.apply(this, arguments);
    }

    listen(obj: Events, name: string, handler: EventHandler) {

        const scope = this;

        if (obj) {

            // Add references about the object that assigned this listener
            e.obj = obj;
            e.name = name;
            e.handler = handler;

            obj.on(name, e);

        }

        function e() {
            handler.apply(scope, arguments);
        }

        return scope;
    }

    ignore(obj: Events, name: string, handler: EventHandler) {

        obj.off(name, handler);
        return this;

    }

    /**
     * @name Two.Events.Types
     * @property {Object} - Object of different types of Two.js specific events.
     */
    static Types = {
        play: 'play',
        pause: 'pause',
        update: 'update',
        render: 'render',
        resize: 'resize',
        change: 'change',
        remove: 'remove',
        insert: 'insert',
        order: 'order',
        load: 'load'
    } as const;

    static Methods = [
        'addEventListener', 'on', 'removeEventListener', 'off', 'unbind',
        'dispatchEvent', 'trigger', 'listen', 'ignore'
    ];
}
