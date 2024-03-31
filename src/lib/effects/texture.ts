import { Element } from '../element.js';
import { CanvasShim } from '../utils/canvas-shim.js';
import { TwoError } from '../utils/error.js';
import { root } from '../utils/root.js';

import { Registry } from '../registry.js';
import { Vector } from '../vector.js';

import { Renderer as CanvasRenderer } from '../renderers/canvas.js';

import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Constants } from '../constants.js';
import { Group } from '../group.js';
import { View } from '../renderers/View.js';

let anchor: HTMLAnchorElement | null = null;

const regex = {
    video: /\.(mp4|webm|ogg)$/i,
    image: /\.(jpe?g|png|gif|tiff|webp)$/i,
    effect: /texture|gradient/i
} as const;

if (root.document) {
    anchor = document.createElement('a');
}

export class Texture extends Element<Group> {

    _flagSrc = false;
    _flagImage = false;
    _flagVideo = false;
    _flagLoaded = false;
    _flagRepeat = false;
    _flagOffset = false;
    _flagScale = false;

    _src = '';
    _image: HTMLImageElement | HTMLVideoElement | null = null;
    _loaded = false;
    _repeat = 'no-repeat';

    _scale: Vector | number = 1;
    #scale_change_subscription: Subscription | null = null;

    _offset: Vector | null = null;
    #offset_change_subscription: Subscription | null = null;

    readonly #change: BehaviorSubject<this>;
    readonly change$: Observable<this>;

    readonly #loaded: BehaviorSubject<this>;
    readonly loaded$: Observable<this>;

    /**
     * @param src The URL path to an image file or an `<img />` element.
     * @param callback An optional callback function once the image has been loaded.
     */
    constructor(src?: string | HTMLImageElement, callback?: () => void) {

        super();

        this._renderer = {} as View;

        this._renderer.type = 'texture';

        this.id = Constants.Identifier + Constants.uniqueId();
        this.classList = [];

        this.loaded = false;

        /**
         * CSS style declaration to tile. Valid values include: `'no-repeat'`, `'repeat'`, `'repeat-x'`, `'repeat-y'`.
         * @see {@link https://www.w3.org/TR/2dcontext/#dom-context-2d-createpattern}
         */
        this.repeat = 'no-repeat';

        /**
         * A two-component vector describing any pixel offset of the texture when applied to a {@link Path}.
         */
        this.offset = new Vector();

        this.#loaded = new BehaviorSubject(this);
        this.loaded$ = this.#change.asObservable();

        if (typeof callback === 'function') {
            const loaded = () => {
                subscription.unsubscribe();
                callback();
            };
            const subscription = this.loaded$.subscribe(loaded);
        }

        if (typeof src === 'string') {
            this.src = src;
        }
        else if (typeof src === 'object') {
            const elemString = Object.prototype.toString.call(src);
            if (
                elemString === '[object HTMLImageElement]' ||
                elemString === '[object HTMLCanvasElement]' ||
                elemString === '[object HTMLVideoElement]' ||
                elemString === '[object Image]'
            ) {
                this.image = src;
            }
        }

        this.#change = new BehaviorSubject(this);
        this.change$ = this.#change.asObservable();

        this._update();
    }

    static Properties = [
        'src', 'loaded', 'repeat', 'scale', 'offset', 'image'
    ];

    /**
     * @name Two.Texture.RegularExpressions
     * @property {Object} - A map of compatible DOM Elements categorized by media format.
     */
    static RegularExpressions = regex;

    /**
     * @name Two.Texture.ImageRegistry
     * @property {Two.Registry} - A canonical listing of image data used in a single session of Two.js.
     * @nota-bene This object is used to cache image data between different textures.
     */
    static ImageRegistry = new Registry();

    /**
     * @name Two.Texture.getAbsoluteURL
     * @property {Function} - Serializes a URL as an absolute path for canonical attribution in {@link Two.ImageRegistry}.
     * @param {String} path
     * @returns {String} - The serialized absolute path.
     */
    static getAbsoluteURL(path: string): string {
        if (!anchor) {
            // TODO: Fix for headless environments
            return path;
        }
        anchor.href = path;
        return anchor.href;
    }

