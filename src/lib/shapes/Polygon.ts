import { Anchor } from "../anchor";
import { IBoard } from "../IBoard";
import { Path } from "../path";
import { PositionLike, position_from_like } from "../shape";

export class Polygon extends Path {
    constructor(board: IBoard, points: PositionLike[] = []) {

        const vertices = points
            .map((point) => position_from_like(point))
            .map((position, index) => new Anchor(position, 0, 0, 0, 0, index === 0 ? 'M' : 'L'));

        super(board, vertices, true);

        this.flagReset(true);
        this.update();
    }
}