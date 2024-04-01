import { BehaviorSubject, Observable, Subscription, debounceTime, fromEvent } from 'rxjs';
import { Anchor } from './anchor.js';
import { Constants } from './constants.js';
import { Sprite } from './effects/sprite.js';
import { Texture } from './effects/texture.js';
import { Group } from './group.js';
import { Path } from './path.js';
import { Renderer } from './renderers/Renderer.js';
import { Shape } from './shape.js';
import { ArcSegment } from './shapes/arc-segment.js';
import { Circle } from './shapes/circle.js';
import { Ellipse } from './shapes/ellipse.js';
import { Line } from './shapes/line.js';
import { Polygon } from './shapes/polygon.js';
import { Rectangle } from './shapes/rectangle.js';
import { RoundedRectangle } from './shapes/rounded-rectangle.js';
import { Star } from './shapes/star.js';
import { Text } from './text.js';
import { Commands } from './utils/path-commands.js';
import { performance } from './utils/performance.js';
import { xhr } from './utils/xhr.js';

export interface RendererParams {
    domElement: HTMLElement;
    scene: Group;
    overdraw?: boolean;
    smoothing?: boolean;
}

export type RendererFactory = (model: RendererParams) => Renderer;

export interface TwoOptions {
    /**
     * Set to `true` to automatically make the stage adapt to the width and height of the parent document.
     * This parameter overrides `width` and `height` parameters if set to `true`.
     * This overrides `options.fitted` as well.
     */
    fullscreen: boolean;
    /**
     * Set to `true` to automatically make the stage adapt to the width and height of the parent element.
     * This parameter overrides `width` and `height` parameters if set to `true`.
     */
    fitted: boolean;
    /**
     * The height of the stage on construction. This can be set at a later time.
     */
    height: number;
    /**
     * The width of the stage on construction. This can be set at a later time.
     */
    width: number;
    /**
     * The canvas or SVG element to draw into. This overrides the `options.type` argument.
     */
    domElement: HTMLElement;
}

export class Two {

    renderer: Renderer = null;
    #renderer_resize_subscription: Subscription | null = null;

    readonly scene: Group = new Group();

    /**
     * The width of the instance's dom element.
     */
    width = 0;

    /**
     * The height of the instance's dom element.
     */
    height = 0;

    readonly #size = new BehaviorSubject({ width: this.width, height: this.height });
    readonly size$ = this.#size.asObservable();

    /**
     * 
     */
    ratio: number | undefined = void 0;

    readonly #fitter = new Fitter(this);

    /**
     * An integer representing how many frames have elapsed.
     */
    frameCount = 0;

    // DGH: Do I need to keep the separate variable of does next() do the updating?
    readonly #frameCount: BehaviorSubject<number>;
    readonly frameCount$: Observable<number>;

    /**
     * A number representing how much time has elapsed since the last frame in milliseconds.
     */
    timeDelta = 0;

    playing = false;

    _lastFrame: number;


