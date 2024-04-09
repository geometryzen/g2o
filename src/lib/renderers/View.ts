import { Observable } from "../rxjs/Observable";

export interface View {
    /**
     * 
     */
    domElement: HTMLCanvasElement | SVGElement;
    height?: number;
    size$: Observable<{ width: number; height: number }>;
    width?: number;
    render(): void;
    setSize(size: { width: number, height: number }, ratio: number): void;
}
