export const Void = () => {};

const distance = (a, b) => Math.abs(a - b);

export const rectFromPoints = (a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: distance(a.x, b.x),
    height: distance(a.y, b.y),
});

export const identity = x => x;
export const isObject = x => typeof x === 'object';
export const isString = x => typeof x === 'string';
export const isNumber = x => typeof x === 'number';
export const isUndefined = x => typeof x === 'undefined';
export const isNull = x => x === null;
export const isBoolean = x => [true, false].includes(x);
export const mapObject = (proc, object) => Object.fromEntries(Object.entries(object).map(([k, v]) => [k, proc(v, k)]));
const filterObject = (keep, object) => Object.fromEntries(Object.entries(object).filter(([k, v]) => keep(v, k)));
export const without = (keys, object) => filterObject((_, key) => !keys.includes(key), object);
export const only = (keys, object) => filterObject((_, key) => keys.includes(key), object);

export const matchesShape = (shape, value) => isObject(value) && 0 === Object.values(mapObject((proc, k) => proc(value[k]), shape)).filter(x => !x).length;

const pipe = (...args) => x => args.reduce((x, f) => f(x), x);
export const compose = (...args) => pipe(...args.reverse());

const none = Symbol('none');
export const ifSome = proc => x => x === none ? none : proc(x);
export const ifNone = proc => x => x === none ? proc() : x;

export const unless = (predicate, proc) => x => predicate(x) ? x : proc(x);

export const mismatch = (shape, value) => compose(
    ...Object.entries(shape).map(([key, proc]) => ifNone(() => proc(value[key]) ? none : {key, type: proc.name, offendingValue: value[key]})),
)(isObject(value) ? none : {type: isObject.name, offendingValue: value});

export const errorOnMismatch = (shape, value) => {
    const showKey = key => key ? `Key "${key}" of ` : '';
    ifSome(({type, key = false}) => error(
        `Value does not match required form: ${showKey(key)}${JSON.stringify(value)} does not satisfy ${type}.`
    ))(mismatch(shape, value));
};

export const onlyWhen = (predicate, proc) => (...args) => {
    if (predicate(...args)) {
        return proc(...args);
    }
};

export const point = (x, y) => ({x, y});
export const isPoint = p => matchesShape({x: isNumber, y: isNumber}, p);

export const addPoint = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
export const multiplyPoint = (scalar, a) => ({x: a.x * scalar, y: a.y * scalar});
export const subtractPoint = (a, b) => addPoint(a, multiplyPoint(-1, b));
export const pointAsSize = a => ({width: a.x, height: a.y});
export const sizeAsPoint = s => point(s.width, s.height);
export const size = (width, height) => ({width, height});

export const rotatePoint = (a, r) => point(a.x * Math.cos(r) - a.y*Math.sin(r), a.x*Math.sin(r) + a.y*Math.cos(r));

const between = (left, x, right) => left <= x && x <= right;

const pointInRect = (p, rect) => between(rect.x, p.x, rect.x + rect.width) && between(rect.y, p.y, rect.y + rect.height);

const pointAsString = ({x, y}) => `${x},${y}`;
const relativePoints = (polygon, point) => polygon.map(p => addPoint(p, point));
const pointsAsString = points => points.map(pointAsString).join(' ');

export const relativePointsAsString = (points, point) => pointsAsString(relativePoints(points, point));

export const fitInRect = (viewport, size) => {
    const [first, second] = (viewport.width / viewport.height) < (size.width / size.height) ?
          ['height', 'width'] :
          ['width', 'height'];
    return {
        [first]: size[first],
        [second]: size[first] * (viewport[second] / viewport[first])
    };
};

export const error = message => {
    throw new Error(message);
};

export const assert = (ok, message) => ok || error(message);

export const always = x => () => x;
export const any = (predicate, array) => !isUndefined(array.find(predicate));
export const all = (predicate, array) => !any(x => !predicate(x), array);
export const isArray = x => x instanceof Array;

export const arrayOf = isType => {
    const desiredFunctionName = arrayOf.name + '(' + isType.name + ')';
    const trickJsToSetFunctioName = {
        [desiredFunctionName]: x => isArray(x) && all(isType, x),
    };
    return trickJsToSetFunctioName[desiredFunctionName];
};

