import { Flag } from '../Flag.js';
import { G20 } from '../math/G20.js';
import { Rectangle } from '../shapes/rectangle.js';
import { lerp } from '../utils/math.js';
import { dateTime } from '../utils/performance.js';
import { Texture } from './texture.js';


export interface SpriteOptions {
    position?: G20;
    attitude?: G20;
}

export class Sprite extends Rectangle {

    _flagTexture = false;
    _flagColumns = false;
    _flagRows = false;
    _flagFrameRate = false;
    _flagIndex = false;

    _amount = 1;
    _duration = 0;
    _startTime = 0;
    _playing = false;
    _firstFrame = 0;
    _lastFrame = 0;
    _loop = true;

    // Exposed through getter-setter

    _texture: Texture | null = null;
    _columns = 1;
    _rows = 1;
    _frameRate = 0;
    _index = 0;

    _onLastFrame: () => void;

    /**
     * @param path The URL path or {@link Two.Texture} to be used as the bitmap data displayed on the sprite.
     * @param ox The initial `x` position of the Two.Sprite.
     * @param oy The initial `y` position of the Two.Sprite.
     * @param cols The number of columns the sprite contains.
     * @param rows The number of rows the sprite contains.
     * @param frameRate The frame rate at which the partitions of the image should playback at.
     * A convenient package to display still or animated images through a tiled image source. For more information on the principals of animated imagery through tiling see [Texture Atlas](https://en.wikipedia.org/wiki/Texture_atlas) on Wikipedia.
     */
    constructor(path: string | Texture, ox = 0, oy = 0, cols = 1, rows = 1, frameRate = 0) {

        super({ position: new G20(ox, oy), width: 0, height: 0 });

        this.noStroke();
        this.noFill();

        /**
         * @name Two.Sprite#texture
         * @property {Two.Texture} - The texture to be used as bitmap data to display image in the scene.
         */
        if (path instanceof Texture) {
            this.texture = path;
        }
        else if (typeof path === 'string') {
            this.texture = new Texture(path);
        }

        this.update();

        /**
         * @name Two.Sprite#columns
         * @property {Number} - The number of columns to split the texture into. Defaults to `1`.
         */
        if (typeof cols === 'number') {
            this.columns = cols;
        }

        /**
         * @name Two.Sprite#rows
         * @property {Number} - The number of rows to split the texture into. Defaults to `1`.
         */
        if (typeof rows === 'number') {
            this.rows = rows;
        }

        /**
         * @name Two.Sprite#frameRate
         * @property {Number} - The number of frames to animate against per second. Defaults to `0` for non-animated sprites.
         */
        if (typeof frameRate === 'number') {
            this.frameRate = frameRate;
        }

        /**
         * @name Two.Sprite#index
         * @property {Number} - The index of the current tile of the sprite to display. Defaults to `0`.
         */
        this.index = 0;

    }

    /**
     * @name Two.Sprite.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Sprite}.
     */
    static Properties = [
        'texture', 'columns', 'rows', 'frameRate', 'index'
    ];

    /**
     * @name Two.Sprite#play
     * @function
     * @param firstFrame The index of the frame to start the animation with.
     * @param lastFrame The index of the frame to end the animation with. Defaults to the last item in the {@link Two.Sprite#textures}.
     * @param onLastFrame Optional callback function to be triggered after playing the last frame. This fires multiple times when the sprite is looped.
     * @description Initiate animation playback of a {@link Two.Sprite}.
     */
    play(firstFrame = 0, lastFrame?: number, onLastFrame?: () => void): this {

        this._playing = true;
        this._firstFrame = 0;
        this._lastFrame = this._amount - 1;
        this._startTime = dateTime.now();

        if (typeof firstFrame === 'number') {
            this._firstFrame = firstFrame;
        }
        if (typeof lastFrame === 'number') {
            this._lastFrame = lastFrame;
        }
        if (typeof onLastFrame === 'function') {
            this._onLastFrame = onLastFrame;
        }
        else {
            delete this._onLastFrame;
        }

        if (this._index !== this._firstFrame) {
            this._startTime -= 1000 * Math.abs(this._index - this._firstFrame) / this._frameRate;
        }

        return this;

    }

    /**
     * @name Two.Sprite#pause
     * @function
     * @description Halt animation playback of a {@link Two.Sprite}.
     */
    pause() {

        this._playing = false;
        return this;

    }

    /**
     * @name Two.Sprite#stop
     * @function
     * @description Halt animation playback of a {@link Two.Sprite} and set the current frame back to the first frame.
     */
    stop(): this {
        this._playing = false;
        this._index = 0;
        return this;
    }

    update(): this {

        const effect = this._texture;
        const cols = this._columns;
        const rows = this._rows;

        let width, height, elapsed, amount, duration;
        let index, iw, ih, frames;

        if (effect) {

            if (this._flagColumns || this._flagRows) {
                this._amount = this._columns * this._rows;
            }

            if (this._flagFrameRate) {
                this._duration = 1000 * this._amount / this._frameRate;
            }

            if (this._flagTexture) {
                this.fill = effect;
            }

            if (effect.loaded) {

                iw = effect.image.width;
                ih = effect.image.height;

                width = iw / cols;
                height = ih / rows;
                amount = this._amount;

                if (this.width !== width) {
                    this.width = width;
                }
                if (this.height !== height) {
                    this.height = height;
                }

                if (this._playing && this._frameRate > 0) {

                    if (isNaN(this._lastFrame)) {
                        this._lastFrame = amount - 1;
                    }

                    // TODO: Offload perf logic to instance of `Two`.
                    elapsed = dateTime.now() - this._startTime;
                    frames = this._lastFrame + 1;
                    duration = 1000 * (frames - this._firstFrame) / this._frameRate;

                    if (this._loop) {
                        elapsed = elapsed % duration;
                    }
                    else {
                        elapsed = Math.min(elapsed, duration);
                    }

                    index = lerp(this._firstFrame, frames, elapsed / duration);
                    index = Math.floor(index);

                    if (index !== this._index) {
                        this._index = index;
                        if (index >= this._lastFrame - 1 && this._onLastFrame) {
                            this._onLastFrame();  // Shortcut for chainable sprite animations
                        }
                    }

                }

                const col = this._index % cols;
                const row = Math.floor(this._index / cols);

                const ox = - width * col + (iw - width) / 2;
                const oy = - height * row + (ih - height) / 2;

                // TODO: Improve performance
                if (ox !== effect.offset.x) {
                    effect.offset.x = ox;
                }
                if (oy !== effect.offset.y) {
                    effect.offset.y = oy;
                }

            }

        }

        super.update.call(this);

        return this;

    }

    flagReset(dirtyFlag = false) {
        this.flags[Flag.Texture] = dirtyFlag;
        this.flags[Flag.Columns] = dirtyFlag;
        this.flags[Flag.Rows] = dirtyFlag;
        this.flags[Flag.FrameRate] = dirtyFlag;
        super.flagReset(dirtyFlag);
        return this;
    }
    get texture() {
        return this._texture;
    }
    set texture(v) {
        this._texture = v;
        this._flagTexture = true;
    }
    get columns() {
        return this._columns;
    }
    set columns(v) {
        this._columns = v;
        this._flagColumns = true;
    }
    get rows() {
        return this._rows;
    }
    set rows(v) {
        this._rows = v;
        this._flagRows = true;
    }
    get frameRate() {
        return this._frameRate;
    }
    set frameRate(v) {
        this._frameRate = v;
        this._flagFrameRate = true;
    }
    get index() {
        return this._index;
    }
    set index(v) {
        this._index = v;
        this._flagIndex = true;
    }
}
