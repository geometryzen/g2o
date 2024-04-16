import { Children } from './children.js';
import { LinearGradient } from './effects/linear-gradient.js';
import { RadialGradient } from './effects/radial-gradient.js';
import { Texture } from './effects/texture.js';
import { Flag } from './Flag.js';
import { IBoard } from './IBoard.js';
import { IShape } from './IShape.js';
import { Subscription } from './rxjs/Subscription';
import { Parent, Shape, ShapeAttributes } from './shape.js';

export interface IGroup extends Parent {
    remove(...shapes: Shape<IGroup>[]): void;
}

export interface GroupAttributes {
    id: string;
}

export class Group extends Shape<Group> {

    #fill: string | LinearGradient | RadialGradient | Texture = '#fff';
    #stroke: string | LinearGradient | RadialGradient | Texture = '#000';
    #linewidth = 1.0;
    #opacity = 1.0;
    #visible = true;
    #cap: 'butt' | 'round' | 'square' = 'round';
    #join: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round' = 'round';
    #miter = 4;
    #closed = true;
    #curved = false;
    /**
     * Determines whether Path plots coordinates base don "closed" and "curved" flags.
     * The presence in Group seems unnecessary.
     */
    #automatic = true;

    /**
     * Number between zero and one to state the beginning of where the path is rendered.
     * a percentage value that represents at what percentage into all child shapes should the renderer start drawing.
     * @nota-bene This is great for animating in and out stroked paths in conjunction with {@link Group#ending}.
     */
    #beginning = 0.0;

    /**
     * @name Two.Group#ending
     * Number between zero and one to state the ending of where the path is rendered.
     * a percentage value that represents at what percentage into all child shapes should the renderer start drawing.
     * @nota-bene This is great for animating in and out stroked paths in conjunction with {@link Group#beginning}.
     */
    #ending = 1.0;

    #length = 0;

    /**
     * The shape to clip from a group's rendering.
     */
    #mask: Shape<Group> = null;

    #shapes: Children<Shape<Group>>;
    #shapes_insert: Subscription | null = null;
    #shapes_remove: Subscription | null = null;
    #shapes_order: Subscription | null = null;

    clip: boolean;

    /**
     * An automatically updated list of shapes that need to be appended to the renderer's scenegraph.
     */
    readonly additions: Shape<Group>[] = [];
    /**
     * An automatically updated list of children that need to be removed from the renderer's scenegraph.
     */
    readonly subtractions: Shape<Group>[] = [];

    constructor(board: IBoard, shapes: Shape<Group>[] = [], attributes: Partial<GroupAttributes> = {}) {

        super(board, shape_attributes(attributes));

        this.flagReset(true);
        this.flags[Flag.Additions] = false;
        this.flags[Flag.Subtractions] = false;
        this.flags[Flag.Beginning] = false;
        this.flags[Flag.Ending] = false;
        this.flags[Flag.Length] = false;
        this.flags[Flag.Order] = false;
        this.flags[Flag.Mask] = false;
        this.flags[Flag.Visible] = false;

        this.#shapes = new Children(shapes);

        this.#subscribe_to_shapes();

        this.viewInfo.type = 'group';
    }

    hasBoundingClientRect(): boolean {
        return false;
    }

    dispose() {
        this.#unsubscribe_from_shapes();
        this.#shapes.dispose();
    }

