export interface IBoard {
    getBoundingBox(): readonly [x1: number, y1: number, x2: number, y2: number];
    width: number;
    height: number;
}