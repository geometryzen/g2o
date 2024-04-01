import { MatrixDecomposition } from "./MatrixDecomposition";

/**
 * Decompose a 2D 3x3 Matrix to find the skew.
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
