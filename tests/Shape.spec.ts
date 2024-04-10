import { G20, Group, Shape } from "../src/index";
import { Constants } from "../src/lib/constants";

class MockShape extends Shape<Group> {
    _flagVisible: boolean;
    automatic: boolean;
    beginning: number;
    cap: string;
    clip: boolean;
    closed: boolean;
    curved: boolean;
    ending: number;
    fill: string;
    join: string;
    length: number;
    linewidth: number;
    miter: number;
    stroke: string;
    visible: boolean;
    constructor() {
        super({ attitude: G20.one.clone(), position: G20.zero.clone() });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getBoundingClientRect(shallow?: boolean): { width: number; height: number; top?: number; left?: number; right?: number; bottom?: number } {
        throw new Error();
    }
    hasBoundingClientRect(): boolean {
        throw new Error("Method not implemented.");
    }
    noFill() {
        return this;
    }
    noStroke() {
        return this;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subdivide(limit: number): this {
        throw new Error("Method not implemented.");
    }
}

describe("Shape", function () {
    it("constructor", function () {
        const shape = new MockShape();
        expect(shape.id.startsWith(Constants.Identifier)).toBe(true);
    });
});
