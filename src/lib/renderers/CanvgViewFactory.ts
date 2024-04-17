import { Group } from "../group";
import { CanvgView } from "./CanvgView";
import { View } from "./View";
import { ViewFactory } from "./ViewFactory";

export class CanvgViewFactory implements ViewFactory {
    createView(viewBox: Group, containerId: string): View {
        return new CanvgView(viewBox, containerId);
    }
}