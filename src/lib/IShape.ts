import { Child } from "./children";
import { LinearGradient } from "./effects/linear-gradient";
import { RadialGradient } from "./effects/radial-gradient";
import { Texture } from "./effects/texture";
import { G20 } from "./math/G20";

/**
 * TODO: rename to Shape when the hierarchy has been flattened.
 */
export interface IShape<P> extends Child {
    // FIXME!
    isShape: boolean;
    automatic: boolean;
    beginning: number;
    cap: 'butt' | 'round' | 'square';
    classList: string[];
    closed: boolean;
    curved: boolean;
    ending: number;
    fill: string | LinearGradient | RadialGradient | Texture;
    join: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round';
    length: number;
    strokeWidth: number;
    miter: number;
    parent: P;
    position: G20;
    stroke: string | LinearGradient | RadialGradient | Texture;
    visible: boolean;
    getBoundingClientRect(shallow?: boolean): { width?: number; height?: number; top?: number; left?: number; right?: number; bottom?: number };
    // const regex = /texture|gradient/i;
    // regex.test(child._renderer.type)
    hasBoundingClientRect(): boolean;
    noFill(): this;
    noStroke(): this;
    subdivide(limit: number): this;
}