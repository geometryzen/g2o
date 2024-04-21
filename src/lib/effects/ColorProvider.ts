import { Observable } from '../reactive/Observable';
import { LinearGradient } from './linear-gradient';
import { RadialGradient } from './radial-gradient';

export interface ColorProvider {
    readonly id: string;
    readonly change$: Observable<unknown>;
    render(svgElement: SVGElement): this;
}

export type Color = string | ColorProvider;

export function is_color_provider(x: Color): x is ColorProvider {
    return x instanceof LinearGradient || x instanceof RadialGradient;
}

export function serialize_color(x: Color): string {
    if (is_color_provider(x)) {
        return `url(#${x.id})`;
    }
    else {
        return x;
    }
}
