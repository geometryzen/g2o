import { Board, BoardOptions, G20, Text, TextStyles } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById("container")!
    const params: Partial<BoardOptions> = {
        container
    }

    const styles: Partial<TextStyles> = {
        alignment: "left",
        size: 36
    }

    const board = new Board(params)

    const text = new Text("Foo", 0, 0, styles);

    text.usePosition(G20.vector(100, 100));
    text.useAttitude(G20.one.clone().rotorFromAngle(-Math.PI / 4));

    board.scene.add(text);

    board.update()

    text.family = 'Lato'
    text.value = "Hello"
    text.opacity = 0.25
    text.visible = true
    text.size = 36

    //board.update()
});
