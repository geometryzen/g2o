import { Group } from "../group";
import { CanvasView, CanvasViewParams } from "./CanvasView";
import { View } from "./View";
import { ViewFactory } from "./ViewFactory";

export class CanvasViewFactory implements ViewFactory {
    constructor(readonly params?: CanvasViewParams) {

    }
    createView(viewBox: Group, containerId: string): View {
        return new CanvasView(viewBox, containerId, this.params);
    }
}