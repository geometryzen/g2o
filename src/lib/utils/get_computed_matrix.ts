import { Group } from "../group";
import { Matrix } from "../matrix";
import { Parent, Shape } from "../shape";

/**
 * @param {Two.Shape} object - The Two.js object that has a matrix property to calculate from.
 * @param {Two.Matrix} [matrix] - The matrix to apply calculated transformations to if available.
 * @returns {Two.Matrix} The computed matrix of a nested object. If no `matrix` was passed in arguments then a `new Two.Matrix` is returned.
 * @description Method to get the world space transformation of a given object in a Two.js scene.
 */
export function getComputedMatrix<P extends Parent>(object: Shape<P>, matrix: Matrix): Matrix {

    matrix = (matrix && matrix.identity()) || new Matrix();
    let parent: Shape<P> | Group = object;
    const matrices: Matrix[] = [];

    while (parent && parent._matrix) {
        matrices.push(parent._matrix);
        // The parent may not be a Group, it could be a View we have reached the top level.
        // However, the test for a local matrix will exclude the view.
        parent = parent.parent as Group;
    }

    matrices.reverse();

    for (let i = 0; i < matrices.length; i++) {
        const m = matrices[i];
        matrix.multiply(m.a, m.b, m.c, m.d, m.e, m.f, m.g, m.h, m.i);
    }

    return matrix;
}
