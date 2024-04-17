import { Anchor } from "../anchor";
import { IBoard } from "../IBoard";
import { Path, PathAttributes } from "../path";
import { PositionLike, position_from_like } from "../shape";

export interface PolygonAttributes {
    id: string;
}

export class Polygon extends Path implements PolygonAttributes {
    constructor(board: IBoard, points: PositionLike[] = [], attributes: Partial<PolygonAttributes> = {}) {

        const vertices = points
            .map((point) => position_from_like(point))
            .map((position, index) => new Anchor(position, 0, 0, 0, 0, index === 0 ? 'M' : 'L'));

        super(board, vertices, true, false, false, path_attributes(attributes));

        this.flagReset(true);
        this.update();
    }
}

function path_attributes(attributes: Partial<PolygonAttributes>): Partial<PathAttributes> {
    const retval: Partial<PathAttributes> = {
        id: attributes.id,
    };
    return retval;
}
