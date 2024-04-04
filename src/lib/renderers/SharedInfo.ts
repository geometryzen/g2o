import { Anchor } from "../anchor";
import { Subscription } from "../rxjs/Subscription";
import { G20 } from "../vector";

/**
 * Information that is shared between the model and the view.
 */
export interface SharedInfo {
    appended?: boolean;
    clip?: SVGClipPathElement;
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
    opacity?: number;
    /**
     * DGH: How do we clean this up? It was put there by the View, so naturally...
     */
    matrix_change?: Subscription | undefined;
    type?: 'group' | 'linear-gradient' | 'path' | 'points' | 'radial-gradient' | 'text' | 'texture';
    // Used by Path
    anchor_vertices?: Anchor[];
    anchor_collection?: Anchor[];
    // Used by Points
    vector_vertices?: G20[];
    vector_collection?: G20[];
}