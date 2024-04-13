import { Board, BoardOptions, Circle, G20 } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById("container")!

    const params: Partial<BoardOptions> = {
        container,
        resizeTo: container
    }

    const board = new Board(params)

    const scene = board.scene

    const circle: Circle = new Circle()
    circle.radius = 50
    circle.position = G20.vector(0, 0)
    circle.fill = '#FF8000'
    circle.noStroke()
    scene.add(circle)

    console.log("width", board.width, "height", board.height)

    scene.position.set(board.width / 2, board.height / 2);

    board.update()
});
