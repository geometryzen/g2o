import { MatrixDecomposition } from "./MatrixDecomposition";

/**
 * Decompose a 2D 3x3 Matrix to find the skew.
 * 
 * @param a11 
 * @param a21 
 * @param a12 
 * @param a22 
 * @param a13 
 * @param a23 
 * @returns 
 */
export function decomposeMatrix(a11: number, a21: number, a12: number, a22: number, a13: number, a23: number): MatrixDecomposition {
    // The identification of the matrix elements is...
    // |a b c|
    // |d e f|
    // |g h i|

    // M =
    //
    // | sx * cos φ, -sx * sin φ, tx |
    // | sy * sin φ,  sy * cos φ, ty |
    // | 0,           0,          1  |
    
    // S =
    //
    // | sx, 0,  0 |
    // | 0,  sy, 0 |
    // | 0,  0,  1 |

    // R =
    //
    // | cos φ, - sin φ, 0 |
    // | sin φ,   cos φ, 0 |
    // | 0,       0,     1 |

    // T =
    //
    // | 1, 0, tx |
    // | 0, 1, ty |
    // | 0, 0, 1  |

    // M = S * R * T

    // TODO: Include skewX, skewY
    // https://math.stackexchange.com/questions/237369/given-this-transformation-matrix-how-do-i-decompose-it-into-translation-rotati/417813
    // https://stackoverflow.com/questions/45159314/decompose-2d-transformation-matrix
    // https://stackoverflow.com/questions/28075743/how-do-i-compose-a-rotation-matrix-with-human-readable-angles-from-scratch/28084380#28084380
    // https://www.stemcstudio.com/gists/5c0bc63b847e3df02e57f0548ecce7a3

    return {
        translateX: a13,
        translateY: a23,
        scaleX: Math.sqrt(a11 * a11 + a21 * a21),
        scaleY: Math.sqrt(a12 * a12 + a22 * a22),
        // TODO: rotation is being reported in degrees.
        rotation: 180 * Math.atan2(a21, a11) / Math.PI
    };

}
