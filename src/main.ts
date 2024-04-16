import { Board, Text } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-5, 5, 5, -5]
    })

    const A = board.point([0.0, 0.0])
    const B = board.point([8.0, 0.0])
    const C = board.point([8.0, 3.0])

    const AB = B.position.__sub__(A.position).normalize();
    const AC = C.position.__sub__(A.position).normalize();

    const polygon = board.polygon([A, B, C]);
    polygon.fill = 'rgba(0, 191, 168, 0.33)';
    polygon.stroke = 'rgb(0, 191, 168)';
    polygon.linewidth = 2;
    polygon.center()

    const box = board.rectangle({ width: 2, height: 1 })
    box.attitude.rotorFromDirections(AB, AC)
    box.fill = 'rgba(255, 128, 0, 0.33)';
    box.stroke = 'rgb(255, 128, 0)';
    box.linewidth = 2;
    box.position.y += 1.55
    box.position.x += 2.5

    A.hidden = true
    B.hidden = true
    C.hidden = true

    const textA = board.makeText("A", A.position.x, A.position.y, { family: 'Lato', size: 20 })
    rescale(textA, board);

    const textB = board.makeText("B", B.position.x, B.position.y, { family: 'Lato', size: 20 })
    rescale(textB, board);

    const textC = board.makeText("C", C.position.x, C.position.y, { family: 'Lato', size: 20 })
    rescale(textC, board);

    // If the board is not updated,
    // 1. The points remain visible.
    // 2. The fill, stroke, and linewidth are not applied.
    board.update();

    function animate() {
        // board.update()
        window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)
});

function rescale(text: Text, board: Board): void {
    text.scaleXY.x = 1 / board.scaleXY.x
    text.scaleXY.y = 1 / board.scaleXY.y
}