export const diff = (left, right) => Object.entries(left).reduce((prev, [k, v]) => v === right[k] ? prev : [...prev, {left: v, right: right[k], name: k}], []);

export const set = Reflect.set;
export const remove = Reflect.deleteProperty;
export const curry = (proc, ...args) => proc.bind(null, ...args);
export const apply = proc => proc.apply.bind(proc, null);
export const callAll = array => array.map(proc => proc());
export const functionArgsFromObject = (proc, object) => Object.entries(object).forEach(apply(proc));
export const methodArgsFromObject = (x, method, object) => functionArgsFromObject(x[method].bind(x), object);
export const tap = proc => x => {
    proc(x);
    return x;
};

/**
 * This function creates a new reference.
 * A reference can be be set to a new value and may contain a guard which checks, that the ref can only be set to valid values.
 *
 * @template A
 * @typedef {(function(): A)|(function(A): void)} Ref<A>
 *
 * @param {A} value
 * @param {function(A): void} guard
 * @return Ref<A>
 */
export const ref = (value, guard = Void) => (newValue = undefined) => {
    if (isUndefined(newValue)) {
        return value;
    }
    guard(newValue);
    value = newValue;
};

const toString = JSON.stringify;

export const createGeneric = proc => {
    let notFound = (...args) => error(`No matching function found for arguments: ${toString(args)}.`);
    const map = {};
    const f = (...args) => (map[toString(proc(...args))] || notFound)(...args);

    f.define = (value, proc = undefined) => {
        if (isUndefined(proc)) {
            notFound = value;
        } else {
            map[toString(value)] = proc;
        }
    };

    return f;
};

export const define = (generic, ...rest) => generic.define(...rest);

const addBasicEventLease = (node, event, listener) => {
    node.addEventListener(event, listener);
    return () => node.removeEventListener(event, listener);
};

export const addEventLease = createGeneric((_, event) => event);

define(addEventLease, addBasicEventLease);

const defineEventPair = (first, second) => define(addEventLease, first, (node, _, listener) => {
    const releaseAll = [first, second].map(event => addBasicEventLease(node, event, listener));
    return () => {
        callAll(releaseAll);
    };
});

defineEventPair('mousedown', 'touchstart');
defineEventPair('mousemove', 'touchmove');
defineEventPair('mouseup', 'touchend');

export const mousePoint = createGeneric(event => event.constructor.name);

define(mousePoint, 'MouseEvent', event => point(event.clientX, event.clientY));
define(mousePoint, 'TouchEvent', event => point(event.touches[0].clientX, event.touches[0].clientY));

// @Todo: Check if all exports are necessary.

const pathOfDiff = set => set.reduce((l, c) => isObject(c.right) && !isArray(c.right) ? [
    ...l,
    ...(pathDiff(c.left, c.right).map(({path, ...rest}) => ({path: [c.name, ...path], ...rest})))
] : [...l, {path: [c.name], value: c.right}], []);

export const pathDiff = (a, b) => pathOfDiff(diff(a, b));
export const memberInChanges = (path, changes) => !isUndefined(changes.find(x => pathEquals(x.path, path)));
const pathEquals = (path, other) =>  JSON.stringify(path) === JSON.stringify(other);
const pathBeginsWith = (path, beginsWith) => path.length >= beginsWith.length && pathEquals(path.slice(0, beginsWith.length), beginsWith);

export const findPath = (path, x) => 0 === path.length ?
      x :
      isObject(x) ?
      findPath(path.slice(1), x[path[0]]) :
      error('Path not found.');

export const onChange = (dependentPath, action) => ({
    requires: path => pathBeginsWith(path, dependentPath),
    then: compose(action, curry(findPath, dependentPath)),
});

export const neverChange = (value, action) => ({
    requires: always(false),
    then: compose(action, always(value)),
});

export const onChangeValues = (structure, action) => ({
    requires: path => any(curry(pathBeginsWith, path), Object.values(structure)),
    then: obj => action(mapObject(path => findPath(path, obj), structure)),
});