    /**
     * @name Two.Texture.loadHeadlessBuffer
     * @property {Function} - Loads an image as a buffer in headless environments.
     * @param {Two.Texture} texture - The {@link Two.Texture} to be loaded.
     * @param {Function} loaded - The callback function to be triggered once the image is loaded.
     * @nota-bene - This function uses node's `fs.readFileSync` to spoof the `<img />` loading process in the browser.
     */
    static loadHeadlessBuffer(texture: Texture, loaded: (this: GlobalEventHandlers, ev: Event) => void) {
        texture.image.onload = loaded;
        texture.image.src = texture.src;
    }

    /**
     * Retrieves the tag name of an image, video, or canvas node.
     * @param image The image to infer the tag name from.
     * @returns the tag name of an image, video, or canvas node.
     */
    static getTag(image: HTMLImageElement | HTMLVideoElement): 'canvas' | 'img' | 'video' {
        // Headless environments
        return (image && image.nodeName && image.nodeName.toLowerCase()) as 'canvas' | 'img' | 'video' || 'img';
    }

    /**
     * Convenience function to set {@link Texture#image} properties with canonical versions set in {@link Texture.ImageRegistry}.
     * @param src - The URL path of the image.
     * @returns either a cached version of the image or a new one that is registered in {@link Texture.ImageRegistry}.
     */
    static getImage(src: string): HTMLImageElement | HTMLVideoElement {

        const absoluteSrc = Texture.getAbsoluteURL(src);

        if (Texture.ImageRegistry.contains(absoluteSrc)) {
            return Texture.ImageRegistry.get(absoluteSrc);
        }

        let image: HTMLImageElement | HTMLVideoElement;

        if (CanvasShim.Image) {
            // TODO: Fix for headless environments
            image = new CanvasShim.Image();
            CanvasRenderer.Utils.shim(image, 'img');
        }
        else if (root.document) {
            if (regex.video.test(absoluteSrc)) {
                image = document.createElement('video');
            }
            else {
                image = document.createElement('img');
            }
        }
        else {
            // eslint-disable-next-line no-console
            console.warn('Two.js: no prototypical image defined for Two.Texture');
        }

        image.crossOrigin = 'anonymous';
        if (image instanceof HTMLImageElement) {
            image.referrerPolicy = 'no-referrer';
        }

        return image;

    }

    /**
     * @name Two.Register
     * @interface
     * @description A collection of functions to register different types of textures. Used internally by a {@link Two.Texture}.
     */
    static Register = {
        canvas: function (texture: Texture, callback: () => void) {
            texture._src = '#' + texture.id;
            Texture.ImageRegistry.add(texture.src, texture.image);
            if (typeof callback === 'function') {
                callback();
            }
        },
        img: function (texture: Texture, callback: () => void) {

            const image = texture.image;

            const loaded = function () {
                if (!CanvasShim.isHeadless && image.removeEventListener && typeof image.removeEventListener === 'function') {
                    image.removeEventListener('load', loaded, false);
                    image.removeEventListener('error', error, false);
                }
                if (typeof callback === 'function') {
                    callback();
                }
            };
            const error = function () {
                if (!CanvasShim.isHeadless && typeof image.removeEventListener === 'function') {
                    image.removeEventListener('load', loaded, false);
                    image.removeEventListener('error', error, false);
                }
                throw new TwoError('unable to load ' + texture.src);
            };

            if (typeof image.width === 'number' && image.width > 0
                && typeof image.height === 'number' && image.height > 0) {
                loaded();
            }
            else if (!CanvasShim.isHeadless && typeof image.addEventListener === 'function') {
                image.addEventListener('load', loaded, false);
                image.addEventListener('error', error, false);
            }

            texture._src = Texture.getAbsoluteURL(texture._src);

            if (!CanvasShim.isHeadless && image && image.getAttribute('two-src')) {
                return;
            }

            if (!CanvasShim.isHeadless) {
                image.setAttribute('two-src', texture.src);
            }

            Texture.ImageRegistry.add(texture.src, image);

            if (CanvasShim.isHeadless) {

                Texture.loadHeadlessBuffer(texture, loaded);

            }
            else {

                texture.image.src = texture.src;

            }

        },
        video: function (texture: Texture, callback: () => void) {

            if (CanvasShim.isHeadless) {
                throw new TwoError('video textures are not implemented in headless environments.');
            }

            const loaded = function () {
                const image = texture.image as HTMLVideoElement;
                image.removeEventListener('canplaythrough', loaded, false);
                image.removeEventListener('error', error, false);
                image.width = image.videoWidth;
                image.height = image.videoHeight;
                if (typeof callback === 'function') {
                    callback();
                }
            };
            const error = function () {
                texture.image.removeEventListener('canplaythrough', loaded, false);
                texture.image.removeEventListener('error', error, false);
                throw new TwoError('unable to load ' + texture.src);
            };

            texture._src = Texture.getAbsoluteURL(texture._src);

            if (!texture.image.getAttribute('two-src')) {
                texture.image.setAttribute('two-src', texture.src);
                Texture.ImageRegistry.add(texture.src, texture.image);
            }

            const image = texture.image as HTMLVideoElement;
            if (image.readyState >= 4) {
                loaded();
            }
            else {
                image.addEventListener('canplaythrough', loaded, false);
                image.addEventListener('error', error, false);
                image.src = texture.src;
                image.load();
            }
        }
    } as const;

