import { BehaviorSubject } from 'rxjs';
import { Observable } from './rxjs/Observable.js';
import { Subscription } from './rxjs/Subscription.js';
import { Commands } from './utils/path-commands.js';
import { G20 } from './vector.js';

export class Anchor {
    /**
     * default is zero.
     */
    readonly origin = new G20();
    #origin_change: Subscription | null = null;
    readonly controls = {
        left: new G20(),
        right: new G20()
    };
    #a_change: Subscription | null = null;
    #b_change: Subscription | null = null;

    #command: 'M' | 'L' | 'C' | 'A' | 'Z';
    #relative: boolean;

    #rx: number;
    #ry: number;
    #xAxisRotation: number;
    #largeArcFlag: number;
    #sweepFlag: number;

    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    #t: number;

    /**
     * @param x The x position of the root anchor point.
     * @param y The y position of the root anchor point.
     * @param ax The x position of the left handle point.
     * @param ay The y position of the left handle point.
     * @param bx The x position of the right handle point.
     * @param by The y position of the right handle point.
     * @param command The command to describe how to render. Applicable commands are {@link Commands}
     */
    constructor(x = 0, y = 0, ax = 0, ay = 0, bx = 0, by = 0, command: 'M' | 'L' | 'C' | 'A' | 'Z' = Commands.move) {

        this.origin.set(x, y);
        this.controls.left.set(ax, ay);
        this.controls.right.set(bx, by);

        this.#command = command;
        this.#relative = true;
        this.#rx = 0;
        this.#ry = 0;
        this.#xAxisRotation = 0;
        this.#largeArcFlag = 0;
        this.#sweepFlag = 1;

        this.#t = 0;

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();

        this.#origin_change = this.origin.change$.subscribe(() => {
            this.#change.next(this);
        });
        this.#a_change = this.controls.left.change$.subscribe(() => {
            this.#change.next(this);
        });
        this.#b_change = this.controls.right.change$.subscribe(() => {
            this.#change.next(this);
        });
    }

    dispose(): void {
        if (this.#origin_change) {
            this.#origin_change.unsubscribe();
            this.#origin_change = null;
        }
        if (this.#a_change) {
            this.#a_change.unsubscribe();
            this.#a_change = null;
        }
        if (this.#b_change) {
            this.#b_change.unsubscribe();
            this.#b_change = null;
        }
    }

    get x() {
        return this.origin.x;
    }

    set x(x: number) {
        this.origin.x = x;
    }

    get y() {
        return this.origin.y;
    }

    set y(y: number) {
        this.origin.y = y;
    }

    get t(): number {
        return this.#t;
    }
    set t(t: number) {
        if (this.t !== t) {
            this.#t = t;
        }
    }

    copy(v: Anchor): this {

        this.origin.copy(v.origin);
        this.command = v.command;
        this.controls.left.copy(v.controls.left);
        this.controls.right.copy(v.controls.right);
        this.relative = v.relative;
        this.rx = v.rx;
        this.ry = v.ry;
        this.xAxisRotation = v.xAxisRotation;
        this.largeArcFlag = v.largeArcFlag;
        this.sweepFlag = v.sweepFlag;

        return this;
    }

    /**
     * Invoked when the path is automatic (not manual).
     */
    ignore(): void {
        throw new Error("TODO: Anchor.ignore()");
    }

    /**
     * Invoked when the path is manual (not automatic).
     */
    listen(): void {
        // Do nothing.
        // throw new Error("TODO: Anchor.listen()");
    }

    /**
     * default is 'M'.
     */
    get command(): 'M' | 'L' | 'C' | 'A' | 'Z' {
        return this.#command;
    }
    set command(command: 'M' | 'L' | 'C' | 'A' | 'Z') {
        if (this.command !== command) {
            this.#command = command;
        }
    }
    /**
     * default is true.
     */
    get relative(): boolean {
        return this.#relative;
    }
    set relative(relative: boolean) {
        if (this.relative !== !!relative) {
            this.#relative = relative;
        }
    }
    /**
     * default is zero.
     */
    get rx(): number {
        return this.#rx;
    }
    set rx(rx: number) {
        if (this.rx !== rx) {
            this.#rx = rx;
        }
    }
    /**
     * default is zero.
     */
    get ry(): number {
        return this.#ry;
    }
    set ry(ry: number) {
        if (this.ry !== ry) {
            this.#ry = ry;
        }
    }
    /**
     * default is zero.
     */
    get xAxisRotation(): number {
        return this.#xAxisRotation;
    }
    set xAxisRotation(xAxisRotation: number) {
        if (this.xAxisRotation !== xAxisRotation) {
            this.#xAxisRotation = xAxisRotation;
        }
    }
    /**
     * default is zero.
     */
    get largeArcFlag(): number {
        return this.#largeArcFlag;
    }
    set largeArcFlag(largeArcFlag) {
        if (this.largeArcFlag !== largeArcFlag) {
            this.#largeArcFlag = largeArcFlag;
        }
    }
    /**
     * default is one.
     */
    get sweepFlag(): number {
        return this.#sweepFlag;
    }
    set sweepFlag(sweepFlag) {
        if (this.sweepFlag !== sweepFlag) {
            this.#sweepFlag = sweepFlag;
        }
    }
}
