import { Anchor } from '../anchor';
import { IBoard } from '../IBoard';
import { Path, PathAttributes } from '../path';
import { PositionLike, position_from_like } from '../shape';

export class Line extends Path {
    constructor(board: IBoard, point1: PositionLike, point2: PositionLike) {
        const path_options: Partial<PathAttributes> = {};
        super(board, [
            new Anchor(position_from_like(point1), 'M'),
            new Anchor(position_from_like(point2), 'L')],
            false,
            false,
            false,
            path_options);
        // this.automatic = false;
    }
    get point1(): Anchor {
        return this.vertices.getAt(0);
    }
    set point1(point1: Anchor) {
        if (point1 instanceof Anchor) {
            this.vertices.splice(0, 1, point1);
        }
        else {
            const error = new Error('Line.point1 argument is not an Anchor.');
            // eslint-disable-next-line no-console
            console.warn(error.name, error.message);
        }
    }
    get point2(): Anchor {
        return this.vertices.getAt(1);
    }
    set point2(point2: Anchor) {
        if (point2 instanceof Anchor) {
            this.vertices.splice(1, 1, point2);
        }
        else {
            const error = new Error('Line.point2 argument is not an Anchor.');
            // eslint-disable-next-line no-console
            console.warn(error.name, error.message);
        }
    }
}
