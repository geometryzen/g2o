import { BehaviorSubject, Observable } from 'rxjs';

export class Vector {

    #x: number;
    #y: number;
    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    constructor(x = 0, y = 0) {
        this.#x = x;
        this.#y = y;

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();
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

    static zero = new Vector(0, 0);
    static left = new Vector(-1, 0);
    static right = new Vector(1, 0);
    static up = new Vector(0, -1);
    static down = new Vector(0, 1);

    static add(v1: Vector, v2: Vector): Vector {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }

    static sub(v1: Vector, v2: Vector): Vector {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
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

    set(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(v: Vector): this {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    clear(): this {
        this.x = 0;
        this.y = 0;
        return this;
    }

    add(rhs: Vector): this {
        this.x += rhs.x;
        this.y += rhs.y;
        return this;
    }

    sub(rhs: Vector) {
        this.x -= rhs.x;
        this.y -= rhs.y;
        return this;
    }

    multiplyScalar(s: number) {
        this.x = this.x * s;
        this.y = this.y * s;
        return this;
    }

    divideScalar(s: number) {
        this.x = this.x / s;
        this.y = this.y / s;
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
        return this.set(x, y);
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
