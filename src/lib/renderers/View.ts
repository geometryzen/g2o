import { Anchor } from "../anchor";
import { Gradient } from "../effects/gradient";
import { Stop } from "../effects/stop";
import { EventHandler } from "../events";
import { Group } from "../group";

/**
 * TODO: Something strange going on here.
 * This appears to contain information for the convenience of the model.
 * It's not a contract for a renderer.
 */
export interface View {
    domElement: HTMLElement;
    elem: HTMLElement;
    scene: Group;
    type: 'gradient' | 'group' | 'linear-gradient' | 'path' | 'points' | 'radial-gradient' | 'stop' | 'text' | 'texture';
    vertices: Anchor[];
    collection: Anchor[];
    bind(type: 'resize', callback: EventHandler): void;
    bindVertices: EventHandler;
    removeStops(stops: Stop[], gradient: Gradient): void;
    unbindVertices: EventHandler;
    flagFill: EventHandler;
    flagMatrix: EventHandler;
    flagStroke: EventHandler;
    flagVertices: EventHandler;
    setSize(width: number, height: number, ratio: number): void;
}