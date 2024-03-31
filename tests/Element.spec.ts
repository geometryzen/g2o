import { Element, Group } from "../src/index";

class MockElement extends Element<Group> {
    constructor() {
        super();
    }
}

describe("Element", function () {
    it("constructor", function () {
        const element = new MockElement();
        expect(element.id).toBe(null);
    });
});
