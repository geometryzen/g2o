import { Observable } from "../rxjs/Observable";

export interface View {
    /**
     * 
     */
    domElement: HTMLElement | SVGElement;
    height?: number;
    size$: Observable<{ width: number; height: number }>;
    width?: number;
    render(): void;
    setSize(width: number, height: number, ratio: number): void;
}
