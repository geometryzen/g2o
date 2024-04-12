import { Board, BoardOptions, Circle, G20, Group, Rectangle } from './index';

document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('container')!;

    const board_options: Partial<BoardOptions> = {
        container
    };

    const board = new Board(board_options);

    const scene: Group = board.scene;

    const circle = new Circle({ position: new G20(-70, 0), radius: 50 });
    circle.fill = '#FF0000';
    scene.add(circle);

    const rect = new Rectangle({ position: new G20(70, 0), width: 100, height: 100 });
    rect.fill = 'rgba(255, 255, 0, 1.0)';
    scene.add(rect);

    const line = board.makeLine(0, 0, 100, 100);
    line.fill = '#FF8000';
    line.linewidth = 10;
    line.stroke = "rgba(0, 255, 0, 1.0)";
    scene.add(line);

    scene.position.set(board.width / 2, board.height / 2);
    scene.scale = 0;
    // scene.noStroke();

    scene.scale = 1;
    board.update();

    const animate = function () {
        if (scene.scale > 0.9999) {
            scene.scale = 0;
            scene.attitude.rotorFromAngle(0);
        }
        const t = (1 - scene.scale) * 0.125;
        scene.scale += t;
        scene.attitude.rotorFromAngle(scene.scale * 2 * Math.PI);
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);

    window.onunload = function () {
        try {
            board.dispose();
        }
        catch (e) {
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
