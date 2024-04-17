import { Board, Text } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-5, 5, 5, -5],
        // viewFactory: new CanvgViewFactory()
    })

    const A = board.point([0.0, 0.0], { id: 'A' })
    const B = board.point([8.0, 0.0], { id: 'B' })
    const C = board.point([8.0, 3.0], { id: 'C' })

    const AB = B.position.__sub__(A.position).normalize();
    const AC = C.position.__sub__(A.position).normalize();

    const ramp = board.polygon([A, B, C], { id: 'ramp' });
    ramp.fill = 'rgba(0, 191, 168, 0.33)';
    ramp.stroke = 'rgb(0, 191, 168)';
    ramp.strokeWidth = 2;
    ramp.center();

    const box = board.rectangle({ id: 'box', width: 2, height: 1 })
    box.attitude.rotorFromDirections(AB, AC)
    box.fill = 'rgba(255, 128, 0, 0.33)';
    box.stroke = 'rgb(255, 128, 0)';
    box.strokeWidth = 2;
    box.position.y += 1.55
    box.position.x += 2.5

    const textA = board.text("A", A.position.x, A.position.y, { id: 'text-A', fontFamily: 'Lato', fontSize: 20, opacity: 0.4 })
    textA.dx = -10
    rescale(textA, board);

    const textB = board.text("B", B.position.x, B.position.y, { id: 'text-B', fontFamily: 'Lato', fontSize: 20, opacity: 0.4 })
    textB.dx = 10
    rescale(textB, board);

    const textC = board.text("C", C.position.x, C.position.y, { id: 'text-C', fontFamily: 'Lato', fontSize: 20, opacity: 0.4 })
    textC.dx = 10
    rescale(textC, board);

    const textD = board.text("D", box.position.x, box.position.y, { id: 'text-D', fontFamily: 'Lato', fontSize: 20, opacity: 1 })
    textD.attitude.rotorFromDirections(AB, AC)
    rescale(textD, board);

    A.hidden = true
    B.hidden = true
    C.hidden = true

    textC.opacity = 0.4
    textC.strokeWidth = 6

    box.stroke = "#FFCC00"
    box.strokeWidth = 4
    box.strokeOpacity = 0.6
    box.fill = "#FFFF00"
    box.fillOpacity = 0.3

    // textA.fontWeight = 'normal'
    // textA.direction="rtl"
    //textA.fontStyle='italic'
    //textA.strokeWidth=10

    board.update()

    window.onunload = function () {
        board.dispose();
    }

    /*
    function animate() {
        // board.update()
        window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)
    */
});

function rescale(text: Text, board: Board): void {
    text.scaleXY.x = 1 / board.scaleXY.x
    text.scaleXY.y = 1 / board.scaleXY.y
}

