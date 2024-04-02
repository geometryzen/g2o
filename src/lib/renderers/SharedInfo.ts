import { Anchor } from "../anchor";

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
    type?: 'group' | 'linear-gradient' | 'path' | 'points' | 'radial-gradient' | 'text' | 'texture';
    /**
     * This is defined by Path during its update, so it appears to be a kind of intermediate representation.
     * 
     */
    vertices?: Anchor[];
    /**
     * This is extensively used by Path (and hence derived classes).
     * But in renderers the only purpose appears to be making a string representation.
     * Change detection? 
     */
    collection?: Anchor[];
}