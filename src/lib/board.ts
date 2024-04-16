import { BehaviorSubject, debounceTime, fromEvent } from 'rxjs';
import { Anchor } from './anchor.js';
import { Constants } from './constants.js';
import { LinearGradient } from './effects/linear-gradient.js';
import { RadialGradient } from './effects/radial-gradient.js';
import { Sprite } from './effects/sprite.js';
import { Stop } from './effects/stop.js';
import { Texture } from './effects/texture.js';
import { Group } from './group.js';
import { IBoard } from './IBoard.js';
import { G20 } from './math/G20.js';
import { Path } from './path.js';
import { SVGView } from './renderers/SVGView.js';
import { View } from './renderers/View.js';
import { Observable } from './rxjs/Observable.js';
import { Subscription } from './rxjs/Subscription.js';
import { PositionLike, Shape } from './shape.js';
import { ArcSegment } from './shapes/arc-segment.js';
import { Circle, CircleOptions } from './shapes/circle.js';
import { Ellipse, EllipseOptions } from './shapes/ellipse.js';
import { Line } from './shapes/line.js';
import { Polygon } from './shapes/Polygon.js';
import { Rectangle, RectangleOptions } from './shapes/rectangle.js';
import { RegularPolygon } from './shapes/RegularPolygon.js';
import { RoundedRectangle } from './shapes/rounded-rectangle.js';
import { Star } from './shapes/star.js';
import { Text } from './text.js';
import { Commands } from './utils/path-commands.js';
import { dateTime } from './utils/performance.js';
import { xhr } from './utils/xhr.js';

export interface BoardOptions {
    boundingBox?: [x1: number, y1: number, x2: number, y2: number];
    resizeTo?: Element;
    scene?: Group;
    size?: { width: number; height: number };
    view?: View;
}

export class Board implements IBoard {

    readonly #view: View;
    #view_resize: Subscription | null = null;

    /**
     * A wrapper group that is used to transform the scene from user coordinates to pixels.
     */
    readonly #scope: Group = new Group(this);
    /**
     * 
     */
    readonly #scene: Group;

    /**
     * The width of the instance's dom element.
     */
    width = 0;

    /**
     * The height of the instance's dom element.
     */
    height = 0;

    readonly #size = new BehaviorSubject({ width: this.width, height: this.height });
    readonly size$: Observable<{ width: number; height: number }> = this.#size.asObservable();

    /**
     * 
     */
    ratio: number | undefined = void 0;

    /**
     * A helper to handle sizing.
     */
    readonly #fitter: Fitter;

    /**
     * An integer representing how many frames have elapsed.
     */
    frameCount = 0;

    // DGH: Do I need to keep the separate variable of does next() do the updating?
    readonly #frameCount: BehaviorSubject<number>;
    readonly frameCount$: Observable<number>;

    playing = false;

    // Used to compute the elapsed time between frames.
    #curr_now: number | null = null;
    #prev_now: number | null = null;

    readonly #boundingBox: [x1: number, y1: number, x2: number, y2: number] = [-5, 5, 5, -5];
    readonly goofy: boolean;

