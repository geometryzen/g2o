import { Anchor, Board, Circle, G20, Group, Path, Rectangle, Shape } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById('container')!

    const board = new Board({
        container,
        resizeTo: container
    })

    const scene = board.scene
    scene.id = "scene"

    const width = 44
    const height = 64
    const half_width = width / 2
    const quart_width = half_width / 2

    const t = makeT(255, 64, 64)
    t.scale = 1
    t.position.x = - width * 1.33

    const w = makeW(255, 128, 0)
    w.scale = 1
    w.position.x = 0

    const o = makeO(0, 191, 168)
    o.scale = 1
    o.position.x = width * 1.33

    scene.add(t, w, o)
    scene.scale = 3 * (285 / 486)
    scene.position.set(board.width / 2, board.height / 2)

    board.update()

    // Group extends Shape but there is currently (0.9.41) some inconsistency so we have to cast away the issue.
    // const group = board.makeGroup(t as unknown as Shape<Group>, w as unknown as Shape<Group>)
    // group.scale = 3 * (285 / 486)
    // group.position.set(board.width/2, board.height / 2)

    // t.scale = w.scale = o.scale = 0

    function animate() {
        /*
        const tScale = t.scale

        const s = (tScale + (1.0 - tScale) * 0.125) % 0.999
        t.scale = s
        w.scale = s
        o.scale = s
        */
        //board.update()
        //window.requestAnimationFrame(animate)
    }

    // window.requestAnimationFrame(animate)

    function makeT(r: number, g: number, b: number): Shape<Group> {

        const a: Rectangle = new Rectangle({ width, height: quart_width })
        a.id = "t1"
        // Why does adding the shape to the board make it "right"?
        // board.add(a)
        const c = new Rectangle({ width: quart_width, height: width })
        c.id = "t2"
        const rgb = r + ',' + g + ',' + b

        a.fill = c.fill = 'rgba(' + rgb + ',' + 0.33 + ')'
        a.stroke = c.stroke = 'rgb(' + rgb + ')'
        a.linewidth = c.linewidth = 1

        const group = new Group([a, c]) as Shape<Group>
        group.id = "t"
        return group
    }

    function makeW(r: number, g: number, b: number): Shape<Group> {
        const x1 = 0
        const y1 = height * 0.3125
        const x2 = half_width
        const y2 = - y1
        const x3 = - x2
        const y3 = y2

        const a: Path = new Path([new Anchor(G20.vector(x1, y1)), new Anchor(G20.vector(x2, y2)), new Anchor(G20.vector(x3, y3))], true)
        const c: Path = new Path([new Anchor(G20.vector(x1, y1)), new Anchor(G20.vector(x2, y2)), new Anchor(G20.vector(x3, y3))], true)
        // board.add(a)
        // board.add(c)

        a.position.x = - width * 0.25
        c.position.set(a.position.x + half_width, a.position.y)

        const rgb = Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b)

        a.fill = c.fill = 'rgba(' + rgb + ',' + 0.33 + ')'
        a.stroke = c.stroke = 'rgb(' + rgb + ')'
        a.linewidth = c.linewidth = 1

        const group = new Group([a, c]) as Shape<Group>
        group.id = "w"
        return group;
    }

    function makeO(r: number, g: number, b: number): Shape<Group> {

        const a: Circle = new Circle({ radius: half_width })
        a.id = "c1"
        const c: Circle = new Circle({ radius: width * 0.125 })
        c.id = "c2"
        const rgb = Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b)

        a.fill = c.fill = 'rgba(' + rgb + ',' + 0.33 + ')'
        a.stroke = c.stroke = 'rgb(' + rgb + ')'
        a.linewidth = c.linewidth = 1

        const group = new Group([a, c]) as Shape<Group>
        group.id = "o"
        return group;
    }
});
