import { Board } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-5, 5, 5, -5]
    })

    board.makeRectangle(0, 0, 2, 1)
    const rect = board.makeRectangle(0, 0, 2, 1)
    rect.attitude.rotorFromAngle(Math.PI / 2);
    /*
    const A = board.createPoint(G20.vector(0, 0))
    const B = board.createPoint(G20.vector(4, 0))
    const C = board.createPoint(G20.vector(0, 4))
    const D = board.createPoint(G20.vector(1, 1))

    board.createLine(A.position, B.position);
    board.createLine(A.position, C.position);
    board.createLine(A.position, D.position);

    A.visible = false
    D.visible = false



    const circle: Circle = new Circle(board, { position: G20.vector(0, 0), radius: 4 })
    circle.stroke = "#0000ff"
    circle.noFill()
    // circle.linewidth = 2
    board.add(circle)
    */
    function animate() {
        board.update()
        window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)

    document.addEventListener("click", function () {
        board.update()
    })
});