    /**
     * @name Two.Texture.load
     * @function
     * @param {Two.Texture} texture - The texture to load.
     * @param {Function} callback - The function to be called once the texture is loaded.
     */
    static load(texture: Texture, callback: () => void): void {

        let image = texture.image;
        const candidateTag = Texture.getTag(image);

        if (texture._flagImage) {
            if (/canvas/i.test(candidateTag)) {
                Texture.Register.canvas(texture, callback);
            }
            else {
                texture._src = (!CanvasShim.isHeadless && image.getAttribute('two-src')) || image.src;
                Texture.Register[candidateTag](texture, callback);
            }
        }

        if (texture._flagSrc) {
            if (!image) {
                image = Texture.getImage(texture.src);
                texture.image = image;
            }
            const tag = Texture.getTag(image) as 'canvas' | 'img' | 'video';
            Texture.Register[tag](texture, callback);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _update(bubbles = false): this {

        if (this._flagSrc || this._flagImage) {

            this.#change.next(this);

            if (this._flagSrc || this._flagImage) {
                this.loaded = false;
                Texture.load(this, () => {
                    this.loaded = true;
                    this.#change.next(this);
                    this.#loaded.next(this);
                });
            }
        }

        if (this._image && this._image instanceof HTMLVideoElement && this._image.readyState >= 4) {
            this._flagVideo = true;
        }

        return this;
    }

    flagReset() {
        this._flagSrc = this._flagImage = this._flagLoaded = this._flagRepeat
            = this._flagVideo = this._flagScale = this._flagOffset = false;
        super.flagReset.call(this);
        return this;
    }
    get image() {
        return this._image;
    }
    set image(image) {

        const tag = Texture.getTag(image);
        let index;

        switch (tag) {
            case 'canvas':
                index = '#' + image.id;
                break;
            default:
                index = image.src;
        }

        if (Texture.ImageRegistry.contains(index)) {
            this._image = Texture.ImageRegistry.get(image.src);
        }
        else {
            this._image = image;
        }

        this._flagImage = true;
    }

    get loaded() {
        return this._loaded;
    }
    set loaded(v) {
        this._loaded = v;
        this._flagLoaded = true;
    }
    get offset() {
        return this._offset;
    }
    set offset(v) {
        if (this.#offset_change_subscription) {
            this.#offset_change_subscription.unsubscribe();
            this.#offset_change_subscription = null;
        }
        this._offset = v;
        this.#offset_change_subscription = this._offset.change$.subscribe(() => {
            this._flagOffset = true;
        });
        this._flagOffset = true;
    }
    get repeat() {
        return this._repeat;
    }
    set repeat(v) {
        this._repeat = v;
        this._flagRepeat = true;
    }
    get scale() {
        return this._scale;
    }
    set scale(v) {
        if (this.#scale_change_subscription) {
            this.#scale_change_subscription.unsubscribe();
            this.#scale_change_subscription = null;
        }
        this._scale = v;
        if (this._scale instanceof Vector) {
            this.#scale_change_subscription = this._scale.change$.subscribe(() => {
                this._flagScale = true;
            });
        }
        this._flagScale = true;
    }
    get src() {
        return this._src;
    }
    set src(v) {
        this._src = v;
        this._flagSrc = true;
    }
}
