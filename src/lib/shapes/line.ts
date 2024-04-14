import { Anchor } from '../anchor';
import { IBoard } from '../IBoard';
import { G20 } from '../math/G20';
import { Path, PathOptions } from '../path';

export class Line extends Path {
    constructor(board: IBoard, begin: G20, end: G20) {
        const path_options: PathOptions = {};
        super(board, [
            new Anchor(begin, 0, 0, 0, 0, 'M'),
            new Anchor(end, 0, 0, 0, 0, 'L')],
            false,
            false,
            false,
            path_options);
        // this.automatic = false;
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
