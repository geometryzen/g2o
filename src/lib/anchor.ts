import { Events } from './events.js';
import { Commands } from './utils/path-commands.js';
import { Vector } from './vector.js';

/**
 * @description An object that holds 3 {@link Two.Vector}s, the anchor point and its corresponding handles: `left` and `right`. In order to properly describe the bezier curve about the point there is also a command property to describe what type of drawing should occur when Two.js renders the anchors.
 */
export class Anchor extends Vector {

    readonly controls = {
        left: new Vector(),
        right: new Vector()
    };
    #command: 'M' | 'L' | 'C' | 'A' | 'Z' = Commands.move;
    #relative = true;

    #rx = 0;
    #ry = 0;
    #xAxisRotation = 0;
    #largeArcFlag = 0;
    #sweepFlag = 1;

    /**
     * @param x The x position of the root anchor point.
     * @param y The y position of the root anchor point.
     * @param ax The x position of the left handle point.
     * @param ay The y position of the left handle point.
     * @param bx The x position of the right handle point.
     * @param by The y position of the right handle point.
     * @param command The command to describe how to render. Applicable commands are {@link Two.Commands}
     */
    constructor(x = 0, y = 0, ax = 0, ay = 0, bx = 0, by = 0, command = Commands.move) {

        super(x, y);

        this.command = command;
        this.relative = true;

        const broadcast = Anchor.makeBroadcast(this);

        this.controls.left.set(ax, ay).addEventListener(Events.Types.change, broadcast);
        this.controls.right.set(bx, by).addEventListener(Events.Types.change, broadcast);
    }

    static makeBroadcast(scope: Anchor) {
        return broadcast;
        function broadcast() {
            if (scope.bound) {
                scope.dispatchEvent(Events.Types.change);
            }
        }
    }

    /**
     * @name Two.Anchor#copy
     * @function
     * @param {Two.Anchor} v - The anchor to apply values to.
     * @description Copy the properties of one {@link Two.Anchor} onto another.
     */
    copy(v: Anchor): this {

        this.x = v.x;
        this.y = v.y;

        if (typeof v.command === 'string') {
            this.command = v.command;
        }

        if (v.controls) {
            if (v.controls.left) {
                this.controls.left.copy(v.controls.left);
            }
            if (v.controls.right) {
                this.controls.right.copy(v.controls.right);
            }
        }

        if (typeof v.relative === 'boolean') {
            this.relative = v.relative;
        }

        if (typeof v.rx === 'number') {
            this.rx = v.rx;
        }
        if (typeof v.ry === 'number') {
            this.ry = v.ry;
        }
        if (typeof v.xAxisRotation === 'number') {
            this.xAxisRotation = v.xAxisRotation;
        }
        if (typeof v.largeArcFlag === 'number') {
            this.largeArcFlag = v.largeArcFlag;
        }
        if (typeof v.sweepFlag === 'number') {
            this.sweepFlag = v.sweepFlag;
        }

        return this;

    }
    get command() {
        return this.#command;
    }
    set command(command) {
        if (this.#command !== command) {
            this.#command = command;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
    get relative(): boolean {
        return this.#relative;
    }
    set relative(relative: boolean) {
        if (this.#relative !== !!relative) {
            this.#relative = !!relative;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
    get rx(): number {
        return this.#rx;
    }
    set rx(rx: number) {
        if (this.#rx !== rx) {
            this.#rx = rx;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
    get ry(): number {
        return this.#ry;
    }
    set ry(ry: number) {
        if (this.#ry !== ry) {
            this.#ry = ry;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
    get xAxisRotation(): number {
        return this.#xAxisRotation;
    }
    set xAxisRotation(xAxisRotation: number) {
        if (this.#xAxisRotation !== xAxisRotation) {
            this.#xAxisRotation = xAxisRotation;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
    get largeArcFlag() {
        return this.#largeArcFlag;
    }
    set largeArcFlag(largeArcFlag) {
        if (this.#largeArcFlag !== largeArcFlag) {
            this.#largeArcFlag = largeArcFlag;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
    get sweepFlag() {
        return this.#sweepFlag;
    }
    set sweepFlag(sweepFlag) {
        if (this.#sweepFlag !== sweepFlag) {
            this.#sweepFlag = sweepFlag;
            if (this.bound) {
                this.dispatchEvent(Events.Types.change);
            }
        }
    }
}
