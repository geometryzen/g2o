import { G20 } from "../src/index";

describe("G20", function () {
    it("constructor", function () {
        const x = Math.random();
        const y = Math.random();
        const v = new G20(x, y);
        expect(v.x).toBe(x);
        expect(v.y).toBe(y);
    });
    it("constructor should default to zero", function () {
        const v = new G20();
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
    });
    it("set x and set y", function () {
        const x = Math.random();
        const y = Math.random();
        const v = new G20();
        v.x = x;
        v.y = y;
        expect(v.x).toBe(x);
        expect(v.y).toBe(y);
    });
});
