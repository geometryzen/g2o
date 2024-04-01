import { Anchor } from '../anchor';
import { Path } from '../path';

export class Line extends Path {
    /**
     * @param x1 The x position of the first vertex on the line.
     * @param y1 The y position of the first vertex on the line.
     * @param x2 The x position of the second vertex on the line.
     * @param y2 The y position of the second vertex on the line.
     */
    constructor(x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
        super([new Anchor(x1, y1, 0, 0, 0, 0, 'M'), new Anchor(x2, y2, 0, 0, 0, 0, 'L')]);
        this.automatic = false;
    }
    get left() {
        return this.vertices.getAt(0);
    }
    set left(v) {
        if (v instanceof Anchor) {
            this.vertices.splice(0, 1, v);
        }
        else {
            const error = new Error('Line.left argument is not an object.');
            // eslint-disable-next-line no-console
            console.warn(error.name, error.message);
        }
    }
    get right() {
        return this.vertices.getAt(1);
    }
    set right(v) {
        if (v instanceof Anchor) {
            this.vertices.splice(1, 1, v);
        }
        else {
            const error = new Error('Line.right argument is not an object.');
            // eslint-disable-next-line no-console
            console.warn(error.name, error.message);
        }
    }
}
