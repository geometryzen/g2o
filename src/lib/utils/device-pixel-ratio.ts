import { root } from './root.js';

const devicePixelRatio = root.devicePixelRatio || 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBackingStoreRatio(ctx: any/*CanvasRenderingContext2D*/): number {
    return ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;
}

/**
 * @returns The ratio of a unit in Two.js to the pixel density of a session's screen.
 * @see [High DPI Rendering](http://www.html5rocks.com/en/tutorials/canvas/hidpi/)
 */
export function getRatio(ctx: CanvasRenderingContext2D): number {
    return devicePixelRatio / getBackingStoreRatio(ctx);
}
