import { BehaviorSubject } from 'rxjs';
import { Observable } from '../rxjs/Observable';
import { Bivector } from './Bivector';
import { gauss } from './gauss';
import { rotorFromDirections } from './rotorFromDirections';
import { Scalar } from './Scalar';
import { Spinor } from './Spinor';
import { Vector } from './Vector';


interface Geometric extends Vector, Bivector, Scalar, Spinor {
}

function is_zero_vector(v: Vector): boolean {
    return v.x === 0 && v.y === 0;
}

function is_zero_bivector(m: Bivector): boolean {
    return m.b === 0;
}

function is_zero_multivector(m: Geometric): boolean {
    return is_zero_vector(m) && is_zero_bivector(m) && m.a === 0 && m.b === 0;
}

/**
 * Sentinel value to indicate that the Geometric is not locked.
 * UNLOCKED is in the range -1 to 0.
 * @hidden
 */
const UNLOCKED = -1 * Math.random();

/**
 * Sets the lock on the multivector argument and returns the same argument.
 * This is a convenience function for the dunder (double underscore) methods.
 * All dunder methods should return locked values.
 * @hidden
 */
function lock(m: G20): G20 {
    m.lock();
    return m;
}

/**
 * @hidden
 */
function isScalar(m: G20): boolean {
    return m.x === 0 && m.y === 0 && m.b === 0;
}

/**
 * A multivector for two dimensions with a Euclidean metric.
 */
export class G20 {

    #a: number;
    #x: number;
    #y: number;
    #b: number;

    #lock = UNLOCKED;

    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    constructor(x = 0, y = 0, a = 0, b = 0) {
        this.#x = x;
        this.#y = y;
        this.#a = a;
        this.#b = b;

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();
    }

    static scalar(a: number): G20 {
        return new G20(0, 0, a, 0);
    }

    static bivector(b: number): G20 {
        return new G20(0, 0, 0, b);
    }

    static spinor(a: number, b: number): G20 {
        return new G20(0, 0, a, b);
    }

    static vector(x: number, y: number): G20 {
        return new G20(x, y, 0, 0);
    }

    /**
     * Determines whether this multivector is locked.
     * If the multivector is in the unlocked state then it is mutable.
     * If the multivector is in the locked state then it is immutable.
     */
    isLocked(): boolean {
        return this.#lock !== UNLOCKED;
    }

    isMutable(): boolean {
        return this.#lock === UNLOCKED;
    }

    /**
     * Locks this multivector (preventing any further mutation),
     * and returns a token that may be used to unlock it.
     */
    lock(): number {
        if (this.#lock !== UNLOCKED) {
            throw new Error("already locked");
        }
        else {
            this.#lock = Math.random();
            return this.#lock;
        }
    }

    /**
     * Unlocks this multivector (allowing mutation),
     * using a token that was obtained from a preceding lock method call.
     */
    unlock(token: number): this {
        if (this.#lock === UNLOCKED) {
            throw new Error("not locked");
        }
        else if (this.#lock === token) {
            this.#lock = UNLOCKED;
            return this;
        }
        else {
            throw new Error("unlock denied");
        }
    }

    get a(): number {
        return this.#a;
    }

    set a(a: number) {
        if (this.a !== a) {
            this.#a = a;
            this.#change.next(this);
        }
    }

    get x(): number {
        return this.#x;
    }

    set x(x: number) {
        if (this.x !== x) {
            this.#x = x;
            this.#change.next(this);
        }
    }

    get y(): number {
        return this.#y;
    }

    set y(y: number) {
        if (this.y !== y) {
            this.#y = y;
            this.#change.next(this);
        }
    }

    get b(): number {
        return this.#b;
    }

    set b(b: number) {
        if (this.b !== b) {
            this.#b = b;
            this.#change.next(this);
        }
    }

