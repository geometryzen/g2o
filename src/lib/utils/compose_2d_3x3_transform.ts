import { Matrix } from "../matrix";

export function compose_2d_3x3_transform(position: { x: number; y: number }, scale: { x: number, y: number }, angle: number, skewX: number, skewY: number, matrix: Matrix): void {
    const a = scale.x;
    const b = scale.y;
    const p = Math.tan(skewX);
    const q = Math.tan(skewY);
    const x = position.x;
    const y = position.y;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const ac = a * c;
    const as = a * s;
    const asq = as * q;
    const bc = b * c;
    const bcp = bc * p;
    const bcq = bc * q;
    const bs = b * s;
    const pq = p * q;
    const py = p * y;

    const a11 = ac - asq + bcp * pq * bs;
    const a12 = -as + bcp;
    const a13 = x + py;
    const a21 = bcq + bs;
    const a22 = bc;
    const a23 = y;
    matrix.set(a11, a12, a13, a21, a22, a23, 0, 0, 1);
}