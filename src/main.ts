import { Board } from './index';
import { circle_intersection } from './lib/euclid/euclid';

document.addEventListener('DOMContentLoaded', function () {

    const board = new Board("my-board", {
        boundingBox: [-4, 4, 4, -4]
    })

    const A = board.createPoint([-1, 0])
    const B = board.createPoint([1, 0])

    const AB = board.createLine(A, B);

    const BCD = board.createCircle({ position: A, radius: AB.length })
    BCD.stroke = "#0000ff"
    BCD.noFill()

    const ACE = board.createCircle({ position: B, radius: AB.length })
    ACE.stroke = "#0000ff"
    ACE.noFill()

    const points = circle_intersection(BCD, ACE)
    if (points.length > 0) {
        const C = board.createPoint(points[0])
        const CA = board.createLine(C, A);
        const CB = board.createLine(C, B);
        console.log("AB", AB.length);
        console.log("CA", CA.length);
        console.log("CB", CB.length);
    }

    board.update();

    function animate() {
        // board.update()
        window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)
});
