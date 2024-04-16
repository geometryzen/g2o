import { Signal } from "signal-polyfill";

let needsEnqueue = true;

const w = new Signal.subtle.Watcher(() => {
    if (needsEnqueue) {
        needsEnqueue = false;
        queueMicrotask(processPending);
    }
});

function processPending() {
    needsEnqueue = true;

    for (const s of w.getPending()) {
        s.get();
    }

    w.watch();
}

export function effect(callback: () => unknown) {
    let cleanup: unknown;

    const computed = new Signal.Computed(() => {
        typeof cleanup === "function" && cleanup();
        cleanup = callback();
    });

    w.watch(computed);
    computed.get();

    return () => {
        w.unwatch(computed);
        typeof cleanup === "function" && cleanup();
    };
}