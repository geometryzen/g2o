import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Signal, createSignal } from 'solid-js';
import { Commands } from './utils/path-commands.js';
import { Vector } from './vector.js';

export class Anchor {
    /**
     * default is zero.
     */
    readonly origin = new Vector();
    #origin_change_subscription: Subscription | null = null;
    readonly controls = {
        left: new Vector(),
        right: new Vector()
    };
    #a_change_subscription: Subscription | null = null;
    #b_change_subscription: Subscription | null = null;

    readonly #command: Signal<'M' | 'L' | 'C' | 'A' | 'Z'>;
    readonly #relative: Signal<boolean>;

    readonly #rx: Signal<number>;
    readonly #ry: Signal<number>;
    readonly #xAxisRotation: Signal<number>;
    readonly #largeArcFlag: Signal<number>;
    readonly #sweepFlag: Signal<number>;

    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

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

        this.#command = createSignal(command);
        this.#relative = createSignal(true);
        this.#rx = createSignal(0);
        this.#ry = createSignal(0);
        this.#xAxisRotation = createSignal(0);
        this.#largeArcFlag = createSignal(0);
        this.#sweepFlag = createSignal(1);

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();

        this.#origin_change_subscription = this.origin.change$.subscribe(() => {
            this.#change.next(this);
        });
        this.#a_change_subscription = this.controls.left.change$.subscribe(() => {
            this.#change.next(this);
        });
        this.#b_change_subscription = this.controls.right.change$.subscribe(() => {
            this.#change.next(this);
        });
    }

    dispose(): void {
        if (this.#origin_change_subscription) {
            this.#origin_change_subscription.unsubscribe();
            this.#origin_change_subscription = null;
        }
        if (this.#a_change_subscription) {
            this.#a_change_subscription.unsubscribe();
            this.#a_change_subscription = null;
        }
        if (this.#b_change_subscription) {
            this.#b_change_subscription.unsubscribe();
            this.#b_change_subscription = null;
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
     * default is 'M'.
     */
    get command(): 'M' | 'L' | 'C' | 'A' | 'Z' {
        return this.#command[0]();
    }
    set command(command: 'M' | 'L' | 'C' | 'A' | 'Z') {
        if (this.command !== command) {
            this.#command[1](command);
        }
    }
    /**
     * default is true.
     */
    get relative(): boolean {
        return this.#relative[0]();
    }
    set relative(relative: boolean) {
        if (this.relative !== !!relative) {
            this.#relative[1](relative);
        }
    }
    /**
     * default is zero.
     */
    get rx(): number {
        return this.#rx[0]();
    }
    set rx(rx: number) {
        if (this.rx !== rx) {
            this.#rx[1](rx);
        }
    }
    /**
     * default is zero.
     */
    get ry(): number {
        return this.#ry[0]();
    }
    set ry(ry: number) {
        if (this.ry !== ry) {
            this.#ry[1](ry);
        }
    }
    /**
     * default is zero.
     */
    get xAxisRotation(): number {
        return this.#xAxisRotation[0]();
    }
    set xAxisRotation(xAxisRotation: number) {
        if (this.xAxisRotation !== xAxisRotation) {
            this.#xAxisRotation[1](xAxisRotation);
        }
    }
    /**
     * default is zero.
     */
    get largeArcFlag(): number {
        return this.#largeArcFlag[0]();
    }
    set largeArcFlag(largeArcFlag) {
        if (this.largeArcFlag !== largeArcFlag) {
            this.#largeArcFlag[1](largeArcFlag);
        }
    }
    /**
     * default is one.
     */
    get sweepFlag(): number {
        return this.#sweepFlag[0]();
    }
    set sweepFlag(sweepFlag) {
        if (this.sweepFlag !== sweepFlag) {
            this.#sweepFlag[1](sweepFlag);
        }
    }
}
