import { Matrix } from "../src/index";

/**
 * Number of digits when checking floating points are close to each other.
 */
const numDigits = 6;

describe("Matrix", function () {
    it("constructor", function () {
        const m = new Matrix();
        expect(m.a).toBe(1);
        expect(m.b).toBe(0);
        expect(m.c).toBe(0);
        expect(m.d).toBe(0);
        expect(m.e).toBe(1);
        expect(m.f).toBe(0);
        expect(m.g).toBe(0);
        expect(m.h).toBe(0);
        expect(m.i).toBe(1);
    });
    it("set", function () {
        const a = Math.random();
        const b = Math.random();
        const c = Math.random();
        const d = Math.random();
        const e = Math.random();
        const f = Math.random();
        const g = Math.random();
        const h = Math.random();
        const i = Math.random();
        const m = new Matrix();
        m.set(a, b, c, d, e, f, g, h, i);
        expect(m.a).toBeCloseTo(a, numDigits);
        expect(m.b).toBeCloseTo(b, numDigits);
        expect(m.c).toBeCloseTo(c, numDigits);
        expect(m.d).toBeCloseTo(d, numDigits);
        expect(m.e).toBeCloseTo(e, numDigits);
        expect(m.f).toBeCloseTo(f, numDigits);
        expect(m.g).toBeCloseTo(g, numDigits);
        expect(m.h).toBeCloseTo(h, numDigits);
        expect(m.i).toBeCloseTo(i, numDigits);
    });
    it("set_from_matrix", function () {
        const a = Math.random();
        const b = Math.random();
        const c = Math.random();
        const d = Math.random();
        const e = Math.random();
        const f = Math.random();
        const g = Math.random();
        const h = Math.random();
        const i = Math.random();
        const source = new Matrix();
        source.set(a, b, c, d, e, f, g, h, i);
        const m = new Matrix();
        m.set_from_matrix(source);
        expect(m.a).toBeCloseTo(a, numDigits);
        expect(m.b).toBeCloseTo(b, numDigits);
        expect(m.c).toBeCloseTo(c, numDigits);
        expect(m.d).toBeCloseTo(d, numDigits);
        expect(m.e).toBeCloseTo(e, numDigits);
        expect(m.f).toBeCloseTo(f, numDigits);
        expect(m.g).toBeCloseTo(g, numDigits);
        expect(m.h).toBeCloseTo(h, numDigits);
        expect(m.i).toBeCloseTo(i, numDigits);
    });
    it("copy", function () {
        const a = Math.random();
        const b = Math.random();
        const c = Math.random();
        const d = Math.random();
        const e = Math.random();
        const f = Math.random();
        const g = Math.random();
        const h = Math.random();
        const i = Math.random();
        const source = new Matrix();
        source.set(a, b, c, d, e, f, g, h, i);
        const m = new Matrix();
        m.copy(source);
        expect(m.a).toBeCloseTo(a, numDigits);
        expect(m.b).toBeCloseTo(b, numDigits);
        expect(m.c).toBeCloseTo(c, numDigits);
        expect(m.d).toBeCloseTo(d, numDigits);
        expect(m.e).toBeCloseTo(e, numDigits);
        expect(m.f).toBeCloseTo(f, numDigits);
        expect(m.g).toBeCloseTo(g, numDigits);
        expect(m.h).toBeCloseTo(h, numDigits);
        expect(m.i).toBeCloseTo(i, numDigits);
    });
    it("identity", function () {
        const a = Math.random();
        const b = Math.random();
        const c = Math.random();
        const d = Math.random();
        const e = Math.random();
        const f = Math.random();
        const g = Math.random();
        const h = Math.random();
        const i = Math.random();
        const m = new Matrix();
        m.set(a, b, c, d, e, f, g, h, i);
        m.identity();
        expect(m.a).toBe(1);
        expect(m.b).toBe(0);
        expect(m.c).toBe(0);
        expect(m.d).toBe(0);
        expect(m.e).toBe(1);
        expect(m.f).toBe(0);
        expect(m.g).toBe(0);
        expect(m.h).toBe(0);
        expect(m.i).toBe(1);
    });
});
