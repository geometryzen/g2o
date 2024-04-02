import { BehaviorSubject, Observable } from 'rxjs';

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

    set(x: number, y: number, a = 0, b = 0): this {
        this.x = x;
        this.y = y;
        this.a = a;
        this.b = b;
        return this;
    }

    copy(v: Vector): this {
        this.x = v.x;
        this.y = v.y;
        this.a = v.a;
        this.b = v.b;
        return this;
    }

    clear(): this {
        this.x = 0;
        this.y = 0;
        this.a = 0;
        this.b = 0;
        return this;
    }

    add(rhs: Vector): this {
        this.x += rhs.x;
        this.y += rhs.y;
        this.a += rhs.a;
        this.b += rhs.b;
        return this;
    }

    sub(rhs: Vector): this {
        this.x -= rhs.x;
        this.y -= rhs.y;
        this.a -= rhs.a;
        this.b -= rhs.b;
        return this;
    }

    multiplyScalar(s: number): this {
        this.x = this.x * s;
        this.y = this.y * s;
        this.a = this.a * s;
        this.b = this.b * s;
        return this;
    }

    divideScalar(s: number): this {
        this.x = this.x / s;
        this.y = this.y / s;
        this.a = this.a / s;
        this.b = this.b / s;
        return this;
    }

    negate(): this {
        return this.multiplyScalar(-1);
    }

    dot(v: Vector): number {
        return this.x * v.x + this.y * v.y;
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
        const x = this.x;
        const y = this.y;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        this.x = x * cos - y * sin;
        this.y = x * sin + y * cos;
        return this;
    }
}
