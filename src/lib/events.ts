export type EventHandler = (...args: unknown[]) => void;

export class Events {
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
}
