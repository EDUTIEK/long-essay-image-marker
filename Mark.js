import { isNumber, arrayOf, isString, isBoolean, errorOnMismatch, isPoint, only, createGeneric, define, identity } from './utils';

export const SHAPES = {
    CIRCLE: 'circle',
    RECTANGLE: 'rectangle',
    POLYGON: 'polygon',
    LINE: 'line',
    WAVE: 'wave',
};

const isShapeName = x => Object.values(SHAPES).includes(x);

const expectedShapes = {
    [SHAPES.CIRCLE]: {symbol: isString, symbolColor: isString},
    [SHAPES.RECTANGLE]: {width: isNumber, height: isNumber},
    [SHAPES.POLYGON]: {polygon: arrayOf(isPoint)},
    [SHAPES.LINE]: {end: isPoint},
    [SHAPES.WAVE]: {end: isPoint},
};

const expectedBase = {
    key: isString,
    label: isString,
    color: isString,
    selectedColor: isString,
    shape: isShapeName,
    pos: isPoint,
    locked: isBoolean,
};

const selectBase = object => ({
    ...only(Object.keys(expectedBase), object),
    pos: only(['x', 'y'], object.pos),
});

const selectShape = {
    [SHAPES.CIRCLE]: x => only(['symbol', 'symbolColor'], x),
    [SHAPES.RECTANGLE]: x => only(['width', 'height'], x),
    [SHAPES.POLYGON]: ({polygon}) => ({polygon: polygon.map(x => only(['x', 'y'], x))}),
    [SHAPES.LINE]: ({end: {x, y}}) => ({end: {x, y}}),
    [SHAPES.WAVE]: ({end: {x, y}}) => ({end: {x, y}}),
};

const applyDefaults = createGeneric(x => x.shape);

define(applyDefaults, identity);
define(applyDefaults, SHAPES.CIRCLE, ({symbol = '', symbolColor = 'black', ...x}) => ({...x, symbol, symbolColor}));

/**
 * @typedef {{x: number, y: number}} Point
 *
 * @typedef {{
 *     key: {string},
 *     label: {string},
 *     color: {string},
 *     selectedColor: {string},
 *     shape,: {string},
 *     pos: {Point},
 *     locked: {boolean},
 * }} Mark
 *
 * @typedef {Mark & {width: number, height: number}} Rectangle
 * @typedef {Mark & {symbol: string}} Circle
 * @typedef {Mark & {polygon: Point[]}} Polygon
 * @typedef {Mark & {end: Point}} Line
 * @typedef {Mark & {end: Point}} Wave
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
 * @param {string} [object.symbol]
 * @param {string} [object.symbolColor]
 * @param {boolean} [object.locked]
 *
 * @return {Mark}
 */
export default object => {
    object = {...object, key: object.key || 'mark-' + Math.random().toString(), locked: object.locked || false};
    errorOnMismatch(expectedBase, object);
    object = applyDefaults(object);
    errorOnMismatch(expectedShapes[object.shape], object);

    return {
        ...selectBase(object),
        ...selectShape[object.shape](object),
    };
};
