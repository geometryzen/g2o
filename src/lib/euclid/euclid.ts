import { G20 } from "../math/G20";
import { Disposable, dispose } from '../reactive/Disposable';
import { Circle } from "../shapes/circle";

/**
 * @deprecated Use CircleIntersection class instead so that resources may be disposed.
 */
export function circle_intersection(circleA: Circle, circleB: Circle): G20[] {
    const P1: G20 = G20.vector(0, 0);
    const P2: G20 = G20.vector(0, 0);
    const points: G20[] = [];
    const ca: G20 = G20.vector(0, 0);
    const cb: G20 = G20.vector(0, 0);
    /**
     * The vector from the center of circleA to the center of circleB.
     */
    const D: G20 = G20.vector(0, 0);
    let R: number = -1;
    let r: number = -1;
    function compute(): void {
        if (R !== -1 && r !== -1) {
            D.copy(cb).sub(ca);
            const dd = D.quaditude();
            const rr = r * r;
            const RR = R * R;
            const d = Math.sqrt(dd);
            const λ = (dd - rr + RR) / (2 * d);
            const aa = RR - λ * λ;
            if (aa >= 0) {
                const a = Math.sqrt(aa);
                const dhat = D.clone().divByNumber(d);
                const ahat = dhat.clone().mul(G20.I);
                const λdhat = dhat.clone().mulByNumber(λ);
                const avec = ahat.clone().mulByNumber(a);
                P1.copy(ca).add(λdhat).add(avec);
                P2.copy(ca).add(λdhat).sub(avec);
                points[0] = P1;
                points[1] = P2;
            }
            else {
                points.length = 0;
            }
        }
    }
    circleA.position.change$.subscribe((value) => {
        ca.copy(value);
        compute();
    });
    circleB.position.change$.subscribe((value) => {
        cb.copy(value);
        compute();
    });
    circleA.radius$.subscribe((value) => {
        R = value;
        compute();
    });
    circleB.radius$.subscribe((value) => {
        r = value;
        compute();
    });
    return points;
}

/**
 * The following calculation is coordinate-free.
 * For a coordinate-based solution see
 * https://mathworld.wolfram.com/Circle-CircleIntersection.html#:~:text=Two%20circles%20may%20intersect%20in,known%20as%20the%20radical%20line. 
 */
export class CircleIntersection implements Disposable {
    readonly #disposables: Disposable[] = [];
    readonly points: G20[] = [];
    constructor(circleA: Circle, circleB: Circle) {
        const P1: G20 = G20.vector(0, 0);
        const P2: G20 = G20.vector(0, 0);
        const ca: G20 = G20.vector(0, 0);
        const cb: G20 = G20.vector(0, 0);
        /**
         * The vector from the center of circleA to the center of circleB.
         */
        const D: G20 = G20.vector(0, 0);
        let R: number = -1;
        let r: number = -1;
        const compute = () => {
            if (R !== -1 && r !== -1) {
                D.copy(cb).sub(ca);
                const dd = D.quaditude();
                const rr = r * r;
                const RR = R * R;
                const d = Math.sqrt(dd);
                const λ = (dd - rr + RR) / (2 * d);
                const aa = RR - λ * λ;
                if (aa >= 0) {
                    const a = Math.sqrt(aa);
                    const dhat = D.clone().divByNumber(d);
                    const ahat = dhat.clone().mul(G20.I);
                    const λdhat = dhat.clone().mulByNumber(λ);
                    const avec = ahat.clone().mulByNumber(a);
                    P1.copy(ca).add(λdhat).add(avec);
                    P2.copy(ca).add(λdhat).sub(avec);
                    this.points[0] = P1;
                    this.points[1] = P2;
                }
                else {
                    this.points.length = 0;
                }
            }
        }
        this.#disposables.push(circleA.position.change$.subscribe((value) => {
            ca.copy(value);
            compute();
        }));
        this.#disposables.push(circleB.position.change$.subscribe((value) => {
            cb.copy(value);
            compute();
        }));
        this.#disposables.push(circleA.radius$.subscribe((value) => {
            R = value;
            compute();
        }));
        this.#disposables.push(circleB.radius$.subscribe((value) => {
            r = value;
            compute();
        }));
    }
    dispose(): void {
        dispose(this.#disposables);
    }
}