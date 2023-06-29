import { matchesShape, isNumber, arrayOf, error, isString, mismatch, ifSome, errorOnMismatch, isPoint, only, curry } from './utils';

export const SHAPES = {
    CIRCLE: 'circle',
    RECTANGLE: 'rectangle',
    POLYGON: 'polygon',
};

const isShapeName = x => Object.values(SHAPES).includes(x);

const expectedShapes = {
    [SHAPES.CIRCLE]: {},
    [SHAPES.RECTANGLE]: {width: isNumber, height: isNumber},
    [SHAPES.POLYGON]: {polygon: arrayOf(isPoint)},
};

const expectedBase = {
    key: isString,
    label: isString,
    color: isString,
    shape: isShapeName,
    pos: isPoint,
};

const selectBase = object => ({
    ...only(Object.keys(expectedBase), object),
    pos: only(['x', 'y'], object.pos),
});

const selectShape = {
    [SHAPES.CIRCLE]: () => ({}),
    [SHAPES.RECTANGLE]: curry(only, ['width', 'height']),
    [SHAPES.POLYGON]: ({polygon}) => ({polygon: polygon.map(curry(only, ['x', 'y']))}),
};

/**
 * @typedef {{x: number, y: number}} Point
 *
 * @typedef {{
 *     key: {string}
 *     label: {string}
 *     color: {string}
 *     shape,: {string}
 *     pos: {Point}
 * }} Mark
 *
 * @typedef {Mark & {width: number, height: number}} Rectangle
 * @typedef {Mark} Circle
 * @typedef {Mark & {polygon: Point[]}} Polygon
 *
 * @param {Object} object
 *
 * Unique identifier of the mark, should be auto-generated for a new mark.
 * Maximum length is 50 characters.
 * @param {string} [object.key]
 * Label that is shown when a mark is selected.
 * Maximum length is 10 characters.
 * @param {string} object.label
 * @param {string} object.color
 * @param {string} object.shape,
 * Position of the mark in pixels on the full-width page image.
 * @param {Point} object.pos
 * @return {Mark}
 */
export default object => {
    const { key = 'mark-' + Math.random().toString() } = object;
    object.key = key;
    errorOnMismatch(expectedBase, object);
    errorOnMismatch(expectedShapes[object.shape], object);

    return {
        ...selectBase(object),
        ...selectShape[object.shape](object),
    };
};