    #subscribe_to_shapes(): void {
        this.#shapes_insert = this.#shapes.insert$.subscribe((inserts: Shape<Group>[]) => {
            for (const shape of inserts) {
                update_shape_group(shape, this);
            }
        });

        this.#shapes_remove = this.#shapes.remove$.subscribe((removes: Shape<Group>[]) => {
            for (const shape of removes) {
                update_shape_group(shape, null);
            }
        });

        this.#shapes_order = this.#shapes.order$.subscribe(() => {
            this.flags[Flag.Order] = true;
        });
    }

    #unsubscribe_from_shapes(): void {
        if (this.#shapes_insert) {
            this.#shapes_insert.unsubscribe();
            this.#shapes_insert = null;
        }
        if (this.#shapes_remove) {
            this.#shapes_remove.unsubscribe();
            this.#shapes_remove = null;
        }
        if (this.#shapes_order) {
            this.#shapes_order.unsubscribe();
            this.#shapes_order = null;
        }
    }

    /**
     * Orient the children of the group to the upper left-hand corner of that group.
     */
    corner(): this {
        const rect = this.getBoundingClientRect(true);

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.position.x -= rect.left;
            child.position.y -= rect.top;
        }

        if (this.mask) {
            this.mask.position.x -= rect.left;
            this.mask.position.y -= rect.top;
        }

        return this;
    }

    /**
     * Orient the children of the group to the center of that group.
     */
    center(): this {
        const rect = this.getBoundingClientRect(true);
        const cx = rect.left + rect.width / 2 - this.position.x;
        const cy = rect.top + rect.height / 2 - this.position.y;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            if (child.isShape) {
                child.position.x -= cx;
                child.position.y -= cy;
            }
        }
        if (this.mask) {
            this.mask.position.x -= cx;
            this.mask.position.y -= cy;
        }
        return this;
    }

    getById(id: string): IShape<unknown> {
        let found = null;
        function search(node: IShape<unknown>): IShape<unknown> {
            if (node.id === id) {
                return node;
            }
            else if (node instanceof Group && node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    found = search(node.children.getAt(i));
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        }
        return search(this);
    }

    getByClassName(className: string): IShape<unknown>[] {
        const found: IShape<unknown>[] = [];
        function search(node: IShape<unknown>) {
            if (Array.prototype.indexOf.call(node.classList, className) >= 0) {
                found.push(node);
            }
            if (node instanceof Group && node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children.getAt(i);
                    search(child);
                }
            }
            return found;
        }
        return search(this);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getByType(type: any): IShape<unknown>[] {
        const found: IShape<unknown>[] = [];
        function search(node: IShape<unknown>) {
            if (node instanceof type) {
                found.push(node);
            }
            if (node instanceof Group && node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children.getAt(i);
                    search(child);
                }
            }
            return found;
        }
        return search(this);
    }

    add(...shapes: Shape<Group>[]) {
        for (let i = 0; i < shapes.length; i++) {
            const child = shapes[i];
            if (!(child && child.id)) {
                continue;
            }
            const index = this.children.indexOf(child);
            if (index >= 0) {
                this.children.splice(index, 1);
            }
            this.children.push(child);
        }
        return this;
    }

    remove(...shapes: Shape<Group>[]) {
        for (let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            shape.dispose();
            const index = this.children.indexOf(shape);
            if (index >= 0) {
                this.children.splice(index, 1);
            }
        }
        return this;
    }

    getBoundingClientRect(shallow = false): { top: number; left: number; right: number; bottom: number; width?: number; height?: number } {

        this.update();

        // Variables need to be defined here, because of nested nature of groups.
        let left = Infinity, right = -Infinity,
            top = Infinity, bottom = -Infinity;

        const matrix = shallow ? this.matrix : this.worldMatrix;

        for (let i = 0; i < this.children.length; i++) {

            const child = this.children.getAt(i);

            if (!child.visible || child.hasBoundingClientRect()) {
                continue;
            }

            const rect = child.getBoundingClientRect(shallow);

            const tc = typeof rect.top !== 'number' || isNaN(rect.top) || !isFinite(rect.top);
            const lc = typeof rect.left !== 'number' || isNaN(rect.left) || !isFinite(rect.left);
            const rc = typeof rect.right !== 'number' || isNaN(rect.right) || !isFinite(rect.right);
            const bc = typeof rect.bottom !== 'number' || isNaN(rect.bottom) || !isFinite(rect.bottom);

            if (tc || lc || rc || bc) {
                continue;
            }

            if (shallow) {
                const [ax, ay] = matrix.multiply_vector(rect.left, rect.top);
                const [bx, by] = matrix.multiply_vector(rect.right, rect.top);
                const [cx, cy] = matrix.multiply_vector(rect.left, rect.bottom);
                const [dx, dy] = matrix.multiply_vector(rect.right, rect.bottom);

                top = Math.min(ay, by, cy, dy);
                left = Math.min(ax, bx, cx, dx);
                right = Math.max(ax, bx, cx, dx);
                bottom = Math.max(ay, by, cy, dy);
            }
            else {
                top = Math.min(rect.top, top);
                left = Math.min(rect.left, left);
                right = Math.max(rect.right, right);
                bottom = Math.max(rect.bottom, bottom);
            }
        }

        return {
            top: top,
            left: left,
            right: right,
            bottom: bottom,
            width: right - left,
            height: bottom - top
        };
    }

    /**
     * Apply `noFill` method to all child shapes.
     */
    noFill() {
        this.children.forEach(function (child) {
            child.noFill();
        });
        return this;
    }

    /**
     * Apply `noStroke` method to all child shapes.
     */
    noStroke() {
        this.children.forEach(function (child) {
            child.noStroke();
        });
        return this;
    }

    /**
     * Apply `subdivide` method to all child shapes.
     */
    subdivide(limit: number) {
        this.children.forEach(function (child) {
            child.subdivide(limit);
        });
        return this;
    }

    update(): this {
        if (this.flags[Flag.Beginning] || this.flags[Flag.Ending]) {

            const beginning = Math.min(this.beginning, this.ending);
            const ending = Math.max(this.beginning, this.ending);
            const length = this.length;
            let sum = 0;

            const bd = beginning * length;
            const ed = ending * length;

            for (let i = 0; i < this.children.length; i++) {
                const child = this.children.getAt(i);
                const l = child.length;

                if (bd > sum + l) {
                    child.beginning = 1;
                    child.ending = 1;
                }
                else if (ed < sum) {
                    child.beginning = 0;
                    child.ending = 0;
                }
                else if (bd > sum && bd < sum + l) {
                    child.beginning = (bd - sum) / l;
                    child.ending = 1;
                }
                else if (ed > sum && ed < sum + l) {
                    child.beginning = 0;
                    child.ending = (ed - sum) / l;
                }
                else {
                    child.beginning = 0;
                    child.ending = 1;
                }
                sum += l;
            }
        }
        return super.update();
    }

    flagReset(dirtyFlag = false) {
        if (this.flags[Flag.Additions]) {
            this.additions.length = 0;
            this.flags[Flag.Additions] = dirtyFlag;
        }

        if (this.flags[Flag.Subtractions]) {
            this.subtractions.length = 0;
            this.flags[Flag.Subtractions] = false;
        }

        this.flags[Flag.Order] = dirtyFlag;
        this.flags[Flag.Mask] = dirtyFlag;
        this.flags[Flag.Opacity] = dirtyFlag;

        this.flags[Flag.Beginning] = dirtyFlag;
        this.flags[Flag.Ending] = dirtyFlag;

        super.flagReset.call(this);

        return this;

    }
    get automatic(): boolean {
        return this.#automatic;
    }
    set automatic(automatic: boolean) {
        this.#automatic = automatic;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.automatic = automatic;
        }
    }
    get beginning(): number {
        return this.#beginning;
    }
    set beginning(beginning: number) {
        if (typeof beginning === 'number') {
            if (this.beginning !== beginning) {
                this.#beginning = beginning;
                this.flags[Flag.Beginning] = true;
            }
        }
    }
    get cap(): 'butt' | 'round' | 'square' {
        return this.#cap;
    }
    set cap(cap: 'butt' | 'round' | 'square') {
        this.#cap = cap;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.cap = cap;
        }
    }
    /**
     * @name Two.Group#children
     * @property {Two.Group.Children}
     * @description A list of all the children in the scenegraph.
     * @nota-bene Ther order of this list indicates the order each element is rendered to the screen.
     */
    get children(): Children<Shape<Group>> {
        return this.#shapes;
    }
    set children(children) {

        this.#unsubscribe_from_shapes();
        this.#shapes.dispose();

        this.#shapes = children;
        this.#subscribe_to_shapes();

        for (let i = 0; i < children.length; i++) {
            const shape = children.getAt(i);
            update_shape_group(shape, this);
        }
    }
    get closed(): boolean {
        return this.#closed;
    }
    set closed(v: boolean) {
        this.#closed = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.closed = v;
        }
    }
    get curved(): boolean {
        return this.#curved;
    }
    set curved(v: boolean) {
        this.#curved = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.curved = v;
        }
    }
    get ending(): number {
        return this.#ending;
    }
    set ending(ending: number) {
        if (typeof ending === 'number') {
            if (this.ending !== ending) {
                this.#ending = ending;
                this.flags[Flag.Ending] = true;
            }
        }
    }
    get fill(): string | LinearGradient | RadialGradient | Texture {
        return this.#fill;
    }
    set fill(fill: string | LinearGradient | RadialGradient | Texture) {
        this.#fill = fill;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.fill = fill;
        }
    }
    get join(): 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round' {
        return this.#join;
    }
    set join(v: 'arcs' | 'bevel' | 'miter' | 'miter-clip' | 'round') {
        this.#join = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.join = v;
        }
    }
    get length(): number {
        if (this.flags[Flag.Length] || this.#length <= 0) {
            this.#length = 0;
            if (!this.children) {
                return this.#length;
            }
            for (let i = 0; i < this.children.length; i++) {
                const child = this.children.getAt(i);
                this.#length += child.length;
            }
        }
        return this.#length;
    }
    get linewidth(): number {
        return this.#linewidth;
    }
    set linewidth(linewidth: number) {
        this.#linewidth = linewidth;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.linewidth = linewidth;
        }
    }
    get mask(): Shape<Group> {
        return this.#mask;
    }
    set mask(mask: Shape<Group>) {
        this.#mask = mask;
        this.flags[Flag.Mask] = true;
        if (!mask.clip) {
            mask.clip = true;
        }
    }
    get miter(): number {
        return this.#miter;
    }
    set miter(v: number) {
        this.#miter = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.miter = v;
        }
    }
    get opacity(): number {
        return this.#opacity;
    }
    set opacity(opacity: number) {
        if (typeof opacity === 'number') {
            if (this.opacity !== opacity) {
                this.#opacity = opacity;
                this.flags[Flag.Opacity] = true;
            }
        }
    }
    get stroke(): string | LinearGradient | RadialGradient | Texture {
        return this.#stroke;
    }
    set stroke(stroke: string | LinearGradient | RadialGradient | Texture) {
        this.#stroke = stroke;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.stroke = stroke;
        }
    }
    get visible(): boolean {
        return this.#visible;
    }
    set visible(visible: boolean) {
        this.flags[Flag.Visible] = this.#visible !== visible || this.flags[Flag.Visible];
        this.#visible = visible;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.visible = visible;
        }
    }
}

