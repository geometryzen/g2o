import { BehaviorSubject } from 'rxjs';
import { Observable } from './rxjs/Observable';

/**
 * A multivector for two dimensions with a Euclidean metric.
 */
export class Vector {
    #a: number;
    #x: number;
    #y: number;
    #b: number;

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

    static one = new Vector(0, 0, 1, 0);
    static zero = new Vector(0, 0);
    static left = new Vector(-1, 0);
    static right = new Vector(1, 0);
    static up = new Vector(0, -1);
    static down = new Vector(0, 1);
    static I = new Vector(0, 0, 0, 1);

    static add(v1: Vector, v2: Vector): Vector {
        const x = v1.x + v2.x;
        const y = v1.y + v2.y;
        const a = v1.a + v2.a;
        const b = v1.b + v2.b;
        return new Vector(x, y, a, b);
    }

    static sub(v1: Vector, v2: Vector): Vector {
        const x = v1.x - v2.x;
        const y = v1.y - v2.y;
        const a = v1.a - v2.a;
        const b = v1.b - v2.b;
        return new Vector(x, y, a, b);
    }

    static subtract(v1: Vector, v2: Vector): Vector {
        return Vector.sub(v1, v2);
    }

    static ratioBetween(v1: Vector, v2: Vector): number {
        return (v1.x * v2.x + v1.y * v2.y) / (v1.length() * v2.length());
    }

    static angleBetween(v1: Vector, v2: Vector): number {

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;

        return Math.atan2(dy, dx);
    }

    static distanceBetween(v1: Vector, v2: Vector): number {

        return Math.sqrt(Vector.distanceBetweenSquared(v1, v2));

    }

    static distanceBetweenSquared(v1: Vector, v2: Vector): number {

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;

        return dx * dx + dy * dy;
    }

    copy(v: Vector): this {
        return this.set(v.x, v.y, v.a, v.b);
    }

    clear(): this {
        return this.set(0, 0, 0, 0);
    }

    clone(): Vector {
        return new Vector(this.x, this.y, this.a, this.b);
    }

    add(rhs: Vector): this {
        const x = this.x + rhs.x;
        const y = this.y + rhs.y;
        const a = this.a + rhs.a;
        const b = this.b + rhs.b;
        return this.set(x, y, a, b);
    }

    sub(rhs: Vector): this {
        const x = this.x - rhs.x;
        const y = this.y - rhs.y;
        const a = this.a - rhs.a;
        const b = this.b - rhs.b;
        return this.set(x, y, a, b);
    }

    multiplyScalar(s: number): this {
        const x = this.x * s;
        const y = this.y * s;
        const a = this.a * s;
        const b = this.b * s;
        return this.set(x, y, a, b);
    }

    divideScalar(s: number): this {
        const x = this.x / s;
        const y = this.y / s;
        const a = this.a / s;
        const b = this.b / s;
        return this.set(x, y, a, b);
    }

    negate(): this {
        return this.multiplyScalar(-1);
    }

    dot(v: Vector): number {
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

    length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    normalize(): this {
        return this.divideScalar(this.length());
    }

    distanceTo(v: Vector): number {
        return Math.sqrt(this.distanceToSquared(v));
    }

    distanceToSquared(v: Vector): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
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
        return this.normalize().multiplyScalar(l);
    }

    equals(v: Vector, eps?: number): boolean {
        eps = (typeof eps === 'undefined') ? 0.0001 : eps;
        return (this.distanceTo(v) < eps);
    }

    lerp(v: Vector, t: number): this {
        const x = (v.x - this.x) * t + this.x;
        const y = (v.y - this.y) * t + this.y;
        const a = (v.a - this.a) * t + this.a;
        const b = (v.b - this.b) * t + this.b;
        return this.set(x, y, a, b);
    }

    isZero(eps: number): boolean {
        eps = (typeof eps === 'undefined') ? 0.0001 : eps;
        return (this.length() < eps);
    }

    toString(): string {
        return this.x + ', ' + this.y;
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
}