    static readonly one = lock(new G20(0, 0, 1, 0));
    static readonly zero = lock(new G20(0, 0, 0, 0));
    static readonly ex = lock(new G20(1, 0, 0, 0));
    static readonly ey = lock(new G20(0, 1, 0, 0));
    static readonly I = lock(new G20(0, 0, 0, 1));

    static add(v1: G20, v2: G20): G20 {
        const x = v1.x + v2.x;
        const y = v1.y + v2.y;
        const a = v1.a + v2.a;
        const b = v1.b + v2.b;
        return new G20(x, y, a, b);
    }

    static copy(mv: G20): G20 {
        return new G20(mv.x, mv.y, mv.a, mv.b);
    }
    static fromBivector(B: Bivector): G20 {
        return G20.bivector(B.b);
    }

    static fromScalar(alpha: Scalar): G20 {
        return G20.scalar(alpha.a);
    }

    static fromSpinor(R: Spinor): G20 {
        return G20.spinor(R.a, R.b);
    }

    static fromVector(v: Vector): G20 {
        return G20.vector(v.x, v.y);
    }

    static rotorFromDirections(a: Vector, b: Vector): G20 {
        return new G20(0, 0, 0, 0).rotorFromDirections(a, b);
    }

    static rotorFromVectorToVector(a: Vector, b: Vector): G20 {
        return new G20(0, 0, 0, 0).rotorFromVectorToVector(a, b);
    }

    static sub(v1: G20, v2: G20): G20 {
        const x = v1.x - v2.x;
        const y = v1.y - v2.y;
        const a = v1.a - v2.a;
        const b = v1.b - v2.b;
        return new G20(x, y, a, b);
    }

    static subtract(v1: G20, v2: G20): G20 {
        return G20.sub(v1, v2);
    }

    static ratioBetween(v1: G20, v2: G20): number {
        return (v1.x * v2.x + v1.y * v2.y) / (v1.magnitude() * v2.magnitude());
    }

    static angleBetween(v1: G20, v2: G20): number {

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;

        return Math.atan2(dy, dx);
    }

    static distanceBetween(v1: G20, v2: G20): number {

        return Math.sqrt(G20.distanceBetweenSquared(v1, v2));

    }

    static distanceBetweenSquared(v1: G20, v2: G20): number {

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;

        return dx * dx + dy * dy;
    }
    /**
     * @hidden
     */
    add2(a: G20, b: G20): G20 {
        if (is_zero_multivector(a)) {
            return this.set(b.x, b.y, b.a, b.b);
        }
        else if (is_zero_multivector(b)) {
            return this.set(a.x, a.y, a.a, a.b);
        }
        else {
            return this.set(a.x + b.x, a.y + b.y, a.a + b.a, a.b + b.b);
        }
    }
    addPseudo(β: number): G20 {
        if (this.isLocked()) {
            return lock(this.clone().addPseudo(β));
        }
        else {
            if (β === 0) {
                return this;
            }
            else {
                return this.set(this.x, this.y, this.a, this.b + β);
            }
        }
    }

    /**
     * Adds a multiple of a scalar to this multivector.
     * @param a The scalar value to be added to this multivector.
     * @param α The fraction of (a * uom) to be added. Default is 1.
     * @returns this + (a * uom) * α
     */
    addScalar(a: number, α = 1): G20 {
        if (this.isLocked()) {
            return lock(this.clone().addScalar(a, α));
        }
        else {
            if (this.isZero()) {
                this.a = a * α;
                return this;
            }
            else if (a === 0 || α === 0) {
                return this;
            }
            else {
                this.a += a * α;
                return this;
            }
        }
    }

    conj(): G20 {
        if (this.isLocked()) {
            return lock(this.clone().conj());
        }
        else {
            return this.set(-this.x, -this.y, this.a, -this.b);
        }
    }

    copy(v: G20): this {
        return this.set(v.x, v.y, v.a, v.b);
    }

    copySpinor(spinor: Spinor): this {
        const a = spinor.a;
        const b = spinor.b;
        return this.set(0, 0, a, b);
    }

