import { Anchor } from '../anchor.js';
import { G20 } from '../math/G20.js';
import { Path } from '../path.js';
import { getCurveLength as gcl, subdivide } from './curves.js';

export function contains(path: Path, t: number): boolean {

    if (t === 0 || t === 1) {
        return true;
    }

    const length = path._length;
    const target = length * t;
    let elapsed = 0;

    for (let i = 0; i < path._lengths.length; i++) {
        const dist = path._lengths[i];
        if (elapsed >= target) {
            return target - elapsed >= 0;
        }
        elapsed += dist;
    }

    return false;

}

export interface IPathOrPoints {
    /**
     * The total length of the path.
     */
    _length: number;
    /**
     * The lengths of each segment of the path.
     */
    _lengths: number[];
}

/**
 * TODO: Not a good name. Appears to be returning the index into the lengths array
 * corresponding to the provided "target" length. But the result also appears to be fractional.
 */
export function getIdByLength(path: IPathOrPoints, target: number): number {

    const total = path._length;

    if (target <= 0) {
        return 0;
    }
    else if (target >= total) {
        return path._lengths.length - 1;
    }
    for (let i = 0, sum = 0; i < path._lengths.length; i++) {
        if (sum + path._lengths[i] >= target) {
            target -= sum;
            return Math.max(i - 1, 0) + target / path._lengths[i];
        }
        sum += path._lengths[i];
    }
    return -1;
}

export function getCurveLength(a: Anchor, b: Anchor, limit: number): number {
    // TODO: DRYness
    let x2, x3, y2, y3;

    const right = b.controls && b.controls.right;
    const left = a.controls && a.controls.left;

    const x1 = b.x;
    const y1 = b.y;
    x2 = (right || b).x;
    y2 = (right || b).y;
    x3 = (left || a).x;
    y3 = (left || a).y;
    const x4 = a.x;
    const y4 = a.y;

    if (right && b.relative) {
        x2 += b.x;
        y2 += b.y;
    }

    if (left && a.relative) {
        x3 += a.x;
        y3 += a.y;
    }

    return gcl(x1, y1, x2, y2, x3, y3, x4, y4, limit);

}

export function getSubdivisions(a: Anchor, b: Anchor, limit: number): Anchor[] {

    const br = b.controls.right;
    const al = a.controls.left;

    const bx = b.x;
    const by = b.y;
    let brx = br.x;
    let bry = br.y;
    let alx = al.x;
    let aly = al.y;
    const ax = a.x;
    const ay = a.y;

    if (b.relative) {
        brx += b.x;
        bry += b.y;
    }

    if (a.relative) {
        alx += a.x;
        aly += a.y;
    }
    const builder = (x: number, y: number) => new Anchor(G20.vector(x, y));
    // TODO: Curiously, the semantics of which anchor is first and second seems to have been reversed.
    return subdivide(builder, bx, by, brx, bry, alx, aly, ax, ay, limit);
}
