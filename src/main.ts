import { Board, Circle, G20 } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-5, 5, 5, -5]
    })

    const O = board.createPoint(G20.vector(0, 0))
    const B = board.createPoint(G20.vector(4, 0))
    const C = board.createPoint(G20.vector(0, 4))
    const D = board.createPoint(G20.vector(1, 1))

    board.createLine(O, B);
    const L2 = board.createLine(O, C);
    const L3 = board.createLine(O, D);

    O.visible = true
    D.visible = true

    board.createLine(L3.point2, L2.point2);

    const circle: Circle = board.createCircle({ position: O })
    circle.stroke = "#0000ff"
    circle.noFill()
    // circle.radius = 4

    board.update();

    function animate() {
        // board.update()
        window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)

    document.addEventListener("click", function () {
        board.update()
    })
});