    clear(): this {
        return this.set(0, 0, 0, 0);
    }

    clone(): G20 {
        return new G20(this.x, this.y, this.a, this.b);
    }
    /**
     * @param rhs The multivector dividend.
     * @returns this / m;
     */
    div(rhs: G20): G20 {
        if (this.isLocked()) {
            return lock(this.clone().div(rhs));
        }
        else {
            if (isScalar(rhs)) {
                return this.divByNumber(rhs.a);
            }
            else {
                return this.mul(G20.copy(rhs).inv());
            }
        }
    }

    /**
     * @param m
     * @returns this ^ m
     */
    ext(m: G20): G20 {
        if (this.isLocked()) {
            return lock(this.clone().ext(m));
        }
        else {
            const La = this.a;
            const Lx = this.x;
            const Ly = this.y;
            const Lb = this.b;
            const Ra = m.a;
            const Rx = m.x;
            const Ry = m.y;
            const Rb = m.b;
            const a = La * Ra;
            const x = La * Rx + Lx * Ra;
            const y = La * Ry + Ly * Ra;
            const b = La * Rb + Lx * Ry - Ly * Rx + Lb * Ra;
            return this.set(x, y, a, b);
        }
    }

    /**
     * Computes the right inverse of this multivector.
     * inv(X) satisfies X * inv(X) = 1.
     * @returns inverse(this)
     */
    inv(): G20 {
        if (this.isLocked()) {
            return lock(this.clone().inv());
        }
        else {
            const x0 = this.a;
            const x1 = this.x;
            const x2 = this.y;
            const x3 = this.b;

            const A = [
                [+x0, +x1, +x2, -x3],
                [+x1, +x0, -x3, +x2],
                [+x2, +x3, +x0, -x1],
                [+x3, +x2, -x1, +x0]
            ];

            const s = [1, 0, 0, 0];

            const X = gauss(A, s);

            const a = X[0];
            const x = X[1];
            const y = X[2];
            const b = X[3];

            return this.set(x, y, a, b);
        }
    }

    lco(rhs: G20): G20 {
        if (this.isLocked()) {
            return lock(this.clone().lco(rhs));
        }
        else {
            return this.#lco2(this, rhs);
        }
    }

