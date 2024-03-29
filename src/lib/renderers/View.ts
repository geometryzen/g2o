import { EventHandler } from "../events";

export interface View {
    elem: HTMLElement;
    type: 'gradient' | 'group' | 'path';
    flagMatrix: EventHandler;
}