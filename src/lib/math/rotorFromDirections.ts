import { dotVectorE2 as dot } from './dotVectorE2';
import { G20 } from './G20';
import { quadVectorE2 as quad } from './quadVectorE2';
import { Vector } from './Vector';

/**
 * @hidden
 */
const sqrt = Math.sqrt;

/**
 * @hidden
 * Sets this multivector to a rotor representing a rotation from a to b.
 * R = (|b||a| + b * a) / sqrt(2 * |b||a|(|b||a| + b << a))
 * Returns undefined (void 0) if the vectors are anti-parallel.
 * 
 * @param a The 'from' vector. 
 * @param b The 'to' vector.
 * @param m The output multivector.
 */
export function rotorFromDirections(a: Readonly<Vector>, b: Readonly<Vector>, m: G20): void {
    const quadA = quad(a);
    const absA = sqrt(quadA);
    const quadB = quad(b);
    const absB = sqrt(quadB);
    const BA = absB * absA;
    const dotBA = dot(b, a);
    const denom = sqrt(2 * (quadB * quadA + BA * dotBA));
    if (denom !== 0) {
        // m.versor(b, a);
        const A = a.x * b.x + a.y * b.y;
        const X = 0;
        const Y = 0;
        const B = a.x * b.y - a.y * b.x;
        // m.addScalar(BA, 1);
        // m.divByNumber(denom);
        m.set(X / denom, Y / denom, (A + BA) / denom, B / denom);
    }
    else {
        // The denominator is zero when |a||b| + a << b = 0.
        // If θ is the angle between a and b, then  cos(θ) = (a << b) /|a||b| = -1
        // Then a and b are anti-parallel.
        // The plane of the rotation is ambiguous.
    }
}
