import { Board, BoardOptions, Circle, G20, Group, Line, Rectangle, SVGView } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById('container')!;

    const scene: Group = new Group();

    const view = new SVGView(scene);
    // const view = new CanvasView(scene);

    const board_options: Partial<BoardOptions> = {
        container,
        view,
        scene
    };

    const board = new Board(board_options).appendTo(container);

    const circle = Circle.from_center_and_radius(new G20(-70, -70), 50);
    circle.fill = '#FF0000';
    scene.add(circle);

    const rect = new Rectangle({ position: new G20(70, 70), width: 100, height: 100 });
    rect.fill = 'rgba(255, 255, 0, 1.0)';
    scene.add(rect);

    const line = new Line(circle.position, rect.position);
    line.fill = '#000000';
    line.linewidth = 2;
    line.stroke = "rgba(0, 0, 0, 1.0)";
    scene.add(line);

    scene.position.set(board.width / 2, board.height / 2);
    // scene.scale = 0;
    // scene.noStroke();

    scene.scale = 1;
    board.update();

    window.onunload = function () {
        try {
            board.dispose();
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`${e}`);
        }
    };
});
/*
interface Disposable {
    dispose(): void
}

class HTMLButtonProxy {
    #button: HTMLButtonElement;
    constructor(id: string) {
        this.#button = document.getElementById(id) as HTMLButtonElement;
    }
    addEventListener(type: 'click', listener: (this: HTMLButtonElement, ev: MouseEvent) => void): Disposable {
        this.#button.addEventListener(type, listener);
        const dispose = () => {
            this.#button.removeEventListener(type, listener);
        };
        return { dispose };
    }
}
*/