    constructor(rendererFactory: RendererFactory, options: Partial<TwoOptions> = {}) {

        const params: TwoOptions = {
            fullscreen: !options.fullscreen,
            fitted: !!options.fitted,
            width: typeof options.width === 'number' ? options.width : 640,
            height: typeof options.height === 'number' ? options.height : 480,
            domElement: options.domElement
        };

        this.renderer = rendererFactory({ domElement: params.domElement, scene: this.scene });
        this.frameCount = 0;
        this.#frameCount = new BehaviorSubject(this.frameCount);
        this.frameCount$ = this.#frameCount.asObservable();

        if (params.fullscreen) {
            this.#fitter.set_target(window);
            this.#fitter.bind();
            this.#fitter.resize();
        }
        else if (params.fitted) {
            this.renderer.domElement.style.display = 'block';
            // this.fitter.fitToParent();
        }
        else if (!params.domElement) {

            this.renderer.setSize(params.width, params.height, this.ratio);
            this.width = params.width;
            this.height = params.height;

        }

        this.#renderer_resize_subscription = this.renderer.size$.subscribe(({ width, height }) => {
            this.width = width;
            this.height = height;
            this.#size.next({ width, height });
        });
    }

    dispose(): void {
        if (this.#renderer_resize_subscription) {
            this.#renderer_resize_subscription.unsubscribe();
            this.#renderer_resize_subscription = null;
        }
        this.#fitter.unbind();
    }

    appendTo(elem: Element) {
        elem.appendChild(this.renderer.domElement);

        if (!this.#fitter.is_target_window()) {
            this.#fitter.set_target(elem);
        }

        this.update();

        return this;
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
     * Update positions and calculations in one pass before rendering.
     */
    update() {
        const animated = !!this._lastFrame;
        const now = performance.now();

        if (animated) {
            this.timeDelta = parseFloat((now - this._lastFrame).toFixed(3));
        }
        this._lastFrame = now;

        if (this.#fitter.has_target() && !this.#fitter.is_bound()) {
            this.#fitter.bind();
            this.#fitter.resize();
        }

        const width = this.width;
        const height = this.height;
        const renderer = this.renderer;

        if (width !== renderer.width || height !== renderer.height) {
            renderer.setSize(width, height, this.ratio);
        }

        // DGH: Do we really need both update and frameCount?
        // this.trigger(Events.Types.update, this.frameCount, this.timeDelta);

        this.renderer.render();

        this.#frameCount.next(this.frameCount++);
    }

    add(...shapes: Shape[]): this {
        this.scene.add(...shapes);
        return this;
    }

    remove(...shapes: Shape[]): this {
        this.scene.remove(...shapes);
        return this;
    }
    /*
    clear() {
        this.scene.remove(this.scene.children);
        return this;
    }
    */

    makeLine(x1: number, y1: number, x2: number, y2: number): Line {

        const line = new Line(x1, y1, x2, y2);
        this.scene.add(line);

        return line;

    }

    makeArrow(x1: number, y1: number, x2: number, y2: number, size?: number): Path {

        const headlen = typeof size === 'number' ? size : 10;

        const angle = Math.atan2(y2 - y1, x2 - x1);

        const vertices = [

            new Anchor(x1, y1, undefined, undefined, undefined, undefined, Commands.move),
            new Anchor(x2, y2, undefined, undefined, undefined, undefined, Commands.line),
            new Anchor(
                x2 - headlen * Math.cos(angle - Math.PI / 4),
                y2 - headlen * Math.sin(angle - Math.PI / 4),
                undefined, undefined, undefined, undefined, Commands.line
            ),

            new Anchor(x2, y2, undefined, undefined, undefined, undefined, Commands.move),
            new Anchor(
                x2 - headlen * Math.cos(angle + Math.PI / 4),
                y2 - headlen * Math.sin(angle + Math.PI / 4),
                undefined, undefined, undefined, undefined, Commands.line
            )

        ];

        const path = new Path(vertices, false, false, true);
        path.noFill();
        path.cap = 'round';
        path.join = 'round';

        this.scene.add(path);

        return path;
    }

    makeRectangle(x: number, y: number, width: number, height: number): Rectangle {
        const rect = new Rectangle(x, y, width, height);
        this.scene.add(rect);
        return rect;
    }

    makeRoundedRectangle(x: number, y: number, width: number, height: number, sides: number): RoundedRectangle {
        const rect = new RoundedRectangle(x, y, width, height, sides);
        this.scene.add(rect);
        return rect;
    }

    makeCircle(x: number, y: number, radius: number, resolution: number = 4): Circle {
        const circle = new Circle(x, y, radius, resolution);
        this.scene.add(circle);
        return circle;
    }

    makeEllipse(x: number, y: number, rx: number, ry: number, resolution: number = 4): Ellipse {
        const ellipse = new Ellipse(x, y, rx, ry, resolution);
        this.scene.add(ellipse);
        return ellipse;
    }

    makeStar(x: number, y: number, outerRadius: number, innerRadius: number, sides: number): Star {
        const star = new Star(x, y, outerRadius, innerRadius, sides);
        this.scene.add(star);
        return star;
    }

    makeCurve(closed: boolean, ...anchors: Anchor[]): Path {
        const curved = true;
        const curve = new Path(anchors, closed, curved);
        const rect = curve.getBoundingClientRect();
        curve.center().translation.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        this.scene.add(curve);
        return curve;
    }

    makePolygon(x: number, y: number, radius: number, sides: number): Polygon {
        const poly = new Polygon(x, y, radius, sides);
        this.scene.add(poly);
        return poly;
    }

    makeArcSegment(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number, resolution: number = Constants.Resolution): ArcSegment {
        const arcSegment = new ArcSegment(x, y, innerRadius, outerRadius, startAngle, endAngle, resolution);
        this.scene.add(arcSegment);
        return arcSegment;
    }

    /*
    makePoints(p: Vector[]): Points {

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
                vertices.push(new Vector(x, y));
            }
        }

        const points = new Points(vertices);

        this.scene.add(points);

        return points;

    }
    */

    makePath(closed: boolean, ...points: Anchor[]): Path {
        const path = new Path(points, closed);
        const rect = path.getBoundingClientRect();
        if (typeof rect.top === 'number' && typeof rect.left === 'number' &&
            typeof rect.right === 'number' && typeof rect.bottom === 'number') {
            path.center().translation.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        this.scene.add(path);
        return path;
    }

    makeText(message: string, x: number, y: number, styles?: object): Text {
        const text = new Text(message, x, y, styles);
        this.add(text);
        return text;
    }
    /*
    makeLinearGradient(x1: number, y1: number, x2: number, y2: number, ...stops: Stop[]): LinearGradient {
        const gradient = new LinearGradient(x1, y1, x2, y2, stops);
        this.add(gradient);
        return gradient;
    }
    */
    /*
    makeRadialGradient(x1: number, y1: number, radius: number, ...stops: Stop[]): RadialGradient {
        const gradient = new RadialGradient(x1, y1, radius, stops);
        this.add(gradient);
        return gradient;
    }
    */

    makeSprite(pathOrTexture: (string | Texture), x: number, y: number, columns: number, rows: number, frameRate: number, autostart: boolean): Sprite {
        const sprite = new Sprite(pathOrTexture, x, y, columns, rows, frameRate);
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

    makeGroup(...shapes: Shape[]): Group {
        const group = new Group(shapes);
        this.scene.add(group);
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
            const group = new Group();
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
    readonly #two: Two;
    #target: Element | Window | null = null;
    #target_resize_subscription: Subscription | null = null;
    constructor(two: Two) {
        this.#two = two;
    }
    dispose(): void {
        this.unbind();
    }
    is_bound(): boolean {
        return !!this.#target_resize_subscription;
    }
    bind(): void {
        this.#target_resize_subscription = fromEvent(this.#target, 'resize')
            .pipe(debounceTime(200))
            .subscribe(() => {
                this.resize();
            });
    }
    unbind(): void {
        if (this.#target_resize_subscription) {
            this.#target_resize_subscription.unsubscribe();
            this.#target_resize_subscription = null;
        }
    }
    has_target(): boolean {
        return !!this.#target;
    }
    set_target(elem: Element | Window): this {
        this.#target = elem;
        if (this.is_target_window()) {

            document.body.style.overflow = 'hidden';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.top = '0';
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.bottom = '0';
            document.body.style.position = 'fixed';

            const two = this.#two;
            two.renderer.domElement.style.display = 'block';
            two.renderer.domElement.style.top = '0';
            two.renderer.domElement.style.left = '0';
            two.renderer.domElement.style.right = '0';
            two.renderer.domElement.style.bottom = '0';
            two.renderer.domElement.style.position = 'fixed';
        }
        return this;
    }
    is_target_window(): boolean {
        return this.#target === window;
    }
    resize(): void {
        if (this.is_target_window()) {
            this.#resize_to_window();
        }
        else {
            this.#resize_to_parent();
        }
    }
    #resize_to_window() {
        const two = this.#two;
        const wr = document.body.getBoundingClientRect();

        const width = two.width = wr.width;
        const height = two.height = wr.height;

        two.renderer.setSize(width, height, two.ratio);
    }
    #resize_to_parent() {
        const two = this.#two;

        const parent = two.renderer.domElement.parentElement;
        if (!parent) {
            // eslint-disable-next-line no-console
            console.warn('Attempting to size to parent, but no parent found.');
            return;
        }
        const wr = parent.getBoundingClientRect();

        const width = two.width = wr.width;
        const height = two.height = wr.height;

        two.renderer.setSize(width, height, two.ratio);

    }
}


