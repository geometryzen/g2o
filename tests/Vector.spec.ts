import { Vector } from "../src/index";

describe("Vector", function () {
    it("constructor", function () {
        const x = Math.random();
        const y = Math.random();
        const v = new Vector(x, y);
        expect(v.x).toBe(x);
        expect(v.y).toBe(y);
    });
    it("constructor should default to zero", function () {
        const v = new Vector();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });
    it("set x and set y", function () {
        const x = Math.random();
        const y = Math.random();
        const v = new Vector();
        v.x = x;
        v.y = y;
        expect(v.x).toBe(x);
        expect(v.y).toBe(y);
    });
});
