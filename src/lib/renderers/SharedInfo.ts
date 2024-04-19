import { Anchor } from "../anchor";
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

    appended?: boolean;
    clip?: SVGClipPathElement;
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
    scale?: G20;

    vertices?: Anchor[];
    vertices_subject?: Variable<number>;
    vertices$?: Observable<number>;

    dispose(): void {
        dispose(this.disposables);
    }
}