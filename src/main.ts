import { Board, BoardOptions, Circle, G20, Group, RadialGradient, Shape, Stop, Text, TextStyles } from './index';

document.addEventListener('DOMContentLoaded', function () {

    const container = document.getElementById("container")!
    const params: Partial<BoardOptions> = {
        container,
        resizeTo: container
    }

    const elementNames = [
        "",
        "Hydrogen",
        "Helium",
        "Lithium",
        "Beryllium",
        "Boron",
        "Carbon",
        "Nitrogen",
        "Oxygen",
        "Fluorine",
        "Neon"
    ]

    const styles: Partial<TextStyles> = {
        alignment: "center",
        size: 36,
        family: "Lato"
    }

    const nucleusCount = 10
    const nucleusArray = Array<Circle>()

    // var electronCount = 10
    const electronArray = Array<Circle>()

    function intRange(min: number, max: number): number {
        return Math.random() * (max - min) + min
    }

    const board = new Board(params).appendTo(container)
    const scene = board.scene
    scene.id = "scene"
    const centerX = board.width / 2
    const centerY = board.height / 2

    const protonColor = new RadialGradient(
        0,
        0,
        15,
        [new Stop(0, "red", 1), new Stop(1, "black", 1)]
    )

    const neutronColor = new RadialGradient(
        0,
        0,
        15,
        [new Stop(0, "gray", 1), new Stop(1, "black", 1)]
    )

    for (let i = 0; i < nucleusCount; i++) {
        nucleusArray.push(new Circle({ position: G20.vector(intRange(-10, 10), intRange(-10, 10)), radius: 8 }))
    }

    nucleusArray.forEach(function (nucleus, index) {
        if (index % 2 === 0) {
            nucleus.fill = protonColor
        }
        if (index % 2 === 1) {
            nucleus.fill = neutronColor
        }
        nucleus.noStroke()
    })

    for (let i = 0; i < 10; i++) {
        if (i < 2) {
            const shellRadius = 50
            const angle = i * Math.PI
            electronArray.push(
                new Circle({ position: G20.vector(Math.cos(angle) * shellRadius, Math.sin(angle) * shellRadius), radius: 5 })
            )
        }
        if (i >= 2 && i < 10) {
            const shellRadius = 80
            const angle = (i - 2) * Math.PI / 4
            electronArray.push(
                new Circle({ position: G20.vector(Math.cos(angle) * shellRadius, Math.sin(angle) * shellRadius), radius: 5 })
            )
        }
    }

    const orbitA = new Circle({ position: G20.vector(centerX, centerY), radius: 50 })
    orbitA.fill = "transparent"
    orbitA.linewidth = 2
    orbitA.stroke = "rgba(0, 0, 0, 0.1)"
    scene.add(orbitA)

    const orbitB = new Circle({ position: G20.vector(centerX, centerY), radius: 80 })
    orbitB.fill = "transparent"
    orbitB.linewidth = 2
    orbitB.stroke = "rgba(0, 0, 0, 0.1)"
    scene.add(orbitB)

    const groupElectronA = new Group(electronArray.slice(0, 2))
    groupElectronA.position.set(centerX, centerY)
    groupElectronA.fill = "blue"
    groupElectronA.linewidth = 1
    scene.add(groupElectronA as Shape<Group>)

    const groupElectronB = new Group(electronArray.slice(2, 10))
    groupElectronB.position.set(centerX, centerY)
    groupElectronB.fill = "blue"
    groupElectronB.linewidth = 1
    scene.add(groupElectronB as Shape<Group>)

    const groupNucleus = new Group(nucleusArray)
    groupNucleus.id = "nucleus"
    groupNucleus.position.set(centerX, centerY)
    scene.add(groupNucleus as Shape<Group>)

    const text = new Text("", centerX, 100, styles)
    scene.add(text)

    let angleA = 0
    let angleB = 0
    let angleN = 0

    function animate() {
        angleA += 0.025 * Math.PI
        angleB += 0.005 * Math.PI
        angleN -= 0.05
        groupElectronA.attitude.rotorFromAngle(angleA)
        groupElectronB.attitude.rotorFromAngle(angleB)
        groupNucleus.attitude.rotorFromAngle(angleN)
        board.update()
        window.requestAnimationFrame(animate)
    }

    window.requestAnimationFrame(animate)

    nucleusArray.forEach(function (nucleus, _index) {
        nucleus.opacity = 0
    })

    electronArray.forEach(function (electron, _index) {
        electron.opacity = 0
    })

    let visible = 0

    document.addEventListener("click", function () {
        if (visible < nucleusArray.length) {
            nucleusArray[visible].opacity = 1
            electronArray[visible].opacity = 1
            visible++
            text.value = elementNames[visible]
            text.stroke = "#000"
        }
        else {
            nucleusArray.forEach(el => el.opacity = 0)
            electronArray.forEach(el => el.opacity = 0)
            visible = 0
            text.value = elementNames[0]
        }
        board.update()
    })
});