    constructor(elementOrId: string | HTMLElement, options: BoardOptions = {}) {

        const container = get_container(elementOrId);

        if (Array.isArray(options.boundingBox)) {
            const x1 = options.boundingBox[0];
            const y1 = options.boundingBox[1];
            const x2 = options.boundingBox[2];
            const y2 = options.boundingBox[3];
            this.#boundingBox[0] = x1;
            this.#boundingBox[1] = y1;
            this.#boundingBox[2] = x2;
            this.#boundingBox[3] = y2;
            this.goofy = y2 > y1;
        }
        else {
            this.goofy = false;
        }

        if (options.scene instanceof Group) {
            this.#scene = options.scene;
        }
        else {
            this.#scene = new Group(this);
        }
        this.#scope.add(this.#scene);

        if (typeof options.view === 'object') {
            this.#view = options.view;
        }
        else {
            // The group used by the scene is actually a wrapper around the scene.
            this.#view = new SVGView(this.#scope);
        }

        const config: BoardConfig = config_from_options(container, options);

        this.#fitter = new Fitter(this, this.#view);


        this.frameCount = 0;
        this.#frameCount = new BehaviorSubject(this.frameCount);
        this.frameCount$ = this.#frameCount.asObservable();

        if (container instanceof HTMLElement) {
            this.#fitter.set_target(container as HTMLElement);
            this.#fitter.subscribe();
            this.#fitter.resize();
        }

        if (container instanceof HTMLElement) {
            this.appendTo(container);
        }

        if (config.size) {
            this.#view.setSize(config.size, this.ratio);
        }

        // Why do we need to create this subscription to the view?
        this.#view_resize = this.#view.size$.subscribe(({ width, height }) => {
            this.width = width;
            this.height = height;
            this.#update_view_box();
            this.#size.next({ width, height });
        });
    }

    /**
     * Here we are actually doing a job that is equvalent to the role of the SVG viewBox except that we are also
     * introducing a 90 degree rotation if the coordinate system is right-handed (a.k.a regular or not goofy).
     */
    #update_view_box(): void {
        const [x1, y1, x2, y2] = this.getBoundingBox();
        const Δx = this.width;
        const Δy = this.height;
        const sx = Δx / (x2 - x1);
        const sy = Δy / (y1 - y2);
        const x = (x1 * Δx) / (x1 - x2);
        const y = (y2 * Δy) / (y2 - y1);
        this.#scope.position.set(x, y);
        if (!this.goofy) {
            this.#scope.attitude.rotorFromAngle(Math.PI / 2);
        }
        this.#scope.scaleXY.set(sx, sy);
    }

    dispose(): void {
        if (this.#view_resize) {
            this.#view_resize.unsubscribe();
            this.#view_resize = null;
        }
        this.#fitter.unsubscribe();
    }

    get scene(): Group {
        return this.#scene;
    }

    appendTo(container: Element) {
        if (container && typeof container.nodeType === 'number') {
            if (container.nodeType === Node.ELEMENT_NODE) {
                container.appendChild(this.#view.domElement);

                if (!this.#fitter.is_target_body()) {
                    this.#fitter.set_target(container);
                }

                this.update();
            }
        }

        return this;
    }

    getBoundingBox(): readonly [x1: number, y1: number, x2: number, y2: number] {
        return this.#boundingBox;
    }

    play(): this {
        this.playing = true;
        // raf.init();
        // return this.trigger(Events.Types.play);
        return this;
    }

    pause() {
        this.playing = false;
        // return this.trigger(Events.Types.pause);
    }

    setPlaying(p: boolean): void {
        this.playing = p;
    }

    /**
     * A number representing how much time has elapsed since the last frame in milliseconds.
     */
    getElapsedTime(fractionalDigits = 3): number | null {
        if (typeof this.#prev_now === 'number') {
            return parseFloat((this.#curr_now - this.#prev_now).toFixed(fractionalDigits));
        }
        else {
            return null;
        }
    }

    /**
     * Update positions and calculations in one pass before rendering.
     */
    update() {
        this.#prev_now = this.#curr_now;
        this.#curr_now = dateTime.now();

        if (this.#fitter.has_target() && !this.#fitter.is_bound()) {
            this.#fitter.subscribe();
            this.#fitter.resize();
        }

        const width = this.width;
        const height = this.height;
        const renderer = this.#view;

        if (width !== renderer.width || height !== renderer.height) {
            renderer.setSize({ width, height }, this.ratio);
        }

        this.#view.render();

        this.#frameCount.next(this.frameCount++);
    }

    add(...shapes: Shape<Group>[]): this {
        this.#scene.add(...shapes);
        this.update();
        return this;
    }

    remove(...shapes: Shape<Group>[]): this {
        this.#scene.remove(...shapes);
        this.update();
        return this;
    }

    /*
    clear() {
        this.scene.remove(this.scene.children);
        return this;
    }
    */

    circle(options: CircleOptions = {}): Circle {
        const circle = new Circle(this, options);
        this.add(circle);
        return circle;
    }

    ellipse(options: EllipseOptions = {}): Ellipse {
        const ellipse = new Ellipse(this, options);
        this.#scene.add(ellipse);
        return ellipse;
    }

    line(point1: PositionLike, point2: PositionLike): Line {
        const line = new Line(this, point1, point2);
        line.linewidth = 2;
        line.stroke = "#999999"
        this.#scene.add(line);
        return line;
    }

    path(closed: boolean, ...points: Anchor[]): Path {
        const path = new Path(this, points, closed);
        const rect = path.getBoundingClientRect();
        if (typeof rect.top === 'number' && typeof rect.left === 'number' &&
            typeof rect.right === 'number' && typeof rect.bottom === 'number') {
            path.center().position.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        this.#scene.add(path);
        return path;
    }

    point(position: PositionLike): Shape<Group> {
        const [x1, x2, y1, y2] = this.getBoundingBox();
        const sx = this.width / (x2 - x1);
        const sy = this.height / (y2 - y1);
        const rx = 4 / sx;
        const ry = 4 / sy;
        const options: EllipseOptions = { position, rx, ry }
        const ellipse = new Ellipse(this, options);
        ellipse.stroke = "#ff0000"
        ellipse.fill = "#ff0000"
        // ellipse.noFill();
        ellipse.linewidth = 2
        this.add(ellipse);
        return ellipse;
    }

    polygon(points: PositionLike[] = []): Polygon {
        const polygon = new Polygon(this, points);
        this.add(polygon);
        return polygon;
    }

    rectangle(options: RectangleOptions): Rectangle {
        const rect = new Rectangle(this, options);
        this.#scene.add(rect);
        rect.linewidth = 2;
        rect.stroke = "#999999"
        return rect;
    }

    makeArrow(x1: number, y1: number, x2: number, y2: number, size?: number): Path {

        const headlen = typeof size === 'number' ? size : 10;

        const angle = Math.atan2(y2 - y1, x2 - x1);

        const vertices = [

            new Anchor(G20.vector(x1, y1), undefined, undefined, undefined, undefined, Commands.move),
            new Anchor(G20.vector(x2, y2), undefined, undefined, undefined, undefined, Commands.line),
            new Anchor(
                G20.vector(x2 - headlen * Math.cos(angle - Math.PI / 4), y2 - headlen * Math.sin(angle - Math.PI / 4)),
                undefined, undefined, undefined, undefined, Commands.line
            ),

            new Anchor(G20.vector(x2, y2), undefined, undefined, undefined, undefined, Commands.move),
            new Anchor(
                G20.vector(x2 - headlen * Math.cos(angle + Math.PI / 4), y2 - headlen * Math.sin(angle + Math.PI / 4)),
                undefined, undefined, undefined, undefined, Commands.line
            )

        ];

        const path = new Path(this, vertices, false, false, true);
        path.noFill();
        path.cap = 'round';
        path.join = 'round';

        this.#scene.add(path);

        return path;
    }

    makeRoundedRectangle(x: number, y: number, width: number, height: number, sides: number): RoundedRectangle {
        const rect = new RoundedRectangle(this, x, y, width, height, sides);
        this.#scene.add(rect);
        return rect;
    }

    makeStar(x: number, y: number, outerRadius: number, innerRadius: number, sides: number): Star {
        const star = new Star(this, x, y, outerRadius, innerRadius, sides);
        this.#scene.add(star);
        return star;
    }

    makeCurve(closed: boolean, ...anchors: Anchor[]): Path {
        const curved = true;
        const curve = new Path(this, anchors, closed, curved);
        const rect = curve.getBoundingClientRect();
        curve.center().position.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        this.#scene.add(curve);
        return curve;
    }

    makePolygon(x: number, y: number, radius: number, sides: number): RegularPolygon {
        const poly = new RegularPolygon(this, x, y, radius, sides);
        this.#scene.add(poly);
        return poly;
    }

    makeArcSegment(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number, resolution: number = Constants.Resolution): ArcSegment {
        const arcSegment = new ArcSegment(this, x, y, innerRadius, outerRadius, startAngle, endAngle, resolution);
        this.#scene.add(arcSegment);
        return arcSegment;
    }

    /*
    makePoints(p: G20[]): Points {

        const l = arguments.length;
        let vertices = p;

        if (!Array.isArray(p)) {
            vertices = [];
            for (let i = 0; i < l; i += 2) {
                const x = arguments[i];
                if (typeof x !== 'number') {
                    break;
                }
                const y = arguments[i + 1];
                vertices.push(new G20(x, y));
            }
        }

        const points = new Points(vertices);

        this.scene.add(points);

        return points;

    }
    */

    makeText(message: string, x: number, y: number, styles?: object): Text {
        const text = new Text(this, message, x, y, styles);
        this.add(text);
        return text;
    }

    makeLinearGradient(x1: number, y1: number, x2: number, y2: number, ...stops: Stop[]): LinearGradient {
        const gradient = new LinearGradient(x1, y1, x2, y2, stops);
        // this.add(gradient);
        return gradient;
    }
    makeRadialGradient(x1: number, y1: number, radius: number, ...stops: Stop[]): RadialGradient {
        const gradient = new RadialGradient(x1, y1, radius, stops);
        // this.add(gradient);
        return gradient;
    }

    makeSprite(pathOrTexture: (string | Texture), x: number, y: number, columns: number, rows: number, frameRate: number, autostart: boolean): Sprite {
        const sprite = new Sprite(this, pathOrTexture, x, y, columns, rows, frameRate);
        if (autostart) {
            sprite.play();
        }
        this.add(sprite);
        return sprite;
    }

    /*
    makeImageSequence(pathsOrTextures: (string[] | Texture[]), x: number, y: number, frameRate: number, autostart: boolean): ImageSequence {
        const imageSequence = new ImageSequence(pathsOrTextures, x, y, frameRate);
        if (autostart) {
            imageSequence.play();
        }
        this.add(imageSequence);
        return imageSequence;
    }
    */

    makeTexture(pathOrSource: (string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement), callback: () => void): Texture {
        const texture = new Texture(pathOrSource, callback);
        return texture;
    }

    makeGroup(...shapes: Shape<Group>[]): Group {
        const group = new Group(this, shapes);
        this.#scene.add(group as Shape<Group>);
        return group;
    }

    // TODO
    /*
    interpret(svg: SVGElement, shallow?: boolean, add?: boolean): Group {

        const tag = svg.tagName.toLowerCase() as 'svg';

        add = (typeof add !== 'undefined') ? add : true;

        if (!(tag in read)) {
            return null;
        }

        const node = read[tag].call(this, svg);

        if (add) {
            this.add(shallow && node instanceof Group ? node.children : node);
        }
        else if (node.parent) {
            // Remove `g` tags that have been added to scenegraph / DOM
            // in order to be compatible with `getById` methods.
            node.remove();
        }

        return node;

    }
    */


    /**
     * Load an SVG file or SVG text and interpret it into Two.js legible objects.
     */
    load(url: string): Promise<Group> {
        return new Promise<Group>((resolve, reject) => {
            const group = new Group(this);
            // let elem, i, child;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const attach = (responseText: string) => {
                // TODO
                /*
                dom.temp.innerHTML = responseText;

                for (i = 0; i < dom.temp.children.length; i++) {
                    elem = dom.temp.children[i];
                    child = this.interpret(elem, false, false);
                    if (child !== null) {
                        group.add(child);
                    }
                }

                if (typeof callback === 'function') {
                    const svg = dom.temp.children.length <= 1
                        ? dom.temp.children[0] : dom.temp.children;
                    callback(group, svg);
                }
                */
            };

            if (/\.svg$/i.test(url)) {
                try {
                    xhr(url, attach);
                    resolve(group);
                }
                catch (e) {
                    reject(e);
                }
            }
            else {
                attach(url);
                resolve(group);
            }
        });
    }
}

class Fitter {
    readonly #two: Board;
    readonly #view: View;
    readonly #domElement: HTMLElement | SVGElement;
    #target: Element | null = null;
    #target_resize: Subscription | null = null;
    constructor(two: Board, view: View) {
        this.#two = two;
        this.#view = view;
        this.#domElement = view.domElement;
    }
    dispose(): void {
        this.unsubscribe();
    }
    is_bound(): boolean {
        return !!this.#target_resize;
    }
    /**
     * Idempotent subscribe to 'resize' events of the target.
     */
    subscribe(): void {
        this.unsubscribe();
        this.#target_resize = fromEvent(this.#target, 'resize')
            .pipe(debounceTime(200))
            .subscribe(() => {
                this.resize();
            });
    }
    /**
     * Idempotent unsubscribe from 'resize' events of the target.
     */
    unsubscribe(): void {
        if (this.#target_resize) {
            this.#target_resize.unsubscribe();
            this.#target_resize = null;
        }
    }
    has_target(): boolean {
        return !!this.#target;
    }
    set_target(target: Element): this {
        this.#target = target;
        if (this.is_target_body()) {
            // TODO: The controller should take care of this...
            document.body.style.overflow = 'hidden';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.top = '0';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.bottom = '0';
            document.body.style.position = 'fixed';

            // TODO: The controller should take care of this...
            this.#domElement.style.display = 'block';
            this.#domElement.style.top = '0';
            this.#domElement.style.left = '0';
            this.#domElement.style.right = '0';
            this.#domElement.style.bottom = '0';
            this.#domElement.style.position = 'fixed';
        }
        return this;
    }
    is_target_body(): boolean {
        return this.#target === document.body;
    }
    resize(): void {
        const two = this.#two;
        const size = this.#target.getBoundingClientRect();

        two.width = size.width;
        two.height = size.height;

        this.#view.setSize(size, two.ratio);
    }
}

interface BoardConfig {
    resizeTo?: Element;
    size?: { width: number; height: number };
}

function config_from_options(container: HTMLElement, options: BoardOptions): BoardConfig {
    const config: BoardConfig = {
        resizeTo: compute_config_resize_to(container, options),
        size: compute_config_size(container, options)
    };
    return config;
}

function compute_config_resize_to(container: HTMLElement, options: BoardOptions): Element | null {
    if (options.resizeTo) {
        return options.resizeTo;
    }
    return container;
}

function compute_config_size(container: HTMLElement, options: BoardOptions): { width: number; height: number } | null {
    if (typeof options.size === 'object') {
        return options.size;
    }
    else {
        if (container) {
            return null;
        }
        else {
            return { width: 640, height: 480 };
        }
    }
}

function get_container(elementOrId: string | HTMLElement): HTMLElement {
    if (typeof elementOrId === 'string') {
        return document.getElementById(elementOrId);
    }
    else {
        return elementOrId;
    }
}


