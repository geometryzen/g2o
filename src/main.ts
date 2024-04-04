import { Board, BoardOptions, Circle, G20, Rectangle } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById('container') as HTMLDivElement;

    const params: Partial<BoardOptions> = {
        container
    };
    const two = new Board(params).appendTo(container);

    const circle_pos = new G20(-70, 0);
    const circle = new Circle({ position: circle_pos, radius: 50 });
    const rect_pos = new G20(70, 0);
    const rect = new Rectangle({ position: rect_pos, width: 100, height: 100 });
    circle.fill = '#FF8000';
    circle.stroke = 'orangered';
    rect.fill = 'rgba(0, 200, 255, 0.75)';
    rect.stroke = '#1C75BC';

    const scene = two.scene;
    scene.add(circle);
    scene.add(rect);

    // And have position, rotation, scale like all shapes.
    scene.position.set(two.width / 2, two.height / 2);
    scene.rotation = Math.PI;
    scene.scale = 0.75;

    // You can also set the same properties a shape have.
    scene.linewidth = 4;

    circle_pos.y = -100;   // No effect yet.
    // circle.position.y = -200    // Works

    const left = new HTMLButtonProxy('left');
    left.addEventListener('click', () => {
        circle.position.x += 100;
        rect.position.x += 100;
    });

    const right = new HTMLButtonProxy('right');
    right.addEventListener('click', () => {
        circle.position.x -= 100;
        rect.position.x -= 100;
    });

    two.update();
});

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

