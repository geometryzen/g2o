import { Anchor } from '../anchor.js';
import { Constants } from '../constants.js';
import { Gradient } from '../effects/gradient.js';
import { LinearGradient } from '../effects/linear-gradient.js';
import { RadialGradient } from '../effects/radial-gradient.js';
import { Sprite } from '../effects/sprite.js';
import { Stop } from '../effects/stop.js';
import { Group } from '../group.js';
import { Path } from '../path.js';
import { Registry } from '../registry.js';
import { Shape } from '../shape.js';
import { Circle } from '../shapes/circle.js';
import { Ellipse } from '../shapes/ellipse.js';
import { Line } from '../shapes/line.js';
import { Rectangle } from '../shapes/rectangle.js';
import { RoundedRectangle } from '../shapes/rounded-rectangle.js';
import { Text } from '../text.js';
import { Two } from '../two.js';
import { G20 } from '../vector.js';
import { MatrixDecomposition } from './MatrixDecomposition.js';
import { getReflection } from './curves.js';
import { decomposeMatrix } from './decompose_matrix.js';
import { Commands } from './path-commands.js';
import { root } from './root.js';

// https://github.com/jonobr1/two.js/issues/507#issuecomment-777159213
const regex = {
    path: /[+-]?(?:\d*\.\d+|\d+)(?:[eE][+-]\d+)?/g,
    cssBackgroundImage: /url\(['"]?#([\w\d-_]*)['"]?\)/i,
    unitSuffix: /[a-zA-Z%]*/i
} as const;

const alignments = {
    start: 'left',
    middle: 'center',
    end: 'right'
} as const;

// Reserved attributes to remove
const reservedAttributesToRemove = ['id', 'class', 'transform', 'xmlns', 'viewBox'] as const;

const overwriteAttrs = ['x', 'y', 'width', 'height', 'href', 'xlink:href'] as const;

/**
 * @param {AlignmentString}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor}
 */
function getAlignment(text_anchor_value: 'start' | 'middle' | 'end'): 'left' | 'center' | 'right' {
    return alignments[text_anchor_value];
}

function getBaseline(node: SVGElement): 'bottom' | 'middle' | 'top' {
    const a = node.getAttribute('dominant-baseline');
    const b = node.getAttribute('alignment-baseline');
    return (a || b) as 'bottom' | 'middle' | 'top';
}

function getTagName(tag: string): string {
    return tag.replace(/svg:/ig, '').toLowerCase();
}

function applyTransformsToVector(transforms: MatrixDecomposition, vector: Vector): void {

    vector.x += transforms.translateX;
    vector.y += transforms.translateY;

    vector.x *= transforms.scaleX;
    vector.y *= transforms.scaleY;

    if (transforms.rotation !== 0) {
        // TODO: Test further
        const l = vector.length();
        vector.x = l * Math.cos(transforms.rotation);
        vector.y = l * Math.sin(transforms.rotation);
    }
}

/**
 * @param text The CSS text body to be parsed and extracted.
 * @param styles The styles object to apply CSS key values to.
 * @description Parse CSS text body and apply them as key value pairs to a JavaScript object.
 */
function extractCSSText(text: string, styles: ParentStyles): void {

    const commands = text.split(';');

    for (let i = 0; i < commands.length; i++) {
        const command = commands[i].split(':');
        const name = command[0];
        const value = command[1];
        if (typeof name === 'undefined' || typeof value === 'undefined') {
            continue;
        }
        styles[name] = value.replace(/\s/, '');
    }
}

function get_svg_element_styles(element: SVGElement): { [name: string]: string } {

    const styles: { [name: string]: string } = {};
    const non_reserved_names: string[] = get_svg_element_non_reserved_attribute_names(element);
    const length = Math.max(non_reserved_names.length, element.style.length);

    for (let i = 0; i < length; i++) {

        const command = element.style[i];
        const non_reserved_name = non_reserved_names[i];

        if (command) {
            styles[command] = element.style[command];
        }
        if (non_reserved_name) {
            styles[non_reserved_name] = element.getAttribute(non_reserved_name);
        }
    }
    return styles;
}

/**
 * @returns The SVG attribute names of the element with the reserved 'id','class','transform','xmlns', and 'viewBox' removed
 */
function get_svg_element_non_reserved_attribute_names(element: SVGElement): string[] {

    const names = element.getAttributeNames();

    for (let i = 0; i < reservedAttributesToRemove.length; i++) {
        const keyword = reservedAttributesToRemove[i];
        const index = names.indexOf(keyword);
        if (index >= 0) {
            names.splice(index, 1);
        }
    }

    return names;

}

/**
 * @param node The group to apply viewbox matrix to
 * @param value The viewBox value from the SVG attribute
 * @description Applies the transform of the SVG Viewbox on a given node.
 */
function applySvgViewBox(node: Group, viewBox: string): void {

    const elements: string[] = viewBox.split(/[\s,]/);

    const x = - parseFloat(elements[0]);
    const y = - parseFloat(elements[1]);
    const width = parseFloat(elements[2]);
    const height = parseFloat(elements[3]);

    if (x && y) {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children.getAt(i);
            if ('translation' in child) {
                child.translation.add(x, y);
            }
            else if ('x' in child) {
                child.x = x;
            }
            else if ('y' in child) {
                child.y = y;
            }
        }
    }

    const xExists = typeof node.x === 'number';
    const yExists = typeof node.y === 'number';
    const widthExists = typeof node.width === 'number';
    const heightExists = typeof node.height === 'number';

    if (xExists) {
        node.translation.x += node.x;
    }
    if (yExists) {
        node.translation.y += node.y;
    }
    if (widthExists || heightExists) {
        node.scale = new G20(1, 1);
    }
    if (widthExists) {
        node.scale.x = node.width / width;
    }
    if (heightExists) {
        node.scale.y = node.height / height;
    }

    const rectangle = new Rectangle(0, 0, width, height);
    node.mask = rectangle;
    rectangle.origin.set(- width / 2, - height / 2);
}

/**
 * Iterates through an SVG Node's properties and stores ones of interest on the shape.
 * It tries to resolve styles applied via CSS as well.
 * @TODO Reverse calculate {@link Gradient}s for fill / stroke of any given path.
 */
function applySvgAttributes(this: Board, node: SVGElement, elem: Shape, parentStyles: ParentStyles) {

    const styles = {}, attributes = {}, extracted = {};
    let i, m, key, value, prop, attr;
    let transforms, x, y;
    let id, scene, ref, tagName;
    let ca, cb, cc, error;

    if (node === null) {
        return styles;
    }

    // Not available in non browser environments
    if (root.getComputedStyle) {
        // Convert CSSStyleDeclaration to a normal object
        const computedStyles = root.getComputedStyle(node);
        i = computedStyles.length;

        while (i--) {
            key = computedStyles[i];
            value = computedStyles[key];
            // Gecko returns undefined for unset properties
            // Webkit returns the default value
            if (typeof value !== 'undefined') {
                styles[key] = value;
            }
        }
    }

    // Convert NodeMap to a normal object
    for (i = 0; i < node.attributes.length; i++) {
        attr = node.attributes[i];
        if (/style/i.test(attr.nodeName)) {
            extractCSSText(attr.value, extracted);
        }
        else {
            attributes[attr.nodeName] = attr.value;
        }
    }

    // Getting the correct opacity is a bit tricky, since SVG path elements don't
    // support opacity as an attribute, but you can apply it via CSS.
    // So we take the opacity and set (stroke/fill)-opacity to the same value.
    if (typeof styles.opacity !== 'undefined') {
        styles['stroke-opacity'] = styles.opacity;
        styles['fill-opacity'] = styles.opacity;
        delete styles.opacity;
    }

    // Merge attributes and applied styles (attributes take precedence)
    if (parentStyles) {
        _.defaults(styles, parentStyles);
    }
    _.extend(styles, extracted, attributes);

    // Similarly visibility is influenced by the value of both display and visibility.
    // Calculate a unified value here which defaults to `true`.
    styles.visible = !(typeof styles.display === 'undefined' && /none/i.test(styles.display))
        || (typeof styles.visibility === 'undefined' && /hidden/i.test(styles.visibility));

    // Now iterate the whole thing
    for (key in styles) {
        value = styles[key];

        switch (key) {
            case 'gradientTransform':
                // TODO: Check this out https://github.com/paperjs/paper.js/blob/develop/src/svg/SvgImport.js#L315
                if (/none/i.test(value)) break;
                m = (node.gradientTransform && node.gradientTransform.baseVal && node.gradientTransform.baseVal.length > 0)
                    ? node.gradientTransform.baseVal[0].matrix
                    : (node.getCTM ? node.getCTM() : null);

                if (m === null) break;

                transforms = decomposeMatrix(m.a, m.b, m.c, m.d, m.e, m.f);

                switch (elem.viewInfo.type) {
                    case 'linear-gradient':
                        applyTransformsToVector(transforms, elem.left);
                        applyTransformsToVector(transforms, elem.right);
                        break;
                    case 'radial-gradient':
                        elem.center.x += transforms.translateX;
                        elem.center.y += transforms.translateY;

                        elem.focal.x += transforms.translateX;
                        elem.focal.y += transforms.translateY;

                        elem.radius *= Math.max(transforms.scaleX, transforms.scaleY);
                        break;
                }

                break;
            case 'transform':
                // TODO: Check this out https://github.com/paperjs/paper.js/blob/develop/src/svg/SvgImport.js#L315
                if (/none/i.test(value)) break;
                m = (node.transform && node.transform.baseVal && node.transform.baseVal.length > 0)
                    ? node.transform.baseVal[0].matrix
                    : (node.getCTM ? node.getCTM() : null);

                // Might happen when transform string is empty or not valid.
                if (m === null) break;

                if (Constants.AutoCalculateImportedMatrices) {

                    // Decompose and infer model related properties.
                    transforms = decomposeMatrix(m.a, m.b, m.c, m.d, m.e, m.f);

                    elem.translation.set(transforms.translateX, transforms.translateY);
                    elem.rotation = Math.PI * (transforms.rotation / 180);
                    elem.scale = new G20(transforms.scaleX, transforms.scaleY);

                    x = parseFloat((styles.x + '').replace('px'));
                    y = parseFloat((styles.y + '').replace('px'));

                    // Override based on attributes.
                    if (x) {
                        elem.translation.x = x;
                    }

                    if (y) {
                        elem.translation.y = y;
                    }

                }
                else {

                    // Edit the underlying matrix and don't force an auto calc.
                    m = node.getCTM();
                    elem._matrix.manual = true;
                    elem._matrix.set(m.a, m.b, m.c, m.d, m.e, m.f);

                }

                break;
            case 'visible':
                if (elem instanceof Group) {
                    elem._visible = value;
                    break;
                }
                elem.visible = value;
                break;
            case 'stroke-linecap':
                if (elem instanceof Group) {
                    elem._cap = value;
                    break;
                }
                elem.cap = value;
                break;
            case 'stroke-linejoin':
                if (elem instanceof Group) {
                    elem._join = value;
                    break;
                }
                elem.join = value;
                break;
            case 'stroke-miterlimit':
                if (elem instanceof Group) {
                    elem._miter = value;
                    break;
                }
                elem.miter = value;
                break;
            case 'stroke-width':
                if (elem instanceof Group) {
                    elem._linewidth = parseFloat(value);
                    break;
                }
                elem.strokeWidth = parseFloat(value);
                break;
            case 'opacity':
            case 'stroke-opacity':
            case 'fill-opacity':
                // Only apply styles to rendered shapes
                // in the scene.
                if (elem instanceof Group) {
                    elem.opacity = parseFloat(value);
                    break;
                }
                elem.opacity = parseFloat(value);
                break;
            case 'clip-path':
                if (regex.cssBackgroundImage.test(value)) {
                    id = value.replace(regex.cssBackgroundImage, '$1');
                    if (get_defs_current() && get_defs_current().contains(id)) {
                        ref = get_defs_current().get(id);
                        if (ref && ref.childNodes.length > 0) {
                            ref = ref.childNodes[0];
                            tagName = getTagName(ref.nodeName);
                            elem.mask = read[tagName].call(this, ref, {});
                            switch (elem.viewInfo.type) {
                                case 'text':
                                case 'path':
                                    // The matrix here needs to change to insure that the object
                                    // clipping is in the same coordinate space as the `elem`.
                                    elem.position.add(elem.mask.position);
                                    elem.mask.position.clear();
                                    break;
                            }
                        }
                    }
                }
                break;
            case 'fill':
            case 'stroke':
                prop = (elem instanceof Group ? '_' : '') + key;
                if (regex.cssBackgroundImage.test(value)) {
                    id = value.replace(regex.cssBackgroundImage, '$1');
                    // Overwritten id for non-conflicts on same page SVG documents
                    // TODO: Make this non-descructive
                    // node.setAttribute('two-' + key, value.replace(/\)/i, '-' + Constants.Identifier + 'applied)'));
                    if (get_defs_current() && get_defs_current().contains(id)) {
                        ref = get_defs_current().get(id);
                        if (!ref.object) {
                            tagName = getTagName(ref.nodeName);
                            ref.object = read[tagName].call(this, ref, {});
                        }
                        ref = ref.object;
                    }
                    else {
                        scene = getScene(this);
                        ref = scene.getById(id);
                    }
                    elem[prop] = ref;
                }
                else {
                    elem[prop] = value;
                }
                break;
            case 'id':
                elem.id = value;
                // Overwritten id for non-conflicts on same page SVG documents
                // TODO: Make this non-destructive
                // node.id = value + '-' + Constants.Identifier + 'applied';
                break;
            case 'class':
            case 'className':
                elem.classList = value.split(' ');
                elem._flagClassName = true;
                break;
            case 'x':
            case 'y':
                ca = elem instanceof Gradient;
                cb = elem instanceof LinearGradient;
                cc = elem instanceof RadialGradient;
                if (ca || cb || cc) {
                    break;
                }
                if (value.match('[a-z%]$') && !value.endsWith('px')) {
                    error = new Error('only pixel values are supported with the ' + key + ' attribute.');
                    // eslint-disable-next-line no-console
                    console.warn(error.name, error.message);
                }
                elem.translation[key] = parseFloat(value);
                break;
            case 'font-family':
                if (elem instanceof Text) {
                    elem.family = value;
                }
                break;
            case 'font-size':
                if (elem instanceof Text) {
                    elem.size = value;
                }
                break;
            case 'font-weight':
                if (elem instanceof Text) {
                    elem.weight = value;
                }
                break;
            case 'font-style':
                if (elem instanceof Text) {
                    elem.style = value;
                }
                break;
            case 'text-decoration':
                if (elem instanceof Text) {
                    elem.decoration = value;
                }
                break;
            case 'line-height':
                if (elem instanceof Text) {
                    elem.leading = value;
                }
                break;
        }
    }

    if (Object.keys(node.dataset).length) {
        elem.dataset = node.dataset;
    }

    return styles;

}

function updateDefsCache(node: SVGDefsElement, defsCache: Registry<ChildNode>): void {
    for (let i = 0, l = node.childNodes.length; i < l; i++) {
        const childNode = node.childNodes[i];
        // FIXME: unknown could happen, but type system doesn't like it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = (childNode as any).id as (string | null);
        if (!id) {
            continue;
        }
        else {
            const tagName = getTagName(node.nodeName);
            if (tagName === '#text') continue;

            defsCache.add(id, childNode);
        }
    }
}

function getScene(node: Shape): Group {

    while (node.parent) {
        node = node.parent;
    }

    if (node instanceof Two) {
        return node.#scene;
    }
    else {
        throw new Error();
    }
}

function set_defs_current(registry: Registry): Registry {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (read.defs as any).current = registry;
    return registry;
}

function get_defs_current(): Registry {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (read.defs as any).current as Registry;
}

function delete_defs_current(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (read.defs as any).current;
}

export type ParentStyles = { [name: string]: string };

/**
 * A map of functions to read any number of SVG node types and create model equivalents of them.
 *  Primarily used by the {@link Two#interpret} method.
 */
export const read = {

    svg: function (this: Two, node: SVGElement): Group {

        const defs = set_defs_current(new Registry());
        const elements = node.getElementsByTagName('defs');

        for (let i = 0; i < elements.length; i++) {
            updateDefsCache(elements[i], defs);
        }

        const svg = read.g.call(this, node);
        const viewBox = node.getAttribute('viewBox');
        const x = node.getAttribute('x');
        const y = node.getAttribute('y');
        const width = node.getAttribute('width');
        const height = node.getAttribute('height');

        svg.defs = defs;  // Export out the <defs /> for later use

        const viewBoxExists = viewBox !== null;
        const xExists = x !== null;
        const yExists = y !== null;
        const widthExists = width !== null;
        const heightExists = height !== null;

        if (xExists) {
            svg.x = parseFloat(x.replace(regex.unitSuffix, ''));
        }
        if (yExists) {
            svg.y = parseFloat(y.replace(regex.unitSuffix, ''));
        }
        if (widthExists) {
            svg.width = parseFloat(width.replace(regex.unitSuffix, ''));
        }
        if (heightExists) {
            svg.height = parseFloat(height.replace(regex.unitSuffix, ''));
        }
        if (viewBoxExists) {
            applySvgViewBox(svg, viewBox);
        }

        delete_defs_current();

        return svg;
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defs: function (this: Two, node: SVGElement): null {
        return null;
    },

    use: function (this: Two, node: SVGElement, styles: ParentStyles) {

        let error;

        const href = node.getAttribute('href') || node.getAttribute('xlink:href');
        if (!href) {
            error = new Error('encountered <use /> with no href.');
            // eslint-disable-next-line no-console
            console.warn(error.name, error.message);
            return null;
        }

        const id = href.slice(1);
        if (!get_defs_current().contains(id)) {
            error = new Error('unable to find element for reference ' + href + '.');
            // eslint-disable-next-line no-console
            console.warn(error.name, error.message);
            return null;
        }

        const template = get_defs_current().get(id);
        const fullNode = template.cloneNode(true);

        for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            const ca = overwriteAttrs.includes(attr.nodeName);
            const cb = !fullNode.hasAttribute(attr.nodeName);
            if (ca || cb) {
                fullNode.setAttribute(attr.nodeName, attr.value);
            }
        }

        const tagName = getTagName(fullNode.nodeName);
        return read[tagName].call(this, fullNode, styles);

    },

    g: function (this: Two, node: SVGElement, parentStyles: ParentStyles = {}) {

        const group = new Group();

        applySvgAttributes.call(this, node, group, parentStyles);

        this.add(group);

        // Switched up order to inherit more specific styles
        const styles = get_svg_element_styles.call(this, node);

        for (let i = 0, l = node.childNodes.length; i < l; i++) {
            const n = node.childNodes[i];
            const tag = n.nodeName;
            if (!tag) return;

            const tagName = getTagName(tag);

            if (tagName in read) {
                const o = read[tagName].call(group, n, styles);
                if (!!o && !o.parent) {
                    group.add(o);
                }
            }
        }

        return group;

    },

    polygon: function (node, parentStyles) {

        let points;

        if (typeof node === 'string') {
            points = node;
        }
        else {
            points = node.getAttribute('points');
        }

        const verts = [];
        points.replace(/(-?[\d.eE-]+)[,|\s](-?[\d.eE-]+)/g, function (match, p1, p2) {
            verts.push(new Anchor(parseFloat(p1), parseFloat(p2)));
        });

        const poly = new Path(verts, true).noStroke();
        poly.fill = 'black';

        applySvgAttributes.call(this, node, poly, parentStyles);

        return poly;

    },

    polyline: function (node, parentStyles) {
        const poly = read.polygon.call(this, node, parentStyles);
        poly.closed = false;
        return poly;
    },

    path: function (node, parentStyles) {

        let path;

        if (typeof node === 'string') {
            path = node;
            node = null;
        }
        else {
            path = node.getAttribute('d');
        }

        let points = [];
        let closed = false, relative = false;

        if (path) {

            let coord = new Anchor();
            let control, coords;
            let commands = path.match(/[a-df-z][^a-df-z]*/ig);
            const last = commands.length - 1;

            // Split up polybeziers

            _.each(commands.slice(0), function (command, i) {

                const items = command.slice(1).trim().match(regex.path);
                const type = command[0];
                const lower = type.toLowerCase();
                let bin, j, l, ct, times;
                const result = [];

                if (i === 0) {
                    commands = [];
                }

                switch (lower) {
                    case 'h':
                    case 'v':
                        if (items.length > 1) {
                            bin = 1;
                        }
                        break;
                    case 'm':
                    case 'l':
                    case 't':
                        if (items.length > 2) {
                            bin = 2;
                        }
                        break;
                    case 's':
                    case 'q':
                        if (items.length > 4) {
                            bin = 4;
                        }
                        break;
                    case 'c':
                        if (items.length > 6) {
                            bin = 6;
                        }
                        break;
                    case 'a':
                        if (items.length > 7) {
                            bin = 7;
                        }
                        break;
                }

                // This means we have a polybezier.
                if (bin) {

                    for (j = 0, l = items.length, times = 0; j < l; j += bin) {

                        ct = type;
                        if (times > 0) {

                            switch (type) {
                                case 'm':
                                    ct = 'l';
                                    break;
                                case 'M':
                                    ct = 'L';
                                    break;
                            }

                        }

                        result.push(ct + items.slice(j, j + bin).join(' '));
                        times++;

                    }

                    commands = Array.prototype.concat.apply(commands, result);

                }
                else {

                    commands.push(command);

                }

            });

            _.each(commands, function (command, i) {

                let result, x, y;
                const type = command[0];
                const lower = type.toLowerCase();

                coords = command.slice(1).trim().match(regex.path);
                relative = type === lower;

                let x1, y1, x2, y2, x3, y3, x4, y4, reflection;
                let a, b;
                let anchor, rx, ry, xAxisRotation, largeArcFlag, sweepFlag;

                switch (lower) {

                    case 'z':
                        if (i >= last) {
                            closed = true;
                        }
                        else {
                            x = coord.x;
                            y = coord.y;
                            result = new Anchor(
                                x, y,
                                undefined, undefined,
                                undefined, undefined,
                                Commands.close
                            );
                            // Make coord be the last `m` command
                            for (let j = points.length - 1; j >= 0; j--) {
                                const point = points[j];
                                if (/m/i.test(point.command)) {
                                    coord = point;
                                    break;
                                }
                            }
                        }
                        break;

                    case 'm':
                    case 'l':

                        control = undefined;

                        x = parseFloat(coords[0]);
                        y = parseFloat(coords[1]);

                        result = new Anchor(
                            x, y,
                            undefined, undefined,
                            undefined, undefined,
                            /m/i.test(lower) ? Commands.move : Commands.line
                        );

                        if (relative) {
                            result.addSelf(coord);
                        }

                        // result.controls.left.copy(result);
                        // result.controls.right.copy(result);

                        coord = result;
                        break;

                    case 'h':
                    case 'v':

                        a = /h/i.test(lower) ? 'x' : 'y';
                        b = /x/i.test(a) ? 'y' : 'x';

                        result = new Anchor(
                            undefined, undefined,
                            undefined, undefined,
                            undefined, undefined,
                            Commands.line
                        );
                        result[a] = parseFloat(coords[0]);
                        result[b] = coord[b];

                        if (relative) {
                            result[a] += coord[a];
                        }

                        // result.controls.left.copy(result);
                        // result.controls.right.copy(result);

                        coord = result;
                        break;

                    case 'c':
                    case 's':

                        x1 = coord.x;
                        y1 = coord.y;

                        if (!control) {
                            control = new Vector();//.copy(coord);
                        }

                        if (/c/i.test(lower)) {

                            x2 = parseFloat(coords[0]);
                            y2 = parseFloat(coords[1]);
                            x3 = parseFloat(coords[2]);
                            y3 = parseFloat(coords[3]);
                            x4 = parseFloat(coords[4]);
                            y4 = parseFloat(coords[5]);

                        }
                        else {

                            // Calculate reflection control point for proper x2, y2
                            // inclusion.

                            reflection = getReflection(coord, control, relative);

                            x2 = reflection.x;
                            y2 = reflection.y;
                            x3 = parseFloat(coords[0]);
                            y3 = parseFloat(coords[1]);
                            x4 = parseFloat(coords[2]);
                            y4 = parseFloat(coords[3]);

                        }

                        if (relative) {
                            x2 += x1;
                            y2 += y1;
                            x3 += x1;
                            y3 += y1;
                            x4 += x1;
                            y4 += y1;
                        }

                        coord.controls.right.set(x2 - coord.x, y2 - coord.y);
                        result = new Anchor(
                            x4, y4,
                            x3 - x4, y3 - y4,
                            undefined, undefined,
                            Commands.curve
                        );

                        coord = result;
                        control = result.controls.left;

                        break;

                    case 't':
                    case 'q':

                        x1 = coord.x;
                        y1 = coord.y;

                        if (!control) {
                            control = new Vector();
                        }

                        if (/q/i.test(lower)) {

                            x2 = parseFloat(coords[0]);
                            y2 = parseFloat(coords[1]);
                            x3 = parseFloat(coords[0]);
                            y3 = parseFloat(coords[1]);
                            x4 = parseFloat(coords[2]);
                            y4 = parseFloat(coords[3]);

                        }
                        else {

                            reflection = getReflection(coord, control, relative);

                            x2 = reflection.x;
                            y2 = reflection.y;
                            x3 = reflection.x;
                            y3 = reflection.y;
                            x4 = parseFloat(coords[0]);
                            y4 = parseFloat(coords[1]);

                        }

                        if (relative) {
                            x2 += x1;
                            y2 += y1;
                            x3 += x1;
                            y3 += y1;
                            x4 += x1;
                            y4 += y1;
                        }

                        coord.controls.right.set(
                            (x2 - coord.x) * 0.33, (y2 - coord.y) * 0.33);
                        result = new Anchor(
                            x4, y4,
                            x3 - x4, y3 - y4,
                            undefined, undefined,
                            Commands.curve
                        );

                        coord = result;
                        control = result.controls.left;

                        break;

                    case 'a':

                        x1 = coord.x;
                        y1 = coord.y;

                        rx = parseFloat(coords[0]);
                        ry = parseFloat(coords[1]);
                        xAxisRotation = parseFloat(coords[2]);// * PI / 180;
                        largeArcFlag = parseFloat(coords[3]);
                        sweepFlag = parseFloat(coords[4]);

                        x4 = parseFloat(coords[5]);
                        y4 = parseFloat(coords[6]);

                        if (relative) {
                            x4 += x1;
                            y4 += y1;
                        }

                        anchor = new Anchor(x4, y4);
                        anchor.command = Commands.arc;
                        anchor.rx = rx;
                        anchor.ry = ry;
                        anchor.xAxisRotation = xAxisRotation;
                        anchor.largeArcFlag = largeArcFlag;
                        anchor.sweepFlag = sweepFlag;

                        result = anchor;

                        coord = anchor;
                        control = undefined;

                        break;

                }

                if (result) {
                    if (Array.isArray(result)) {
                        points = points.concat(result);
                    }
                    else {
                        points.push(result);
                    }
                }

            });

        }

        path = new Path(points, closed, undefined, true).noStroke();
        path.fill = 'black';

        const rect = path.getBoundingClientRect(true);

        // Center objects to stay consistent
        // with the rest of the API.
        rect.centroid = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        _.each(path.vertices, function (v) {
            v.subSelf(rect.centroid);
        });

        applySvgAttributes.call(this, node, path, parentStyles);

        path.translation.addSelf(rect.centroid);

        return path;

    },

    circle: function (node, parentStyles) {

        const x = parseFloat(node.getAttribute('cx'));
        const y = parseFloat(node.getAttribute('cy'));
        const r = parseFloat(node.getAttribute('r'));

        const circle = new Circle(0, 0, r).noStroke();
        circle.fill = 'black';

        applySvgAttributes.call(this, node, circle, parentStyles);

        circle.translation.x = x;
        circle.translation.y = y;

        return circle;

    },

    ellipse: function (node, parentStyles) {

        const x = parseFloat(node.getAttribute('cx'));
        const y = parseFloat(node.getAttribute('cy'));
        const width = parseFloat(node.getAttribute('rx'));
        const height = parseFloat(node.getAttribute('ry'));

        const ellipse = new Ellipse(0, 0, width, height).noStroke();
        ellipse.fill = 'black';

        applySvgAttributes.call(this, node, ellipse, parentStyles);

        ellipse.translation.x = x;
        ellipse.translation.y = y;

        return ellipse;

    },

    rect: function (node, parentStyles) {

        const rx = parseFloat(node.getAttribute('rx'));
        const ry = parseFloat(node.getAttribute('ry'));

        if (!_.isNaN(rx) || !_.isNaN(ry)) {
            return read['rounded-rect'](node);
        }

        const width = parseFloat(node.getAttribute('width'));
        const height = parseFloat(node.getAttribute('height'));

        const w2 = width / 2;
        const h2 = height / 2;

        const rect = new Rectangle(0, 0, width, height).noStroke();
        rect.fill = 'black';

        applySvgAttributes.call(this, node, rect, parentStyles);

        // For rectangles, (x, y) is the center of the shape rather than the top
        // left corner.
        rect.translation.x += w2;
        rect.translation.y += h2;

        return rect;

    },

    'rounded-rect': function (node, parentStyles) {

        const rx = parseFloat(node.getAttribute('rx')) || 0;
        const ry = parseFloat(node.getAttribute('ry')) || 0;

        const width = parseFloat(node.getAttribute('width'));
        const height = parseFloat(node.getAttribute('height'));

        const w2 = width / 2;
        const h2 = height / 2;
        const radius = new Vector(rx, ry);

        const rect = new RoundedRectangle(0, 0, width, height, radius).noStroke();
        rect.fill = 'black';

        applySvgAttributes.call(this, node, rect, parentStyles);

        // For rectangles, (x, y) is the center of the shape rather than the top
        // left corner.
        rect.translation.x += w2;
        rect.translation.y += h2;

        return rect;

    },

    line: function (node, parentStyles) {

        const x1 = parseFloat(node.getAttribute('x1'));
        const y1 = parseFloat(node.getAttribute('y1'));
        const x2 = parseFloat(node.getAttribute('x2'));
        const y2 = parseFloat(node.getAttribute('y2'));

        const line = new Line(x1, y1, x2, y2).noFill();

        applySvgAttributes.call(this, node, line, parentStyles);

        return line;

    },

    lineargradient: function (node: HTMLElement, parentStyles: ParentStyles) {

        let units = node.getAttribute('gradientUnits');
        if (!units) {
            units = 'objectBoundingBox';
        }
        let spread = node.getAttribute('spreadMethod') as 'pad' | 'reflect' | 'repeat';
        if (!spread) {
            spread = 'pad';
        }

        let x1 = parseFloat(node.getAttribute('x1') || '0');
        let y1 = parseFloat(node.getAttribute('y1') || '0');
        let x2 = parseFloat(node.getAttribute('x2') || '0');
        let y2 = parseFloat(node.getAttribute('y2') || '0');

        const ox = (x2 + x1) / 2;
        const oy = (y2 + y1) / 2;

        if (/userSpaceOnUse/i.test(units)) {
            x1 -= ox;
            y1 -= oy;
            x2 -= ox;
            y2 -= oy;
        }

        const stops = [];
        for (let i = 0; i < node.children.length; i++) {

            const child = node.children[i];

            const offsetAttr = child.getAttribute('offset');
            let offset: number;
            if (/%/ig.test(offsetAttr)) {
                offset = parseFloat(offsetAttr.replace(/%/ig, '')) / 100;
            }
            else {
                offset = parseFloat(offsetAttr);
            }

            let color = child.getAttribute('stop-color');
            const opacityAttr = child.getAttribute('stop-opacity');
            const style = child.getAttribute('style');

            let matches: RegExpMatchArray | false;
            if (color === null) {
                matches = style ? style.match(/stop-color:\s?([#a-fA-F0-9]*)/) : false;
                color = matches && matches.length > 1 ? matches[1] : undefined;
            }

            let opacity: number;
            if (opacityAttr === null) {
                matches = style ? style.match(/stop-opacity:\s?([0-9.-]*)/) : false;
                opacity = matches && matches.length > 1 ? parseFloat(matches[1]) : 1;
            }
            else {
                opacity = parseFloat(opacityAttr);
            }

            stops.push(new Stop(offset, color, opacity));

        }

        const gradient = new LinearGradient(x1, y1, x2, y2, stops);

        gradient.spread = spread;
        gradient.units = units;

        applySvgAttributes.call(this, node, gradient, parentStyles);

        return gradient;
    },

    radialgradient: function (node: HTMLElement, parentStyles) {

        let units = node.getAttribute('gradientUnits');
        let spread = node.getAttribute('spreadMethod');

        if (!units) {
            units = 'objectBoundingBox';
        }
        if (!spread) {
            spread = 'pad';
        }

        let cx = parseFloat(node.getAttribute('cx')) || 0;
        let cy = parseFloat(node.getAttribute('cy')) || 0;
        let r = parseFloat(node.getAttribute('r'));

        let fx = parseFloat(node.getAttribute('fx'));
        let fy = parseFloat(node.getAttribute('fy'));

        if (_.isNaN(fx)) {
            fx = cx;
        }

        if (_.isNaN(fy)) {
            fy = cy;
        }

        const ox = Math.abs(cx + fx) / 2;
        const oy = Math.abs(cy + fy) / 2;

        if (/userSpaceOnUse/i.test(units)) {
            cx -= ox;
            cy -= oy;
            fx -= ox;
            fy -= oy;
        }

        const stops = [];
        for (let i = 0; i < node.children.length; i++) {

            const child = node.children[i];

            let offset = child.getAttribute('offset');
            if (/%/ig.test(offset)) {
                offset = parseFloat(offset.replace(/%/ig, '')) / 100;
            }
            offset = parseFloat(offset);

            let color = child.getAttribute('stop-color');
            let opacity = child.getAttribute('stop-opacity');
            const style = child.getAttribute('style');

            let matches;
            if (color === null) {
                matches = style ? style.match(/stop-color:\s?([#a-fA-F0-9]*)/) : false;
                color = matches && matches.length > 1 ? matches[1] : undefined;
            }

            if (opacity === null) {
                matches = style ? style.match(/stop-opacity:\s?([0-9.-]*)/) : false;
                opacity = matches && matches.length > 1 ? parseFloat(matches[1]) : 1;
            }
            else {
                opacity = parseFloat(opacity);
            }

            stops.push(new Stop(offset, color, opacity));

        }

        const gradient = new RadialGradient(cx, cy, r, stops, fx, fy);

        gradient.spread = spread;
        gradient.units = units;

        applySvgAttributes.call(this, node, gradient, parentStyles);

        return gradient;

    },

    text: function (this: Two, node: SVGElement, parentStyles) {

        const text_anchor_value = node.getAttribute('text-anchor') as 'start' | 'middle' | 'end';
        const alignment: 'left' | 'right' | 'center' = getAlignment(text_anchor_value) || 'left';
        const baseline = getBaseline(node) || 'baseline';
        const message = node.textContent;

        const text = new Text(message);

        applySvgAttributes.call(this, node, text, parentStyles);

        text.alignment = alignment;
        text.baseline = baseline;

        return text;

    },

    clippath: function (this: Two, node: SVGElement) {
        if (get_defs_current() && !get_defs_current().contains(node.id)) {
            get_defs_current().add(node.id, node);
        }
        return null;
    },

    image: function (node, parentStyles) {

        let error;

        const href = node.getAttribute('href') || node.getAttribute('xlink:href');
        if (!href) {
            error = new Error('encountered <image /> with no href.');
            console.warn(error.name, error.message);
            return null;
        }

        const x = parseFloat(node.getAttribute('x')) || 0;
        const y = parseFloat(node.getAttribute('y')) || 0;
        const width = parseFloat(node.getAttribute('width'));
        const height = parseFloat(node.getAttribute('height'));

        const sprite = new Sprite(href, x, y);

        if (!_.isNaN(width)) {
            sprite.width = width;
        }
        if (!_.isNaN(height)) {
            sprite.height = height;
        }

        applySvgAttributes.call(this, node, sprite, parentStyles);

        return sprite;
    }
} as const;
