import { Group } from "../group";
import { View } from "./View";

export interface ViewFactory {
    createView(viewBox: Group, containerId: string): View;
}