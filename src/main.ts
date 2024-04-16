import { Board } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-5, 5, 5, -5]
    })

    const A = board.point([0.0, 0.0])
    const B = board.point([8.0, 0.0])
    const C = board.point([8.0, 3.0])

    const polygon = board.polygon([A, B, C]);
    polygon.fill = 'rgba(0, 191, 168, 0.33)';
    polygon.stroke = 'rgb(0, 191, 168)';
    polygon.linewidth = 4;
    polygon.position.x = -4
    polygon.position.y = -1.5

    const box = board.rectangle({ width: 2, height: 1 })
    box.attitude.rotorFromDirections(B.position, C.position)
    box.fill = 'rgba(255, 128, 0, 0.33)';
    box.stroke = 'rgb(255, 128, 0)';
    box.linewidth = 4;
    box.position.y += 1.55
    box.position.x += 2.5

    A.hidden = true
    B.hidden = true
    C.hidden = true

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