export const setAttribute = name => value => node => node.setAttribute(name, isNumber(value) ? (value) : value);
export const setText = () => value => node => set(node, 'textContent', value);
export const setStyleAttribute = name => value => node => node.style.setProperty(name, value);

export const removeDuplicates = a => a.reduce((l, x) => l.includes(x) ? l : [...l, x], []);

export const applyDef = (val, def, node) => def.forEach(({then}) => then(val)(node));

export const updateDef = (val, def, changes, node) => {
    const addArray = ({path}) => def.filter(x => x.requires(path));
    const ons = removeDuplicates(changes.reduce((ons, change) => ons.concat(addArray(change)), []));
    applyDef(val, ons, node);
};

export const add = (parent, node) => parent.append(node);
export const setAttributes = (node, attributes) => methodArgsFromObject(node, 'setAttribute', attributes);
export const mouseFlow = ({start, move, stop = Void}) => {
    let x = null;
    return {
        start: e => {
            e.preventDefault();
            x = start(mousePoint(e));
        },
        move: e => {
            e.preventDefault();
            x = move(mousePoint(e), x);
        },
        stop: e => {stop(x);},
    };
};

export const moveChildren = (from, to) => Array.from(from.children).forEach(curry(add, to));

const willBuildNodeOf = createNode => (name, attributes = {}, ...children) => {
    const node = createNode(name);
    children.forEach(child => add(node, child));
    setAttributes(node, attributes);
    return node;
};

const svgElement = name => document.createElementNS('http://www.w3.org/2000/svg', name);
export const buildSvg = willBuildNodeOf(svgElement);
export const buildNode = willBuildNodeOf(name => document.createElement(name));

export const createLock = () => {
    let locked = null;

    return then => {
        if (locked !== null) {
            return new Promise(Void);
        }
        const newLock = () => {
            if (locked === newLock) {
                locked = null;
                return true;
            }
            return false;
        };
        locked = newLock;
        return new Promise(resolve => then(() => {
            newLock();
            resolve();
        }));
    };
};

export const createStatus = status => {
    const lock = createLock();

    return {
        current: () => status,
        acquire: (newStatus, then) => lock(release => {
            const oldStatus = status;
            status = newStatus;
            then(() => {
                if (release()) {
                    status = oldStatus;
                }
            });
        }),
    };
};

export const loadImage = url => new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(size(image.width, image.height));
    image.onerror = reject;
    image.src = url;
});

const eventIsTouchEnd = event => event.type === 'touchend' && event.touches.length === 0;

const eventIsPrimary = createGeneric((event, name = undefined) => isUndefined(name) ? event.constructor.name : name);
define(eventIsPrimary, 'TouchEvent', event => event.touches.length === 1 || eventIsTouchEnd(event));
define(eventIsPrimary, 'MouseEvent', event => event.button === 0);
define(eventIsPrimary, 'PointerEvent', event => eventIsPrimary(event, 'MouseEvent'));

const eventIsSecondary = createGeneric(event => event.constructor.name);
define(eventIsSecondary, 'TouchEvent', event => event.touches.length === 2 || eventIsTouchEnd(event));
define(eventIsSecondary, 'MouseEvent', event => event.button === 1);
define(eventIsSecondary, 'PointerEvent', event => eventIsSecondary(event, 'MouseEvent'));

export const addEvent = createGeneric((_, event) => event);

define(addEvent, addEventLease);

['click', 'mousedown', 'mouseup'].forEach(name => {
    define(addEvent, name, (node, name, listener) => addEventLease(node, name, onlyWhen(eventIsPrimary, listener)));
    define(addEvent, [name, 'primary'], (node, [name, _], listener) => addEvent(node, name, listener));
    define(addEvent, [name, 'secondary'], (node, [name, _], listener) => addEventLease(node, name, onlyWhen(eventIsSecondary, listener)));
});

export const willFollowMouseDown = (node, {start = Void, move = Void, stop = Void}, button, e) => {
    const onMove = e => move(e); // Don't use move directly, to keep the event listener private.
    const onUp = e => {
        callAll(releaseAll);
        stop(e);
    };

    const releaseAll = [
        addEvent(window, ['mouseup', button], onUp),
        addEvent(node, 'mousemove', onMove),
    ];

    start(e);
};
