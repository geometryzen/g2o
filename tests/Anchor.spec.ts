import { createEffect } from 'solid-js';
import { Anchor } from "../src/index";
import { Commands } from "../src/lib/utils/path-commands";

const booleans = [true, false];
const commands = [Commands.arc, Commands.close, Commands.curve, Commands.line, Commands.move];

function random<T>(xs: T[]): T {
    return xs[Math.floor(Math.random() * xs.length)];
}

describe("Anchor", function () {
    it("constructor", function () {
        const x = Math.random();
        const y = Math.random();
        const ax = Math.random();
        const ay = Math.random();
        const bx = Math.random();
        const by = Math.random();
        const command = random(commands);
        const anchor = new Anchor(x, y, ax, ay, bx, by, command);
        expect(anchor.origin.x).toBe(x);
        expect(anchor.origin.y).toBe(y);
        expect(anchor.controls.left.x).toBe(ax);
        expect(anchor.controls.left.y).toBe(ay);
        expect(anchor.controls.right.x).toBe(bx);
        expect(anchor.controls.right.y).toBe(by);
        expect(anchor.command).toBe(command);
        expect(anchor.largeArcFlag).toBe(0);
        expect(anchor.sweepFlag).toBe(1);
        expect(anchor.relative).toBe(true);
    });
    it("defaults", function () {
        const anchor = new Anchor();
        expect(anchor.origin.x).toBe(0);
        expect(anchor.origin.y).toBe(0);
        expect(anchor.controls.left.x).toBe(0);
        expect(anchor.controls.left.y).toBe(0);
        expect(anchor.controls.right.x).toBe(0);
        expect(anchor.controls.right.y).toBe(0);
        expect(anchor.command).toBe('M');
        expect(anchor.largeArcFlag).toBe(0);
        expect(anchor.relative).toBe(true);
        expect(anchor.rx).toBe(0);
        expect(anchor.ry).toBe(0);
        expect(anchor.sweepFlag).toBe(1);
        expect(anchor.xAxisRotation).toBe(0);
    });
    it("copy", function () {
        const x = Math.random();
        const y = Math.random();
        const ax = Math.random();
        const ay = Math.random();
        const bx = Math.random();
        const by = Math.random();
        const command = random(commands);
        const original = new Anchor(x, y, ax, ay, bx, by, command);
        const anchor = new Anchor();
        anchor.copy(original);
        expect(anchor.origin.x).toBe(x);
        expect(anchor.origin.y).toBe(y);
        expect(anchor.controls.left.x).toBe(ax);
        expect(anchor.controls.left.y).toBe(ay);
        expect(anchor.controls.right.x).toBe(bx);
        expect(anchor.controls.right.y).toBe(by);
        expect(anchor.command).toBe(command);
    });
    it("setters", function () {
        const x = Math.random();
        const y = Math.random();
        const ax = Math.random();
        const ay = Math.random();
        const bx = Math.random();
        const by = Math.random();
        const command = random(commands);
        const relative = random(booleans);
        const rx = Math.random();
        const ry = Math.random();
        const xAxisRotation = Math.random();
        const largeArcFlag = Math.random();
        const sweepFlag = Math.random();

        const anchor = new Anchor();
        anchor.origin.set(x, y);
        anchor.controls.left.set(ax, ay);
        anchor.controls.right.set(bx, by);
        anchor.command = command;
        anchor.relative = relative;
        anchor.rx = rx;
        anchor.ry = ry;
        anchor.xAxisRotation = xAxisRotation;
        anchor.largeArcFlag = largeArcFlag;
        anchor.sweepFlag = sweepFlag;

        expect(anchor.origin.x).toBe(x);
        expect(anchor.origin.y).toBe(y);
        expect(anchor.controls.left.x).toBe(ax);
        expect(anchor.controls.left.y).toBe(ay);
        expect(anchor.controls.right.x).toBe(bx);
        expect(anchor.controls.right.y).toBe(by);
        expect(anchor.command).toBe(command);
        expect(anchor.relative).toBe(relative);
        expect(anchor.rx).toBe(rx);
        expect(anchor.ry).toBe(ry);
        expect(anchor.xAxisRotation).toBe(xAxisRotation);
        expect(anchor.largeArcFlag).toBe(largeArcFlag);
        expect(anchor.sweepFlag).toBe(sweepFlag);
    });
    it("setters without changes", function () {
        const x = Math.random();
        const y = Math.random();
        const ax = Math.random();
        const ay = Math.random();
        const bx = Math.random();
        const by = Math.random();
        const command = random(commands);
        const relative = random(booleans);

        const anchor = new Anchor(x, y, ax, ay, bx, by, command);
        const ditto = new Anchor(x, y, ax, ay, bx, by, command);
        anchor.origin.set(ditto.origin.x, ditto.origin.y);
        anchor.controls.left.set(ax, ay);
        anchor.controls.right.set(bx, by);
        anchor.command = command;
        anchor.relative = relative;
        anchor.rx = ditto.rx;
        anchor.ry = ditto.ry;
        anchor.xAxisRotation = ditto.xAxisRotation;
        anchor.largeArcFlag = ditto.largeArcFlag;
        anchor.sweepFlag = ditto.sweepFlag;

        // Now do it again.
        anchor.relative = relative;
        anchor.command = command;

        expect(anchor.origin.x).toBe(x);
        expect(anchor.origin.y).toBe(y);
        expect(anchor.controls.left.x).toBe(ax);
        expect(anchor.controls.left.y).toBe(ay);
        expect(anchor.controls.right.x).toBe(bx);
        expect(anchor.controls.right.y).toBe(by);
        expect(anchor.command).toBe(command);
        expect(anchor.relative).toBe(relative);
    });
    it("relative", function () {
        const anchor = new Anchor();

        const relatives: boolean[] = [];
        createEffect(() => {
            console.log("relative", anchor.relative);
            relatives.push(anchor.relative);
        });

        expect(relatives.length).toBe(0);

        expect(anchor.relative).toBe(true);
        anchor.relative = true;
        expect(anchor.relative).toBe(true);
        anchor.relative = false;
        expect(anchor.relative).toBe(false);
        anchor.relative = true;
        expect(anchor.relative).toBe(true);

        expect(relatives.length).toBe(0);

        return new Promise<void>((resolve, reject) => {
            try {
                queueMicrotask(() => {
                    console.log("microtask");
                    expect(relatives.length).toBe(0);
                    resolve();
                });
            }
            catch (e) {
                reject(e);
            }
        });
    });
});
