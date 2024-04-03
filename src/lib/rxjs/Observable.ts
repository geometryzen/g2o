import { Subscription } from "./Subscription";

export interface Observable<T> {
    subscribe(callback: (value: T) => void): Subscription;
}