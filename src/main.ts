import { Board } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-50, 50, 50, -50]
    })

    const blu = board.makeRectangle(0, 0, 20, 10)
    blu.position.x = 0
    blu.position.y = 20
    blu.fill = "#0000ff"
    blu.noStroke();
    blu.scaleXY.set(2,1);

    const red = board.makeRectangle(0, 0, 20, 10)
    red.attitude.rotorFromAngle(Math.PI / 8);
    red.fill = "#ff0000"
    red.noStroke();

    const text = board.makeText("Hello", 0, 10)
    text.scaleXY.set(1,1);
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
