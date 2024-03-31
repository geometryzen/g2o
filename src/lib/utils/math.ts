import { Group } from '../group.js';
import { Matrix } from '../matrix.js';
import { Shape } from '../shape.js';
import { root } from './root.js';

export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI * 0.5;

export interface MatrixDecomposition {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotation: number
}

/**
 * @name Two.Utils.decomposeMatrix
 * @function
 * @param {Two.Matrix} matrix - The matrix to decompose.
 * @returns {Object} An object containing relevant skew values.
 * @description Decompose a 2D 3x3 Matrix to find the skew.
 */
export function decomposeMatrix(a: number, b: number, c: number, d: number, e: number, f: number): MatrixDecomposition {

    // TODO: Include skewX, skewY
    // https://math.stackexchange.com/questions/237369/given-this-transformation-matrix-how-do-i-decompose-it-into-translation-rotati/417813
    // https://stackoverflow.com/questions/45159314/decompose-2d-transformation-matrix

    return {
        translateX: e,
        translateY: f,
        scaleX: Math.sqrt(a * a + b * b),
        scaleY: Math.sqrt(c * c + d * d),
        rotation: 180 * Math.atan2(b, a) / Math.PI
    };

}

/**
 * @name Two.Utils.getComputedMatrix
 * @function
 * @param {Two.Shape} object - The Two.js object that has a matrix property to calculate from.
 * @param {Two.Matrix} [matrix] - The matrix to apply calculated transformations to if available.
 * @returns {Two.Matrix} The computed matrix of a nested object. If no `matrix` was passed in arguments then a `new Two.Matrix` is returned.
 * @description Method to get the world space transformation of a given object in a Two.js scene.
 */
export function getComputedMatrix(object: Shape, matrix: Matrix): Matrix {

    matrix = (matrix && matrix.identity()) || new Matrix();
    let parent: Shape | Group = object;
    const matrices: Matrix[] = [];

    while (parent && parent._matrix) {
        matrices.push(parent._matrix);
        parent = parent.parent;
    }

    matrices.reverse();

    for (let i = 0; i < matrices.length; i++) {
        const m = matrices[i];
        matrix.multiply(m.a, m.b, m.c, m.d, m.e, m.f, m.g, m.h, m.i);
    }

    return matrix;
}

/**
 * @name Two.Utils.lerp
 * @function
 * @param {Number} a - Start value.
 * @param {Number} b - End value.
 * @param {Number} t - Zero-to-one value describing percentage between a and b.
 * @returns {Number}
 * @description Linear interpolation between two values `a` and `b` by an amount `t`.
 */
export function lerp(a: number, b: number, t: number): number {
    return t * (b - a) + a;
}

/**
 * @name Two.Utils.getPoT
 * @param {Number} value - The number to find the nearest power-of-two value
 * @returns {Number}
 * @description Rounds a number up to the nearest power-of-two value.
 * @see {@link https://en.wikipedia.org/wiki/Power_of_two}
 */
const pots = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
export function getPoT(value: number) {
    let i = 0;
    while (pots[i] && pots[i] < value) {
        i++;
    }
    return pots[i];
}

/**
 * @name Two.Utils.mod
 * @function
 * @param {Number} v - The value to modulo
 * @param {Number} l - The value to modulo by
 * @returns {Number}
 * @description Modulo with added functionality to handle negative values in a positive manner.
 */
export function mod(v: number, l: number): number {

    while (v < 0) {
        v += l;
    }

    return v % l;

}

export const NumArray = root.Float32Array || Array<number>;
const floor = Math.floor;

/**
* @name Two.Utils.toFixed
* @function
* @param {Number} v - Any float
* @returns {Number} That float trimmed to the third decimal place.
* @description A pretty fast toFixed(3) alternative.
* @see {@link http://jsperf.com/parsefloat-tofixed-vs-math-round/18}
*/
export function toFixed(v: number): number {
    return floor(v * 1000000) / 1000000;
}
