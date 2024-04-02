import { Subscription } from 'rxjs';
import { IShape } from './IShape.js';
import { Children } from './children.js';
import { Parent, Shape } from './shape.js';

export interface IGroup extends Parent {
    remove(...shapes: Shape<IGroup>[]): void;
}

// Constants

const min = Math.min, max = Math.max;

export class Group extends Shape<unknown> {
    _flagAdditions = false;
    _flagSubtractions = false;
    _flagOrder = false;
    _flagOpacity = true;
    _flagBeginning = false;
    _flagEnding = false;
    _flagLength = false;
    _flagMask = false;
    _flagVisible = false;

    _fill = '#fff';
    _stroke = '#000';
    _linewidth = 1.0;
    _opacity = 1.0;
    _visible = true;
    _cap = 'round';
    _join = 'round';
    _miter = 4;
    _closed = true;
    _curved = false;
    _automatic = true;

    /**
     * @name Two.Group#beginning
     * @property {Number} - Number between zero and one to state the beginning of where the path is rendered.
     * @description {@link Two.Group#beginning} is a percentage value that represents at what percentage into all child shapes should the renderer start drawing.
     * @nota-bene This is great for animating in and out stroked paths in conjunction with {@link Two.Group#ending}.
     */
    _beginning = 0;

    /**
     * @name Two.Group#ending
     * @property {Number} - Number between zero and one to state the ending of where the path is rendered.
     * @description {@link Two.Group#ending} is a percentage value that represents at what percentage into all child shapes should the renderer start drawing.
     * @nota-bene This is great for animating in and out stroked paths in conjunction with {@link Two.Group#beginning}.
     */
    _ending = 1.0;

    /**
     * @name Two.Group#length
     * @property {Number} - The sum of distances between all child lengths.
     */
    _length = 0;

    /**
     * @name Two.Group#mask
     * @property {Two.Shape} - The Two.js object to clip from a group's rendering.
     */
    _mask: Shape<Group> = null;

    _shapes: Children<Shape<Group>>;
    #shapes_insert_subscription: Subscription | null = null;
    #shapes_remove_subscription: Subscription | null = null;
    #shapes_order_subscription: Subscription | null = null;

    clip: boolean;

    /**
     * An automatically updated list of shapes that need to be appended to the renderer's scenegraph.
     */
    readonly additions: Shape<Group>[] = [];
    /**
     * An automatically updated list of children that need to be removed from the renderer's scenegraph.
     */
    readonly subtractions: Shape<Group>[] = [];

    constructor(shapes: Shape<Group>[] = []) {

        super();

        this._shapes = new Children(shapes);

        this.#subscribe_to_shapes();

        //

        this.viewInfo.type = 'group';
    }

    hasBoundingClientRect(): boolean {
        return false;
    }

    dispose() {
        this.#unsubscribe_from_shapes();
        this._shapes.dispose();
    }