// /**
//  * Helper function used to sync parent-child relationship within the
//  * `Two.Group.children` object.
//  *
//  * Set the parent of the passed object to another object
//  * and updates parent-child relationships
//  * Calling with one arguments will simply remove the parenting
//  */
export function update_shape_group(child: Shape<Group>, parent?: Group) {

    const previous_parent = child.parent;

    if (previous_parent === parent) {
        add();
        return;
    }

    if (previous_parent && previous_parent.children.ids[child.id]) {
        const index = Array.prototype.indexOf.call(previous_parent.children, child);
        previous_parent.children.splice(index, 1);
        splice();
    }

    if (parent) {
        add();
        return;
    }

    splice();

    if (previous_parent.flags[Flag.Additions] && previous_parent.additions.length === 0) {
        previous_parent.flags[Flag.Additions] = false;
    }
    if (previous_parent.flags[Flag.Subtractions] && previous_parent.subtractions.length === 0) {
        previous_parent.flags[Flag.Subtractions] = false;
    }

    delete child.parent;

    function add() {

        if (parent.subtractions.length > 0) {
            const index = Array.prototype.indexOf.call(parent.subtractions, child);
            if (index >= 0) {
                parent.subtractions.splice(index, 1);
            }
        }

        if (parent.additions.length > 0) {
            const index = Array.prototype.indexOf.call(parent.additions, child);
            if (index >= 0) {
                parent.additions.splice(index, 1);
            }
        }

        child.parent = parent;
        parent.additions.push(child);
        parent.flags[Flag.Additions] = true;
    }

    function splice() {

        const indexAdd = previous_parent.additions.indexOf(child);
        if (indexAdd >= 0) {
            previous_parent.additions.splice(indexAdd, 1);
        }

        const indexSub = previous_parent.subtractions.indexOf(child);
        if (indexSub < 0) {
            previous_parent.subtractions.push(child);
            previous_parent.flags[Flag.Subtractions] = true;
        }
    }
}

function shape_attributes(attributes: Partial<GroupAttributes>): Partial<ShapeAttributes> {
    const retval: Partial<ShapeAttributes> = {
        id: attributes.id
    };
    return retval;
}
