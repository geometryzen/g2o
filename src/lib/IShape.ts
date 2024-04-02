import { Child } from "./children";
import { Gradient } from "./effects/gradient";
import { Texture } from "./effects/texture";
import { Vector } from "./vector";

/**
 * TODO: rename to Shape when the hierarchy has been flattened.
 */
export interface IShape<P> extends Child {
    // FIXME!
    isShape: boolean;
    automatic: boolean;
    beginning: number;
    cap: string;
    classList: string[];
    closed: boolean;
    curved: boolean;
    ending: number;
    fill: string | Gradient | Texture;
    join: string;
    length: number;
    linewidth: number;
    miter: number;
    parent: P;
    stroke: string | Gradient | Texture;
    translation: Vector;
    visible: boolean;
    getBoundingClientRect(shallow?: boolean): { width?: number; height?: number; top?: number; left?: number; right?: number; bottom?: number };
    // const regex = /texture|gradient/i;
    // regex.test(child._renderer.type)
    hasBoundingClientRect(): boolean;
    noFill(): this;
    noStroke(): this;
    subdivide(limit: number): this;
}