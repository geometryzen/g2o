import { EventHandler, Events } from "../events";
import { Group } from "../group";

export interface View {
    domElement: HTMLElement;
    elem: HTMLElement;
    scene: Group;
    type: 'gradient' | 'group' | 'path';
    vertices: unknown[];
    collection: unknown[];
    bind(type: 'resize', callback: EventHandler<Events>): void;
    bindVertices: EventHandler;
    unbindVertices: EventHandler;
    flagFill: EventHandler;
    flagMatrix: EventHandler;
    flagStroke: EventHandler;
    flagVertices: EventHandler;
    setSize(width: number, height: number, ratio: number): void;
}