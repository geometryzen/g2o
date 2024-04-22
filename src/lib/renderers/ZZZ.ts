import { state } from '@geometryzen/reactive';
import { Anchor } from "../anchor";
import { Flag } from '../Flag';
import { G20 } from "../math/G20";
import { Disposable, dispose } from "../reactive/Disposable";
import { Observable } from "../reactive/Observable";
import { Variable } from '../reactive/variable';

/**
 * Information that is shared between the model and the view.
 */
export class ZZZ implements Disposable {
    /**
     * 
     */
    readonly disposables: Disposable[] = [];
    /*
     *
     */
    readonly flags: { [flag: number]: boolean } = {};

    appended?: boolean;

    /**
     * The clip property indicates that this path is being used as the clipPath for some other shape.
     */
    readonly #clip = state(false);
    clipPath?: SVGClipPathElement;

    context?: {
        ctx?: CanvasRenderingContext2D;
    };
    /**
     * Used by the CanvasRenderer.
     */
    effect?: CanvasPattern;
    /**
     * The element corresponding to some Shape and used by the SVG renderer. It will share the same identifier.
     */
    elem?: HTMLElement | SVGElement;
    /**
     * DGH: Something strange in use.
     */
    hasFillEffect?: boolean;
    /**
     * DGH: Something strange in use.
     */
    hasStrokeEffect?: boolean;
    image?: SVGImageElement;
    offset?: G20;
    opacity?: number;
    radius$?: Observable<number>;
    scale?: G20;
    spreadMethod$: Observable<'pad' | 'reflect' | 'repeat'>;
    units$?: Observable<'userSpaceOnUse' | 'objectBoundingBox'>;

    vertices?: Anchor[];
    vertices_subject?: Variable<number>;
    vertices$?: Observable<number>;

    dispose(): void {
        dispose(this.disposables);
    }
    get clip(): boolean {
        return this.#clip.get();
    }
    set clip(clip: boolean) {
        this.#clip.set(clip);
        this.flags[Flag.ClipFlag] = true;
    }
}