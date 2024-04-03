import { Subscription } from "./rxjs/Subscription";
import { Board } from "./board";

export class Player {
    readonly #two: Board;
    readonly #frameCount: Subscription;
    /**
     * The handle of the last frame requested.
     */
    #handle: number | null = null;
    constructor(two: Board, callback: (frameCount: number) => void) {
        this.#two = two;
        this.#frameCount = two.frameCount$.subscribe(callback);
    }
    dispose(): void {
        if (this.#frameCount) {
            this.#frameCount.unsubscribe();
        }
    }
    play(): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const animate = (timestamp: number) => {

            this.#handle = null;

            // TODO: If we are to make use of the timestamp, it would be here.
            this.#two.update();

            this.#handle = window.requestAnimationFrame(animate);
        };
        this.#handle = window.requestAnimationFrame(animate);
    }
    pause(): void {
        if (typeof this.#handle === 'number') {
            window.cancelAnimationFrame(this.#handle);
            this.#handle = null;
        }
    }
}