    #subscribe_to_shapes(): void {
        this.#shapes_insert_subscription = this._shapes.insert$.subscribe((inserts: Shape<Group>[]) => {
            for (const shape of inserts) {
                update_shape_group(shape, this);
            }
        });

        this.#shapes_remove_subscription = this._shapes.remove$.subscribe((removes: Shape<Group>[]) => {
            for (const shape of removes) {
                update_shape_group(shape, null);
            }
        });

        this.#shapes_order_subscription = this._shapes.order$.subscribe(() => {
            this._flagOrder = true;
        });
    }

    #unsubscribe_from_shapes(): void {
        if (this.#shapes_insert_subscription) {
            this.#shapes_insert_subscription.unsubscribe();
            this.#shapes_insert_subscription = null;
        }
        if (this.#shapes_remove_subscription) {
            this.#shapes_remove_subscription.unsubscribe();
            this.#shapes_remove_subscription = null;
        }
        if (this.#shapes_order_subscription) {
            this.#shapes_order_subscription.unsubscribe();
            this.#shapes_order_subscription = null;
        }
    }

    static Children = Children;

    /**
     * @name Two.Group.Properties
     * @property {String[]} - A list of properties that are on every {@link Two.Group}.
     */
    static Properties = [
        'fill',
        'stroke',
        'linewidth',
        'cap',
        'join',
        'miter',

        'closed',
        'curved',
        'automatic'
    ];

    /**
     * Orient the children of the group to the upper left-hand corner of that group.
     */
    corner() {

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
     * @name Two.Group#center
     * @function
     * @description Orient the children of the group to the center of that group.
     */
    center() {

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

    /**
     * @name Two.Group#getById
     * @function
     * @description Recursively search for id. Returns the first element found.
     * @returns {Two.Shape} - Or `null` if nothing is found.
     */
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

        const l = arguments.length;
        const grandparent = this.parent;

        // TODO: I don't like this double-meaning. It's in Shape too.
        // Allow to call remove without arguments
        // This will detach the object from its own parent.
        if (l <= 0 && grandparent) {
            if (grandparent instanceof Group) {
                (grandparent as IGroup).remove(this as Shape<IGroup>);
            }
            return this;
        }

        // Remove the objects
        for (let i = 0; i < shapes.length; i++) {
            const object = shapes[i];
            if (!object || !this.children.ids[object.id]) {
                continue;
            }
            const index = this.children.indexOf(object);
            if (index >= 0) {
                this.children.splice(index, 1);
            }
        }

        return this;

    }

    getBoundingClientRect(shallow = false): { top: number; left: number; right: number; bottom: number; width?: number; height?: number } {

        this._update();

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

                top = min(ay, by, cy, dy);
                left = min(ax, bx, cx, dx);
                right = max(ax, bx, cx, dx);
                bottom = max(ay, by, cy, dy);
            }
            else {
                top = min(rect.top, top);
                left = min(rect.left, left);
                right = max(rect.right, right);
                bottom = max(rect.bottom, bottom);
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

    _update() {

        if (this._flagBeginning || this._flagEnding) {

            const beginning = Math.min(this._beginning, this._ending);
            const ending = Math.max(this._beginning, this._ending);
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

        return super._update();
    }

    /**
     * @name Two.Group#flagReset
     * @function
     * @private
     * @description Called internally to reset all flags. Ensures that only properties that change are updated before being sent to the renderer.
     */
    flagReset() {

        if (this._flagAdditions) {
            this.additions.length = 0;
            this._flagAdditions = false;
        }

        if (this._flagSubtractions) {
            this.subtractions.length = 0;
            this._flagSubtractions = false;
        }

        this._flagOrder = this._flagMask = this._flagOpacity =
            this._flagBeginning = this._flagEnding = false;

        super.flagReset.call(this);

        return this;

    }
    get automatic(): boolean {
        return this._automatic;
    }
    set automatic(v: boolean) {
        this._automatic = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.automatic = v;
        }
    }
    get beginning(): number {
        return this._beginning;
    }
    set beginning(v: number) {
        this._flagBeginning = this._beginning !== v || this._flagBeginning;
        this._beginning = v;
    }
    get cap(): string {
        return this._cap;
    }
    set cap(v: string) {
        this._cap = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.cap = v;
        }
    }
    /**
     * @name Two.Group#children
     * @property {Two.Group.Children}
     * @description A list of all the children in the scenegraph.
     * @nota-bene Ther order of this list indicates the order each element is rendered to the screen.
     */
    get children(): Children<Shape<Group>> {
        return this._shapes;
    }
    set children(children) {

        this.#unsubscribe_from_shapes();
        this._shapes.dispose();

        this._shapes = children;
        this.#subscribe_to_shapes();

        for (let i = 0; i < children.length; i++) {
            const shape = children.getAt(i);
            update_shape_group(shape, this);
        }
    }
    get closed(): boolean {
        return this._closed;
    }
    set closed(v: boolean) {
        this._closed = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.closed = v;
        }
    }
    get curved(): boolean {
        return this._curved;
    }
    set curved(v: boolean) {
        this._curved = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.curved = v;
        }
    }
    get ending(): number {
        return this._ending;
    }
    set ending(v: number) {
        this._flagEnding = this._ending !== v || this._flagEnding;
        this._ending = v;
    }
    get fill() {
        return this._fill;
    }
    set fill(v) {
        this._fill = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.fill = v;
        }
    }
    get join(): string {
        return this._join;
    }
    set join(v: string) {
        this._join = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.join = v;
        }
    }
    get length(): number {
        if (this._flagLength || this._length <= 0) {
            this._length = 0;
            if (!this.children) {
                return this._length;
            }
            for (let i = 0; i < this.children.length; i++) {
                const child = this.children.getAt(i);
                this._length += child.length;
            }
        }
        return this._length;
    }
    get linewidth(): number {
        return this._linewidth;
    }
    set linewidth(v: number) {
        this._linewidth = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.linewidth = v;
        }
    }
    get mask(): Shape<Group> {
        return this._mask;
    }
    set mask(v: Shape<Group>) {
        this._mask = v;
        this._flagMask = true;
        if (!v.clip) {
            v.clip = true;
        }
    }
    get miter(): number {
        return this._miter;
    }
    set miter(v: number) {
        this._miter = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.miter = v;
        }
    }
    get opacity(): number {
        return this._opacity;
    }
    set opacity(v: number) {
        this._flagOpacity = this._opacity !== v || this._flagOpacity;
        this._opacity = v;
    }
    get stroke(): string {
        return this._stroke;
    }
    set stroke(v: string) {
        this._stroke = v;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children.getAt(i);
            child.stroke = v;
        }
    }
    get visible(): boolean {
        return this._visible;
    }
    set visible(v: boolean) {
        this._flagVisible = this._visible !== v || this._flagVisible;
        this._visible = v;
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
    let index;

    if (previous_parent === parent) {
        add();
        return;
    }

    if (previous_parent && previous_parent.children.ids[child.id]) {

        index = Array.prototype.indexOf.call(previous_parent.children, child);
        previous_parent.children.splice(index, 1);

        splice();

    }

    if (parent) {
        add();
        return;
    }

    splice();

    if (previous_parent._flagAdditions && previous_parent.additions.length === 0) {
        previous_parent._flagAdditions = false;
    }
    if (previous_parent._flagSubtractions && previous_parent.subtractions.length === 0) {
        previous_parent._flagSubtractions = false;
    }

    delete child.parent;

    function add() {

        if (parent.subtractions.length > 0) {
            index = Array.prototype.indexOf.call(parent.subtractions, child);

            if (index >= 0) {
                parent.subtractions.splice(index, 1);
            }
        }

        if (parent.additions.length > 0) {
            index = Array.prototype.indexOf.call(parent.additions, child);

            if (index >= 0) {
                parent.additions.splice(index, 1);
            }
        }

        child.parent = parent;
        parent.additions.push(child);
        parent._flagAdditions = true;
    }

    function splice() {

        index = Array.prototype.indexOf.call(previous_parent.additions, child);

        if (index >= 0) {
            previous_parent.additions.splice(index, 1);
        }

        index = Array.prototype.indexOf.call(previous_parent.subtractions, child);

        if (index < 0) {
            previous_parent.subtractions.push(child);
            previous_parent._flagSubtractions = true;
        }
    }
}
