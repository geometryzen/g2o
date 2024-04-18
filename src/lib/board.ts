import { BehaviorSubject, debounceTime, fromEvent, Subscription } from 'rxjs';
import { Anchor } from './anchor';
import { Constants } from './constants';
import { LinearGradient } from './effects/linear-gradient';
import { RadialGradient } from './effects/radial-gradient';
import { Sprite } from './effects/sprite';
import { Stop } from './effects/stop';
import { Texture } from './effects/texture';
import { Group } from './group';
import { IBoard } from './IBoard';
import { G20 } from './math/G20';
import { Path } from './path';
import { Disposable } from './reactive/Disposable';
import { DisposableObservable, Observable } from './reactive/Observable';
import { SVGViewFactory } from './renderers/SVGViewFactory';
import { View } from './renderers/View';
import { ViewFactory } from './renderers/ViewFactory';
import { PositionLike, Shape } from './shape';
import { ArcSegment } from './shapes/arc-segment';
import { Circle, CircleAttributes } from './shapes/circle';
import { Ellipse, EllipseAttributes } from './shapes/ellipse';
import { Line } from './shapes/line';
import { Polygon, PolygonAttributes } from './shapes/Polygon';
import { Rectangle, RectangleAttributes } from './shapes/rectangle';
import { Text, TextAttributes } from './text';
import { Commands } from './utils/path-commands';
import { dateTime } from './utils/performance';
import { xhr } from './utils/xhr';

export interface BoardAttributes {
    boundingBox?: [x1: number, y1: number, x2: number, y2: number];
    resizeTo?: Element;
    scene?: Group;
    size?: { width: number; height: number };
    viewFactory?: ViewFactory;
}

export interface PointAttributes {
    id: string;
    visibility: 'visible' | 'hidden' | 'collapse';
}

export class Board implements IBoard {

    readonly #view: View;
    #view_resize: Disposable | null = null;

    /**
     * A wrapper group that is used to transform the scene from user coordinates to pixels.
     */
    readonly #viewBox: Group;
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
    readonly size$: Observable<{ width: number; height: number }> = new DisposableObservable(this.#size.asObservable());

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

    constructor(elementOrId: string | HTMLElement, options: BoardAttributes = {}) {

        const container = get_container(elementOrId);
        const container_id = get_container_id(elementOrId);

        this.#viewBox = new Group(this, [], { id: `${container_id}-viewbox` });

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
            this.#scene = new Group(this, [], { id: `${container_id}-scene` });
        }
        this.#viewBox.add(this.#scene);

        if (typeof options.viewFactory === 'object') {
            this.#view = options.viewFactory.createView(this.#viewBox, container_id);
        }
        else {
            this.#view = new SVGViewFactory().createView(this.#viewBox, container_id);
        }

        const config: BoardConfig = config_from_options(container, options);

        this.#fitter = new Fitter(this, this.#view);


        this.frameCount = 0;
        this.#frameCount = new BehaviorSubject(this.frameCount);
        this.frameCount$ = new DisposableObservable(this.#frameCount.asObservable());

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
        if (typeof this.#view.size$ === 'object') {
            this.#view_resize = this.#view.size$.subscribe(({ width, height }) => {
                this.width = width;
                this.height = height;
                this.#update_view_box();
                this.#size.next({ width, height });
            });
        }
        else {
            throw new Error("view.size$ MUST be defined");
        }
    }

    dispose(): void {
        if (this.#view_resize) {
            this.#view_resize.dispose();
            this.#view_resize = null;
        }
        this.#fitter.unsubscribe();
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
        this.#viewBox.position.set(x, y);
        if (!this.goofy) {
            this.#viewBox.attitude.rotorFromAngle(Math.PI / 2);
        }
        this.#viewBox.scaleXY.set(sx, sy);
    }

    get scaleXY(): G20 {
        return this.#viewBox.scaleXY.clone();
    }

    get scene(): Group {
        return this.#scene;
    }

    appendTo(container: Element) {
        if (container && typeof container.nodeType === 'number') {
            if (container.nodeType === Node.ELEMENT_NODE) {
                const domElement = this.#view.domElement;
                if (domElement instanceof SVGElement || domElement instanceof HTMLCanvasElement) {
                    container.appendChild(this.#view.domElement);
                }
                else {
                    throw new Error("domElement must be an SVGElement or HTMLCanvasElement");
                }

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

    circle(options: CircleAttributes = {}): Circle {
        const circle = new Circle(this, options);
        this.add(circle);
        return circle;
    }

    ellipse(options: Partial<EllipseAttributes> = {}): Ellipse {
        const ellipse = new Ellipse(this, options);
        this.#scene.add(ellipse);
        return ellipse;
    }

    line(point1: PositionLike, point2: PositionLike): Line {
        const line = new Line(this, point1, point2);
        line.strokeWidth = 2;
        line.stroke = "#999999";
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

    point(position: PositionLike, attributes: Partial<PointAttributes> = {}): Shape<Group> {
        const [x1, x2, y1, y2] = this.getBoundingBox();
        const sx = this.width / (x2 - x1);
        const sy = this.height / (y2 - y1);
        const rx = 4 / sx;
        const ry = 4 / sy;
        const options: Partial<EllipseAttributes> = { position, rx, ry, id: attributes.id, visibility: attributes.visibility };
        const ellipse = new Ellipse(this, options);
        ellipse.stroke = "#ff0000";
        ellipse.fill = "#ff0000";
        // ellipse.noFill();
        ellipse.strokeWidth = 2;
        this.add(ellipse);
        return ellipse;
    }

    polygon(points: PositionLike[] = [], attributes: Partial<PolygonAttributes> = {}): Polygon {
        const polygon = new Polygon(this, points, attributes);
        this.add(polygon);
        return polygon;
    }

    rectangle(attributes: RectangleAttributes): Rectangle {
        const rect = new Rectangle(this, attributes);
        this.#scene.add(rect);
        rect.strokeWidth = 2;
        rect.stroke = "#999999";
        return rect;
    }

    text(message: string, x: number, y: number, attributes?: Partial<TextAttributes>): Text {
        const text = new Text(this, message, x, y, attributes);
        this.add(text);
        return text;
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

    makeCurve(closed: boolean, ...anchors: Anchor[]): Path {
        const curved = true;
        const curve = new Path(this, anchors, closed, curved);
        const rect = curve.getBoundingClientRect();
        curve.center().position.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        this.#scene.add(curve);
        return curve;
    }

    makeArcSegment(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number, resolution: number = Constants.Resolution): ArcSegment {
        const arcSegment = new ArcSegment(this, x, y, innerRadius, outerRadius, startAngle, endAngle, resolution);
        this.#scene.add(arcSegment);
        return arcSegment;
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

function config_from_options(container: HTMLElement, options: BoardAttributes): BoardConfig {
    const config: BoardConfig = {
        resizeTo: compute_config_resize_to(container, options),
        size: compute_config_size(container, options)
    };
    return config;
}

function compute_config_resize_to(container: HTMLElement, options: BoardAttributes): Element | null {
    if (options.resizeTo) {
        return options.resizeTo;
    }
    return container;
}

function compute_config_size(container: HTMLElement, options: BoardAttributes): { width: number; height: number } | null {
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

function get_container_id(elementOrId: string | HTMLElement): string {
    if (typeof elementOrId === 'string') {
        return elementOrId;
    }
    else {
        return elementOrId.id;
    }
}


