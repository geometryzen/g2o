import { BehaviorSubject, Observable } from 'rxjs';
import { NumArray, toFixed } from './utils/math.js';

// Constants

const cos = Math.cos, sin = Math.sin, tan = Math.tan;
const array: number[] = [];

/**
 * 1st row is [a,b,c], 2nd row is [d,e,f], 3rd row is [g,h,i]
 */
export class Matrix {

    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    /**
     * 1st row is [0,1,2], 2nd row is [3,4,5], 3rd row is [6,7,8]
     */
    elements = new NumArray(9);

    /**
     * @name Two.Matrix#manual
     * @property {Boolean} - Determines whether Two.js automatically calculates the values for the matrix or if the developer intends to manage the matrix.
     * @nota-bene - Setting to `true` nullifies {@link Two.Shape#translation}, {@link Two.Shape#rotation}, and {@link Two.Shape#scale}.
     */
    manual = false;

    constructor(a = 1, b = 0, c = 0, d = 0, e = 1, f = 0, g = 0, h = 0, i = 1) {
        this.elements[0] = a;
        this.elements[1] = b;
        this.elements[2] = c;
        this.elements[3] = d;
        this.elements[4] = e;
        this.elements[5] = f;
        this.elements[6] = g;
        this.elements[7] = h;
        this.elements[8] = i;

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();
    }

    get a() {
        return this.elements[0];
    }
    get b() {
        return this.elements[1];
    }
    get c() {
        return this.elements[2];
    }
    get d() {
        return this.elements[3];
    }
    get e() {
        return this.elements[4];
    }
    get f() {
        return this.elements[5];
    }
    get g() {
        return this.elements[6];
    }
    get h() {
        return this.elements[7];
    }
    get i() {
        return this.elements[8];
    }

    //

