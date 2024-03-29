import { EventHandler } from "../events";
import { Group } from "../group";

export interface View {
    domElement: HTMLElement;
    elem: HTMLElement;
    scene: Group;
    type: 'gradient' | 'group' | 'path' | 'stop';
    vertices: unknown[];
    collection: unknown[];
    bind(type: 'resize', callback: EventHandler): void;
    bindStops: EventHandler;
    bindVertices: EventHandler;
    unbindStops: EventHandler;
    unbindVertices: EventHandler;
    flagFill: EventHandler;
    flagMatrix: EventHandler;
    flagStroke: EventHandler;
    flagStops: EventHandler;
    flagVertices: EventHandler;
    setSize(width: number, height: number, ratio: number): void;
}