    #lco2(lhs: G20, rhs: G20): this {
        const La = lhs.a;
        const Lx = lhs.x;
        const Ly = lhs.y;
        const Lb = lhs.b;
        const Ra = rhs.a;
        const Rx = rhs.x;
        const Ry = rhs.y;
        const Rb = rhs.b;
        const a = La * Ra + Lx * Rx + Ly * Ry - Lb * Rb;
        const x = La * Rx - Ly * Rb;
        const y = La * Ry + Lx * Rb;
        const b = La * Rb;
        return this.set(x, y, a, b);
    }

    add(rhs: G20): this {
        const x = this.x + rhs.x;
        const y = this.y + rhs.y;
        const a = this.a + rhs.a;
        const b = this.b + rhs.b;
        return this.set(x, y, a, b);
    }

    sub(rhs: G20): this {
        const x = this.x - rhs.x;
        const y = this.y - rhs.y;
        const a = this.a - rhs.a;
        const b = this.b - rhs.b;
        return this.set(x, y, a, b);
    }

    mulByNumber(s: number): this {
        const x = this.x * s;
        const y = this.y * s;
        const a = this.a * s;
        const b = this.b * s;
        return this.set(x, y, a, b);
    }

    /**
     * @param rhs
     * @returns this * m
     */
    mul(rhs: G20): G20 {
        if (this.isLocked()) {
            return lock(this.clone().mul(rhs));
        }
        else {
            return this.#mul2(this, rhs);
        }
    }

    /**
     * @hidden
     */
    #mul2(lhs: G20, rhs: G20): this {
        const La = lhs.a;
        const Lx = lhs.x;
        const Ly = lhs.y;
        const Lb = lhs.b;
        const Ra = rhs.a;
        const Rx = rhs.x;
        const Ry = rhs.y;
        const Rb = rhs.b;
        const a = La * Ra + Lx * Rx + Ly * Ry - Lb * Rb;
        const x = La * Rx + Lx * Ra - Ly * Rb + Lb * Ry;
        const y = La * Ry + Lx * Rb + Ly * Ra - Lb * Rx;
        const b = La * Rb + Lx * Ry - Ly * Rx + Lb * Ra;
        return this.set(x, y, a, b);
    }

    divByNumber(s: number): this {
        const x = this.x / s;
        const y = this.y / s;
        const a = this.a / s;
        const b = this.b / s;
        return this.set(x, y, a, b);
    }

    negate(): this {
        return this.mulByNumber(-1);
    }

    /**
     * @returns this * -1
     */
    neg(): G20 {
        if (this.isLocked()) {
            return lock(this.clone().neg());
        }
        else {
            const a = -this.a;
            const x = -this.x;
            const y = -this.y;
            const b = -this.b;
            return this.set(x, y, a, b);
        }
    }

    dot(v: G20): number {
        return this.x * v.x + this.y * v.y;
    }

    exp(): this {
        const w = this.a;
        const z = this.b;
        const expW = Math.exp(w);
        // φ is actually the absolute value of one half the rotation angle.
        // The orientation of the rotation gets carried in the bivector components.
        const φ = Math.sqrt(z * z);
        const s = expW * (φ !== 0 ? Math.sin(φ) / φ : 1);
        const a = expW * Math.cos(φ);
        const b = z * s;
        return this.set(0, 0, a, b);
    }

    magnitude(): number {
        return Math.sqrt(this.quaditude());
    }

    quaditude(): number {
        return this.x * this.x + this.y * this.y;
    }

    normalize(): this {
        return this.divByNumber(this.magnitude());
    }

    distanceTo(v: G20): number {
        return Math.sqrt(this.distanceToSquared(v));
    }

    distanceToSquared(v: G20): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    rco(m: G20): G20 {
        if (this.isLocked()) {
            return lock(this.clone().rco(m));
        }
        else {
            return this.#rco2(this, m);
        }
    }

    #rco2(lhs: G20, rhs: G20): this {
        const La = lhs.a;
        const Lx = lhs.x;
        const Ly = lhs.y;
        const Lb = lhs.b;
        const Ra = rhs.a;
        const Rx = rhs.x;
        const Ry = rhs.y;
        const Rb = rhs.b;
        const a = La * Ra + Lx * Rx + Ly * Ry - Lb * Rb;
        const x = Lx * Ra + Lb * Ry;
        const y = Ly * Ra - Lb * Rx;
        const b = Lb * Ra;
        return this.set(x, y, a, b);
    }

    /**
     * If `this` is mutable, then sets `this` multivector to its reflection in the plane orthogonal to vector n. The result is mutable.
     * If `this` is immutable (locked), a copy of `this` is made, which is then reflected. The result is immutable (locked).
     * 
     * i.e. The result is mutable (unlocked) iff `this` is mutable (unlocked). 
     *
     * Mathematically,
     *
     * this ⟼ - n * this * n
     *
     * Geometrically,
     *
     * Reflects this multivector in the plane orthogonal to the unit vector, n.
     * This implementation does assume that n is a vector, but does not assume that it is normalized to unity.
     *
     * If n is not a unit vector then the result is scaled by n squared.
     * The scalar component gets an extra minus sign. The pseudoscalar component does not change sign.
     * The units of measure are carried through but in most cases n SHOULD be dimensionless.
     *
     * @param n The unit vector that defines the reflection plane.
     */
    reflect(n: Readonly<Vector>): G20 {
        if (this.isLocked()) {
            return lock(this.clone().reflect(n));
        }
        else {
            const nx = n.x;
            const ny = n.y;
            const a = this.a;
            const x = this.x;
            const y = this.y;
            const b = this.b;

            const nx2 = nx * nx;
            const ny2 = ny * ny;
            const μ = nx2 - ny2;
            const λ = -2 * nx * ny;
            const β = nx2 + ny2;

            // The scalar component picks up a minus sign and the factor |n||n|.
            const A = -β * a;
            const X = λ * y - μ * x;
            const Y = λ * x + μ * y;
            // The pseudoscalar component does not change sign but still picks up the |n||n| factor.
            const B = β * b;
            // In most cases, n SHOULD be dimensionless.
            return this.set(X, Y, A, B);
        }
    }
    /**
     * <p>
     * Computes a rotor, R, from two unit vectors, where
     * R = (|b||a| + b * a) / sqrt(2 * |b||a|(|b||a| + b << a))
     * </p>
     * 
     * The result is independent of the magnitudes of a and b.
     *
     * @param a The starting vector
     * @param b The ending vector
     * @returns The rotor representing a rotation from a to b.
     */
    rotorFromDirections(a: Vector, b: Vector): G20 {
        if (this.isLocked()) {
            return lock(this.clone().rotorFromDirections(a, b));
        }
        else {
            rotorFromDirections(a, b, this);
            return this;
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    /*
    rotorFromFrameToFrame(es: Vector[], fs: Vector[]): G20 {
        throw new Error(notImplemented('rotorFromFrameToFrame').message);
    }
    */
    /**
     * Sets this multivector to a rotor that rotates through angle θ in the oriented plane defined by I.
     *
     * @param θ The rotation angle in radians when the rotor is applied on both sides as R * M * ~R
     */
    rotorFromAngle(θ: number): this {
        const φ = θ / 2;
        return this.set(0, 0, Math.cos(φ), -Math.sin(φ));
    }
    /**
     * R = sqrt(|b|/|a|) * (|b||a| + b * a) / sqrt(2 * |b||a|(|b||a| + b << a))
     *
     * The result is depends  on the magnitudes of a and b. 
     */
    rotorFromVectorToVector(a: Vector, b: Vector): G20 {
        if (this.isLocked()) {
            return lock(this.clone().rotorFromVectorToVector(a, b));
        }
        else {
            const ax = a.x;
            const ay = a.y;
            const bx = b.x;
            const by = b.y;
            const absB = Math.sqrt(bx * bx + by * by);
            const absA = Math.sqrt(ax * ax + ay * ay);
            const BA = absB * absA;
            const dotBA = bx * ax + by * ay;
            /**
             * q = b ^ a
             */
            const q = bx * ay - by * ax;
            const denom = Math.sqrt(2 * BA * (BA + dotBA));
            const f = Math.sqrt(absB) / (Math.sqrt(absA) * denom);

            const A = f * (BA + dotBA);
            const B = f * q;

            return this.set(0, 0, A, B);
        }
    }

    scale(α: number): G20 {
        return this.mulByNumber(α);
    }

    /**
     * @param m
     * @returns this | m
     */
    scp(m: G20): G20 {
        if (this.isLocked()) {
            return lock(this.clone().scp(m));
        }
        else {
            return this.scp2(this, m);
        }
    }

    /**
     * @hidden
     */
    scp2(lhs: G20, rhs: G20): this {
        const La = lhs.a;
        const Lx = lhs.x;
        const Ly = lhs.y;
        const Lb = lhs.b;

        const Ra = rhs.a;
        const Rx = rhs.x;
        const Ry = rhs.y;
        const Rb = rhs.b;

        const a = La * Ra + Lx * Rx + Ly * Ry - Lb * Rb;
        const x = 0;
        const y = 0;
        const b = 0;

        return this.set(x, y, a, b);
    }

    set(x: number, y: number, a = 0, b = 0): this {
        // Take special care to only fire changed event if necessary.
        const changed = (this.x !== x || this.y !== y || this.a !== a || this.b != b);
        this.#x = x;
        this.#y = y;
        this.#a = a;
        this.#b = b;
        if (changed) {
            this.#change.next(this);
        }
        return this;
    }

    setLength(l: number): this {
        return this.normalize().mulByNumber(l);
    }

    equals(v: G20, eps?: number): boolean {
        eps = (typeof eps === 'undefined') ? 0.0001 : eps;
        return (this.distanceTo(v) < eps);
    }

    lerp(v: G20, t: number): this {
        const x = (v.x - this.x) * t + this.x;
        const y = (v.y - this.y) * t + this.y;
        const a = (v.a - this.a) * t + this.a;
        const b = (v.b - this.b) * t + this.b;
        return this.set(x, y, a, b);
    }
    /**
     * Determines whether this multivector is exactly 0 (zero).
     */
    isZero(eps?: number): boolean {
        if (typeof eps === 'number') {
            return Math.abs(this.a) < eps && Math.abs(this.x) < eps && Math.abs(this.y) < eps && Math.abs(this.b) < eps;
        }
        else {
            return this.a === 0 && this.x === 0 && this.y === 0 && this.b === 0;
        }
    }

    toString(): string {
        return JSON.stringify({ x: this.x, y: this.y, a: this.a, b: this.b });
    }
    /**
     * reverse has a ++-- structure on the grades.
     * The scalar component, a, will not change.
     * The vector components, x and y, will not change.
     * The bivector component, b, will change sign.
     */
    rev(): G20 {
        if (this.isMutable()) {
            // reverse has a ++-- structure on the grades.
            const a = +this.a;
            const x = +this.x;
            const y = +this.y;
            const b = -this.b;
            // The unit of measure is unchanged.
            return this.set(x, y, a, b);
        }
        else {
            return lock(this.clone().rev());
        }
    }

    rotate(radians: number): this {
        const x0 = this.x;
        const y0 = this.y;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const x = x0 * cos - y0 * sin;
        const y = x0 * sin + y0 * cos;
        return this.set(x, y, this.a, this.b);
    }
    /**
     * Subtracts a multiple of a scalar from this multivector.
     * @param a The scalar value to be subtracted from this multivector.
     * @param uom The optional unit of measure.
     * @param α The fraction of (a * uom) to be subtracted. Default is 1.
     * @returns this - (a * uom) * α
     */
    subScalar(a: number, α = 1): G20 {
        if (this.isLocked()) {
            return lock(this.clone().subScalar(a, α));
        }
        else {
            if (this.isZero()) {
                this.a = - a * α;
                return this;
            }
            else if (a === 0 || α === 0) {
                return this;
            }
            else {
                this.a -= a * α;
                return this;
            }
        }
    }

    /**
     * <p>
     * <code>this ⟼ a * b</code>
     * </p>
     * Sets this Geometric2 to the geometric product a * b of the vector arguments.
     */
    versor(a: Vector, b: Vector): this {
        const A = a.x * b.x + a.y * b.y;
        const X = 0;
        const Y = 0;
        const B = a.x * b.y - a.y * b.x;
        return this.set(X, Y, A, B);
    }

    /**
     * @hidden
     */
    __div__(rhs: G20 | number): G20 {
        if (rhs instanceof G20) {
            return lock(this.clone().div(rhs));
        }
        else if (typeof rhs === 'number') {
            return lock(this.clone().divByNumber(rhs));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rdiv__(lhs: number | G20): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).div(this));
        }
        else if (typeof lhs === 'number') {
            return lock(G20.scalar(lhs).div(this));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __vbar__(rhs: number | G20): G20 {
        if (rhs instanceof G20) {
            return lock(G20.copy(this).scp(rhs));
        }
        else if (typeof rhs === 'number') {
            return lock(G20.copy(this).scp(G20.scalar(rhs)));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rvbar__(lhs: number | G20): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).scp(this));
        }
        else if (typeof lhs === 'number') {
            return lock(G20.scalar(lhs).scp(this));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __wedge__(rhs: number | G20): G20 {
        if (rhs instanceof G20) {
            return lock(G20.copy(this).ext(rhs));
        }
        else if (typeof rhs === 'number') {
            // The outer product with a scalar is scalar multiplication.
            return lock(G20.copy(this).mulByNumber(rhs));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rwedge__(lhs: number | G20): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).ext(this));
        }
        else if (typeof lhs === 'number') {
            // The outer product with a scalar is scalar multiplication, and commutes.
            return lock(G20.copy(this).mulByNumber(lhs));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __lshift__(rhs: number | G20): G20 {
        if (rhs instanceof G20) {
            return lock(G20.copy(this).lco(rhs));
        }
        else if (typeof rhs === 'number') {
            return lock(G20.copy(this).lco(G20.scalar(rhs)));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rlshift__(lhs: number | G20): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).lco(this));
        }
        else if (typeof lhs === 'number') {
            return lock(G20.scalar(lhs).lco(this));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rshift__(rhs: number | G20): G20 {
        if (rhs instanceof G20) {
            return lock(G20.copy(this).rco(rhs));
        }
        else if (typeof rhs === 'number') {
            return lock(G20.copy(this).rco(G20.scalar(rhs)));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rrshift__(lhs: number | G20): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).rco(this));
        }
        else if (typeof lhs === 'number') {
            return lock(G20.scalar(lhs).rco(this));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __bang__(): G20 {
        return lock(G20.copy(this).inv());
    }
    /**
     * @hidden
     */
    __eq__(rhs: G20 | number): boolean {
        if (rhs instanceof G20) {
            return this.equals(rhs);
        }
        else if (typeof rhs === 'number') {
            return this.equals(G20.scalar(rhs));
        }
        else {
            return false;
        }
    }
    /**
     * @hidden
     */
    __ne__(rhs: G20 | number): boolean {
        if (rhs instanceof G20) {
            return !this.equals(rhs);
        }
        else if (typeof rhs === 'number') {
            return !this.equals(G20.scalar(rhs));
        }
        else {
            return true;
        }
    }
    /**
     * @hidden
     */
    __tilde__(): G20 {
        return lock(G20.copy(this).rev());
    }
    /**
     * @hidden
     */
    __add__(rhs: G20 | number): G20 {
        if (rhs instanceof G20) {
            return lock(this.clone().add(rhs));
        }
        else if (typeof rhs === 'number') {
            return lock(this.clone().addScalar(rhs, 1));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __radd__(lhs: G20 | number): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).add(this));
        }
        else if (typeof lhs === 'number') {
            return lock(G20.scalar(lhs).add(this));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __sub__(rhs: G20 | number): G20 {
        if (rhs instanceof G20) {
            return lock(this.clone().sub(rhs));
        }
        else if (typeof rhs === 'number') {

            return lock(this.clone().subScalar(rhs, 1));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rsub__(lhs: G20 | number): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).sub(this));
        }
        else if (typeof lhs === 'number') {
            return lock(G20.scalar(lhs).sub(this));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __pos__(): G20 {
        return lock(G20.copy(this));
    }
    /**
     * @hidden
     */
    __neg__(): G20 {
        return lock(G20.copy(this).neg());
    }
    /**
     * @hidden
     */
    __mul__(rhs: G20 | number): G20 {
        if (rhs instanceof G20) {
            return lock(this.clone().mul(rhs));
        }
        else if (typeof rhs === 'number') {
            return lock(this.clone().mulByNumber(rhs));
        }
        else {
            return void 0;
        }
    }
    /**
     * @hidden
     */
    __rmul__(lhs: G20 | number): G20 {
        if (lhs instanceof G20) {
            return lock(G20.copy(lhs).mul(this));
        }
        else if (typeof lhs === 'number') {
            // The ordering of operands is not important for scalar multiplication.
            return lock(G20.copy(this).mulByNumber(lhs));
        }
        else {
            return void 0;
        }
    }
}
