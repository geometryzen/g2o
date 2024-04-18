import { BehaviorSubject } from "rxjs";
import { DisposableObservable, Observable } from "./Observable";
import { State } from "./types";

export class Variable<T> implements State<T> {
    readonly #bs: BehaviorSubject<T>;
    constructor(bs: BehaviorSubject<T>) {
        this.#bs = bs;
    }
    get(): T {
        return this.#bs.getValue();
    }
    set(newValue: T): void {
        this.#bs.next(newValue);
    }
    asObservable(): Observable<T> {
        return new DisposableObservable(this.#bs.asObservable());
    }
}

export function variable<T>(initialValue: T): Variable<T> {
    const bs = new BehaviorSubject(initialValue);
    return new Variable(bs);
}