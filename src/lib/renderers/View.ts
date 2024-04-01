import { Anchor } from "../anchor";
import { Group } from "../group";

/**
 * TODO: Something strange going on here.
 * This appears to contain information for the convenience of the model.
 * It's not a contract for a renderer.
 */
export interface View {
    clip: SVGClipPathElement;
    domElement: HTMLElement;
    elem: HTMLElement | SVGElement;
    /**
     * DGH: Something strange in use.
     */
    hasFillEffect?: boolean;
    /**
     * DGH: Something strange in use.
     */
    hasStrokeEffect?: boolean;
    scene: Group;
    type: 'group' | 'linear-gradient' | 'path' | 'points' | 'radial-gradient' | 'stop' | 'text' | 'texture';
    /**
     * This is defined by Path during its update, so it appears to be a kind of intermediate representation.
     * 
     */
    vertices: Anchor[];
    /**
     * This is extensively used by Path (and hence derived classes).
     * But in renderers the only purpose appears to be making a string representation.
     * Change detection? 
     */
    collection: Anchor[];
    render(): void;
    setSize(width: number, height: number, ratio: number): void;
}