    /**
     * @name Two.Matrix.Identity
     * @property {Number[]} - A stored reference to the default value of a 3 x 3 matrix.
     */
    static Identity = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];

    set(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): this {

        this.elements[0] = a;
        this.elements[1] = b;
        this.elements[2] = c;
        this.elements[3] = d;
        this.elements[4] = e;
        this.elements[5] = f;
        this.elements[6] = g;
        this.elements[7] = h;
        this.elements[8] = i;

        this.#change.next(this);

        return this;
    }

    set_from_matrix(m: Matrix): this {

        this.elements[0] = m.a;
        this.elements[1] = m.b;
        this.elements[2] = m.c;
        this.elements[3] = m.d;
        this.elements[4] = m.e;
        this.elements[5] = m.f;
        this.elements[6] = m.g;
        this.elements[7] = m.h;
        this.elements[8] = m.i;

        this.#change.next(this);

        return this;
    }

    /**
     * @name Two.Matrix#copy
     * @function
     * @description Copy the matrix of one to the current instance.
     */
    copy(m: Matrix): this {

        this.elements[0] = m.elements[0];
        this.elements[1] = m.elements[1];
        this.elements[2] = m.elements[2];
        this.elements[3] = m.elements[3];
        this.elements[4] = m.elements[4];
        this.elements[5] = m.elements[5];
        this.elements[6] = m.elements[6];
        this.elements[7] = m.elements[7];
        this.elements[8] = m.elements[8];

        this.manual = m.manual;

        this.#change.next(this);
        return this;
    }

    /**
     * @name Two.Matrix#identity
     * @function
     * @description Turn matrix to the identity, like resetting.
     */
    identity() {

        this.elements[0] = Matrix.Identity[0];
        this.elements[1] = Matrix.Identity[1];
        this.elements[2] = Matrix.Identity[2];
        this.elements[3] = Matrix.Identity[3];
        this.elements[4] = Matrix.Identity[4];
        this.elements[5] = Matrix.Identity[5];
        this.elements[6] = Matrix.Identity[6];
        this.elements[7] = Matrix.Identity[7];
        this.elements[8] = Matrix.Identity[8];

        this.#change.next(this);
        return this;
    }

    /**
     * @name Two.Matrix#multiply
     * @function
     * @param {Number} a - The scalar to be multiplied.
     * @description Multiply all components of the matrix against a single scalar value.
     * @overloaded
     */

    multiply(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): this {

        const A = this.elements;
        const B = [a, b, c, d, e, f, g, h, i];

        const A0 = A[0], A1 = A[1], A2 = A[2];
        const A3 = A[3], A4 = A[4], A5 = A[5];
        const A6 = A[6], A7 = A[7], A8 = A[8];

        const B0 = B[0], B1 = B[1], B2 = B[2];
        const B3 = B[3], B4 = B[4], B5 = B[5];
        const B6 = B[6], B7 = B[7], B8 = B[8];

        this.elements[0] = A0 * B0 + A1 * B3 + A2 * B6;
        this.elements[1] = A0 * B1 + A1 * B4 + A2 * B7;
        this.elements[2] = A0 * B2 + A1 * B5 + A2 * B8;

        this.elements[3] = A3 * B0 + A4 * B3 + A5 * B6;
        this.elements[4] = A3 * B1 + A4 * B4 + A5 * B7;
        this.elements[5] = A3 * B2 + A4 * B5 + A5 * B8;

        this.elements[6] = A6 * B0 + A7 * B3 + A8 * B6;
        this.elements[7] = A6 * B1 + A7 * B4 + A8 * B7;
        this.elements[8] = A6 * B2 + A7 * B5 + A8 * B8;

        this.#change.next(this);

        return this;
    }

    multiply_vector(x: number = 0, y: number = 0, z: number = 1): [number, number, number] {

        const x1 = this.a * x + this.b * y + this.c * z;
        const x2 = this.d * x + this.e * y + this.f * z;
        const x3 = this.g * x + this.h * y + this.i * z;

        return [x1, x2, x3];
    }

    multiply_by_scalar(s: number): this {
        this.elements[0] *= s;
        this.elements[1] *= s;
        this.elements[2] *= s;
        this.elements[3] *= s;
        this.elements[4] *= s;
        this.elements[5] *= s;
        this.elements[6] *= s;
        this.elements[7] *= s;
        this.elements[8] *= s;
        this.#change.next(this);
        return this;
    }

    /**
     * @name Two.Matrix#inverse
     * @function
     * @param {Two.Matrix} [out] - The optional matrix to apply the inversion to.
     * @description Return an inverted version of the matrix. If no optional one is passed a new matrix is created and returned.
     */
    inverse(out?: Matrix): Matrix {

        const a = this.elements;
        out = out || new Matrix();

        const a00 = a[0], a01 = a[1], a02 = a[2];
        const a10 = a[3], a11 = a[4], a12 = a[5];
        const a20 = a[6], a21 = a[7], a22 = a[8];

        const b01 = a22 * a11 - a12 * a21;
        const b11 = -a22 * a10 + a12 * a20;
        const b21 = a21 * a10 - a11 * a20;

        // Calculate the determinant
        let det = a00 * b01 + a01 * b11 + a02 * b21;

        if (!det) {
            return null;
        }

        det = 1.0 / det;

        out.elements[0] = b01 * det;
        out.elements[1] = (-a22 * a01 + a02 * a21) * det;
        out.elements[2] = (a12 * a01 - a02 * a11) * det;
        out.elements[3] = b11 * det;
        out.elements[4] = (a22 * a00 - a02 * a20) * det;
        out.elements[5] = (-a12 * a00 + a02 * a10) * det;
        out.elements[6] = b21 * det;
        out.elements[7] = (-a21 * a00 + a01 * a20) * det;
        out.elements[8] = (a11 * a00 - a01 * a10) * det;

        return out;
    }

    /**
     * @name Two.Matrix#scale
     * @function
     * @param {Number} scale - The one dimensional scale to apply to the matrix.
     * @description Uniformly scale the transformation matrix.
     */

    /**
     * @name Two.Matrix#scale
     * @function
     * @param {Number} sx - The horizontal scale factor.
     * @param {Number} sy - The vertical scale factor
     * @description Scale the transformation matrix in two dimensions.
     */
    scale(sx: number, sy: number) {

        const l = arguments.length;
        if (l <= 1) {
            sy = sx;
        }

        return this.multiply(sx, 0, 0, 0, sy, 0, 0, 0, 1);
    }

    /**
     * @name Two.Matrix#rotate
     * @function
     * @param {Number} Number - The amount to rotate in Number.
     * @description Rotate the matrix.
     */
    rotate(angle: number) {

        const c = cos(angle);
        const s = sin(angle);

        return this.multiply(c, -s, 0, s, c, 0, 0, 0, 1);
    }

    /**
     * @name Two.Matrix#translate
     * @function
     * @param {Number} x - The horizontal translation value to apply.
     * @param {Number} y - The vertical translation value to apply.
     * @description Translate the matrix.
     */
    translate(x: number, y: number): this {
        return this.multiply(1, 0, x, 0, 1, y, 0, 0, 1);
    }

    /**
     * Skew the matrix by an angle in the x axis direction.
     */
    skewX(angle: number): this {
        const a = tan(angle);
        return this.multiply(1, a, 0, 0, 1, 0, 0, 0, 1);
    }

    /**
     * Skew the matrix by an angle in the y axis direction.
     */
    skewY(angle: number): this {
        const a = tan(angle);
        return this.multiply(1, 0, 0, a, 1, 0, 0, 0, 1);

    }

    toString(fullMatrix = false): string {

        array.length = 0;
        this.toTransformArray(fullMatrix, array);

        return array.map(toFixed).join(' ');

    }

    /**
     * @returns the full 9 elements of the matrix or just 6 in the format for 2D transformations.
     */
    toTransformArray(fullMatrix = false, output?: number[]): number[] {

        const elements = this.elements;
        const hasOutput = !!output;

        const a = elements[0];
        const b = elements[1];
        const c = elements[2];
        const d = elements[3];
        const e = elements[4];
        const f = elements[5];

        if (fullMatrix) {

            const g = elements[6];
            const h = elements[7];
            const i = elements[8];

            if (hasOutput) {
                output[0] = a;
                output[1] = d;
                output[2] = g;
                output[3] = b;
                output[4] = e;
                output[5] = h;
                output[6] = c;
                output[7] = f;
                output[8] = i;
                return output;
            }

            return [
                a, d, g, b, e, h, c, f, i
            ];
        }

        if (hasOutput) {
            output[0] = a;
            output[1] = d;
            output[2] = b;
            output[3] = e;
            output[4] = c;
            output[5] = f;
            return output;
        }

        return [
            a, d, b, e, c, f  // Specific format see LN:19
        ];
    }

    /**
     * @returns  the full 9 elements of the matrix or just 6 for 2D transformations.
     */
    toArray(fullMatrix = false, output?: number[]): number[] {

        const elements = this.elements;
        const hasOutput = Array.isArray(output);

        const a = elements[0];
        const b = elements[1];
        const c = elements[2];
        const d = elements[3];
        const e = elements[4];
        const f = elements[5];

        if (fullMatrix) {

            const g = elements[6];
            const h = elements[7];
            const i = elements[8];

            if (hasOutput) {
                output[0] = a;
                output[1] = b;
                output[2] = c;
                output[3] = d;
                output[4] = e;
                output[5] = f;
                output[6] = g;
                output[7] = h;
                output[8] = i;
                return output;
            }

            return [
                a, b, c, d, e, f, g, h, i
            ];
        }

        if (hasOutput) {
            output[0] = a;
            output[1] = b;
            output[2] = c;
            output[3] = d;
            output[4] = e;
            output[5] = f;
            return output;
        }

        return [
            a, b, c, d, e, f
        ];
    }
}
// TODO
/*
export function multiply(A: Matrix, B, C) {

    if (B.length <= 3) { // Multiply Vector

        const e = A;
        let x, y, z;

        const a = B[0] || 0,
            b = B[1] || 0,
            c = B[2] || 0;

        // Go down rows first
        // a, d, g, b, e, h, c, f, i

        x = e[0] * a + e[1] * b + e[2] * c;
        y = e[3] * a + e[4] * b + e[5] * c;
        z = e[6] * a + e[7] * b + e[8] * c;

        return [x, y, z];

    }

    const A0 = A[0], A1 = A[1], A2 = A[2];
    const A3 = A[3], A4 = A[4], A5 = A[5];
    const A6 = A[6], A7 = A[7], A8 = A[8];

    const B0 = B[0], B1 = B[1], B2 = B[2];
    const B3 = B[3], B4 = B[4], B5 = B[5];
    const B6 = B[6], B7 = B[7], B8 = B[8];

    C = C || new NumArray(9);

    C[0] = A0 * B0 + A1 * B3 + A2 * B6;
    C[1] = A0 * B1 + A1 * B4 + A2 * B7;
    C[2] = A0 * B2 + A1 * B5 + A2 * B8;
    C[3] = A3 * B0 + A4 * B3 + A5 * B6;
    C[4] = A3 * B1 + A4 * B4 + A5 * B7;
    C[5] = A3 * B2 + A4 * B5 + A5 * B8;
    C[6] = A6 * B0 + A7 * B3 + A8 * B6;
    C[7] = A6 * B1 + A7 * B4 + A8 * B7;
    C[8] = A6 * B2 + A7 * B5 + A8 * B8;

    return C;

}
*/
