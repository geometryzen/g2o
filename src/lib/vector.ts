import { BehaviorSubject, Observable } from 'rxjs';
import { Accessor, Setter, createSignal } from 'solid-js';

export class Vector {

    readonly #x_coord: Accessor<number>;
    readonly #set_x_coord: Setter<number>;
    readonly #y_coord: Accessor<number>;
    readonly #set_y_coord: Setter<number>;
    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    constructor(x = 0, y = 0) {
        [this.#x_coord, this.#set_x_coord] = createSignal(x);
        [this.#y_coord, this.#set_y_coord] = createSignal(y);

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();
    }

    get x(): number {
        return this.#x_coord();
    }

    set x(x: number) {
        if (this.#x_coord() !== x) {
            this.#set_x_coord(x);
            this.#change.next(this);
        }
    }

    get y(): number {
        return this.#y_coord();
    }

    set y(y: number) {
        if (this.#y_coord() !== y) {
            this.#set_y_coord(y);
            this.#change.next(this);
        }
    }

    /**
     * @name Two.Vector.zero
     * @readonly
     * @property {Two.Vector} - Handy reference to a vector with component values 0, 0 at all times.
     */
    static zero = new Vector(0, 0);

    /**
     * @name Two.Vector.left
     * @readonly
     * @property {Two.Vector} - Handy reference to a vector with component values -1, 0 at all times.
     */
    static left = new Vector(-1, 0);

    /**
     * @name Two.Vector.right
     * @readonly
     * @property {Two.Vector} - Handy reference to a vector with component values 1, 0 at all times.
     */
    static right = new Vector(1, 0);

    /**
     * @name Two.Vector.up
     * @readonly
     * @property {Two.Vector} - Handy reference to a vector with component values 0, -1 at all times.
     */
    static up = new Vector(0, -1);

    /**
     * @name Two.Vector.down
     * @readonly
     * @property {Two.Vector} - Handy reference to a vector with component values 0, 1 at all times.
     */
    static down = new Vector(0, 1);

    /**
     * @name Two.Vector.add
     * @function
     * @param {Two.Vector} v1
     * @param {Two.Vector} v2
     * @returns {Two.Vector}
     * @description Add two vectors together.
     */
    static add(v1: Vector, v2: Vector): Vector {
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }

    /**
     * @name Two.Vector.sub
     * @function
     * @param {Two.Vector} v1
     * @param {Two.Vector} v2
     * @returns {Two.Vector}
     * @description Subtract two vectors: `v2` from `v1`.
     */
    static sub(v1: Vector, v2: Vector): Vector {
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }

    /**
     * @name Two.Vector.subtract
     * @function
     * @description Alias for {@link Two.Vector.sub}.
     */
    static subtract(v1: Vector, v2: Vector): Vector {
        return Vector.sub(v1, v2);
    }

    /**
     * @name Two.Vector.ratioBetween
     * @function
     * @param {Two.Vector} v1
     * @param {Two.Vector} v2
     * @returns {Number} The ratio betwen two points `v1` and `v2`.
     */
    static ratioBetween(v1: Vector, v2: Vector): number {
        return (v1.x * v2.x + v1.y * v2.y) / (v1.length() * v2.length());
    }

    static angleBetween(v1: Vector, v2: Vector): number {

        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;

        return Math.atan2(dy, dx);
    }

    /**
     * @name Two.Vector.distanceBetween
     * @function
     * @param {Two.Vector} v1
     * @param {Two.Vector} v2
     * @returns {Number} The distance between points `v1` and `v2`. Distance is always positive.
     */
    static distanceBetween(v1: Vector, v2: Vector): number {

        return Math.sqrt(Vector.distanceBetweenSquared(v1, v2));

    }

    /**
     * @name Two.Vector.distanceBetweenSquared
     * @function
     * @param {Two.Vector} v1
     * @param {Two.Vector} v2
     * @returns {Number} The squared distance between points `v1` and `v2`.
     */
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

    /**
     * @name Two.Vector#negate
     * @function
     * @description Invert each component's sign value.
     */
    negate(): this {
        return this.multiplyScalar(-1);
    }

    /**
     * @returns the [dot product](https://en.wikipedia.org/wiki/Dot_product) of the vector.
     */
    dot(v: Vector): number {
        return this.x * v.x + this.y * v.y;
    }

    /**
     * @returns the length of a vector.
     */
    length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    /**
     * @name Two.Vector#lengthSquared
     * @function
     * @returns {Number}
     * @description Get the length of the vector to the power of two. Widely used as less expensive than {@link Two.Vector#length} because it isn't square-rooting any numbers.
     */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * @name Two.Vector#normalize
     * @function
     * @description Normalize the vector from negative one to one.
     */
    normalize(): this {
        return this.divideScalar(this.length());
    }

    /**
     * @name Two.Vector#distanceTo
     * @function
     * @returns {Number}
     * @description Get the distance between two vectors.
     */
    distanceTo(v: Vector): number {
        return Math.sqrt(this.distanceToSquared(v));
    }

    /**
     * @name Two.Vector#distanceToSquared
     * @function
     * @returns {Number}
     * @description Get the distance between two vectors to the power of two. Widely used as less expensive than {@link Two.Vector#distanceTo} because it isn't square-rooting any numbers.
     */
    distanceToSquared(v: Vector): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    /**
     * @name Two.Vector#setLength
     * @function
     * @param {Number} l - length to set vector to.
     * @description Set the length of a vector.
     */
    setLength(l: number): this {
        return this.normalize().multiplyScalar(l);
    }

    /**
     * @name Two.Vector#equals
     * @function
     * @param {Two.Vector} v - The vector to compare against.
     * @param {Number} [eps=0.0001] - An options epsilon for precision.
     * @returns {Boolean}
     * @description Qualify if one vector roughly equal another. With a margin of error defined by epsilon.
     */
    equals(v: Vector, eps?: number): boolean {
        eps = (typeof eps === 'undefined') ? 0.0001 : eps;
        return (this.distanceTo(v) < eps);
    }

    /**
     * @name Two.Vector#lerp
     * @function
     * @param {Two.Vector} v - The destination vector to step towards.
     * @param {Number} t - The zero to one value of how close the current vector gets to the destination vector.
     * @description Linear interpolate one vector to another by an amount `t` defined as a zero to one number.
     * @see [Matt DesLauriers](https://twitter.com/mattdesl/status/1031305279227478016) has a good thread about this.
     */
    lerp(v: Vector, t: number): this {
        const x = (v.x - this.x) * t + this.x;
        const y = (v.y - this.y) * t + this.y;
        return this.set(x, y);
    }

    /**
     * @name Two.Vector#isZero
     * @function
     * @param {Number} [eps=0.0001] - Optional precision amount to check against.
     * @returns {Boolean}
     * @description Check to see if vector is roughly zero, based on the `epsilon` precision value.
     */
    isZero(eps: number): boolean {
        eps = (typeof eps === 'undefined') ? 0.0001 : eps;
        return (this.length() < eps);
    }

    /**
     * @name Two.Vector#toString
     * @function
     * @returns {String}
     * @description Return a comma-separated string of x, y value. Great for storing in a database.
     */
    toString(): string {
        return this.x + ', ' + this.y;
    }

    /**
     * @name Two.Vector#rotate
     * @function
     * @param {Number} radians - The amount to rotate the vector by in radians.
     * @description Rotate a vector.
     */
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
