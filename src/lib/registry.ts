/**
 * An arbitrary class to manage a directory of things. Mainly used for keeping tabs of textures in Two.js.
 * TODO: This could be replaced by a map
 */
export class Registry {

    map: { [id: string]: unknown } = {};

    constructor() { }

    add(id: string, obj: unknown) {
        this.map[id] = obj;
        return this;
    }

    remove(id:string) {
        delete this.map[id];
        return this;
    }

    get(id: string): unknown {
        return this.map[id];
    }

    contains(id:string): boolean {
        return id in this.map;
    }
}
