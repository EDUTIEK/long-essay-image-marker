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

/**
 * Same as compose but the arguments are reversed:
 * const foo = pipe(f, g, h); // equivalent to compose(h, g, f)
 * foo('bar'); // => equivalent to h(g(f('bar')))
 */
const pipe = (...args) => x => args.reduce((x, f) => f(x), x);

/**
 * Composition function. This functions chains functions together:
 * const foo = compose(f, g, h);
 * foo('bar'); // equivalent to f(g(h('bar')));
 */
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

/**
 * @typedef {{width: number, height: number}} Size
 *
 * @param {width} number
 * @param {height} number
 * @return {Size}
 */
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

/**
 * Returns a diff object for all values in `left` which are not equal to `right`.
 * The object is not traversed recursively.
 *
 * @example
 * diff({a: 'hello', b: 111}, {a: 'hello', b: 123}); // => [{name: 'b', left: 111, right: 123}]
 * diff({}, {a: 'ignored'}); // => []
 * diff({a: 'hello'}, {}); // => [{name: 'a', left: 'hello', right: undefined}]
 *
 * @param {Object} left
 * @param {Object} right
 *
 * @return {{left: *, right: *, name: string}[]}
 */
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

/**
 * This is a simple implementation of Clojure's multimethods. See https://clojure.org/reference/multimethods for a detailed description.
 *
 * createGeneric creates a new function which will call different functions based upon it's arguments.
 * createGeneric receives one argument on creation. This function selects on which data the other functions will be matched upon:
 * const foo = createGeneric(object => object.shape); // All functions will be matched upon the object's shape.
 * const foo = createGeneric((action, object) => [action, object.shape]); // All functions will be matched upon the first argument and the second arguments shape property.
 *
 * To define a new function:
 * define(foo, 'bar', () => 'actual body');
 * This defines a new function on foo which will be called when the selector function will return 'bar'.
 * So:
 * const foo = createGeneric(x => x);
 * define(foo, 'bar', x => ({received: x}));
 *
 * foo('bar'); // => {received: 'bar'}
 *
 * and:
 *
 * const foo = createGeneric(object => object.name);
 * define(foo, 'bar', x => ({received: x}));
 *
 * foo({name: 'bar'}); // => {received: {name: 'bar'}}
 *
 * All arguments are passed to the selector function and to the matched function:
 * const foo = createGeneric((a, b, c) => [a, b, c]);
 * define(foo, [1, 2, 3], (...args) => args.join(' '));
 * foo(1, 2, 3); // => '1 2 3'
 *
 * A function can be defined, which will be called if nothing matched the given arguments (instead of throwing an error):
 * const foo = createGeneric(x => x);
 * define(foo, () => 'default case');
 * foo('bar'); // => 'default case'
 *
 * This function can also be seen as an extendable pattern matching or switch statement:
 * const foo = createGeneric(selector);
 * define(foo, 'triangle', () => 'A triangle');
 * define(foo, 'rectangle', () => 'A rect');
 *
 * can be seen as:
 * const foo = (...args) => {
 *     switch(selector(...args)){
 *         'triangle': return 'A triangle';
 *         'rectangle': return 'A rect';
 *         default: throw Error(...);
 *     }
 * };
 *
 * @example
 * const foo = createGeneric(object => object.shape);
 * define(foo, 'rectangle', object => [object.width, object.height]);
 * define(foo, 'circle', object => [object.radius * 2, object.radius * 2]);
 * define(foo, 'triangle', object => [object.width, object.width]);
 *
 * foo({shape: 'rectangle', width: 100, height: 300}); // => [100, 300]
 * foo({shape: 'circle', width: 10}); // => [20, 20]
 * foo({shape: 'hexagon', radius: 30}); // => Error: No matching function found ...
 *
 * const foo = createGeneric((a, b, c) => ({a, b, c}));
 * define(foo, {a: 'hej', b: 'ho', c: 'hu'}, () => 'hello');
 * define(foo, {a: 'ba', b: 'bo', c: 'bu'}, () => 'bye');
 *
 * foo('hej', 'ho', 'hu'); // => 'hello'
 * foo('ba', 'bo', 'bu'); // => 'bye'
 * foo('x', 'xx', 'xxx'); // => Error: No matching function found ...
 *
 * define(foo, () => 'default value');
 *
 * foo('x', 'xx', 'xxx'); // => 'default value'
 *
 * @param {function(...*): *}
 * @return {function(...*): *}
 */
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

/**
 * Please see createGeneric for more information.
 * Use this function to define new match cases for createGeneric(...).
 *
 * const foo = createGeneric(someFunction);
 * define(foo, 'aa', () => 1); is the same as: foo.define('aa', () => 1);
 */
export const define = (generic, ...rest) => generic.define(...rest);

/**
 * Adds the given event and returns a function to remove the attached event listener.
 * With this the node, event name and listener are encapsulated in the returned function, reemoving the need to save these values as well.
 *
 * @param {Element} node
 * @param {string} event
 * @param {function(Event): void} listener
 * @return {function(): void}
 */
const addBasicEventLease = (node, event, listener) => {
    node.addEventListener(event, listener);
    return () => node.removeEventListener(event, listener);
};

/**
 * Calls `addBasicEventLease` but adds exceptions to automatically attach event listeners to the corresponding touch events when adding a mouse event listener.
 *
 * @type {function(Element, string, function(Event): void)}
 */
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

/**
 * Returns the position of the mouse or touch position as a point.
 * This function hides the differences between different events to access the mouse position.
 *
 * @type {function(Event): Point}
 */
export const mousePoint = createGeneric(event => event.constructor.name);

define(mousePoint, 'MouseEvent', event => point(event.clientX, event.clientY));
define(mousePoint, 'TouchEvent', event => point(event.touches[0].clientX, event.touches[0].clientY));

const pathOfDiff = set => set.reduce((l, c) => isObject(c.right) && !isArray(c.right) ? [
    ...l,
    ...(pathDiff(c.left, c.right).map(({path, ...rest}) => ({path: [c.name, ...path], ...rest})))
] : [...l, {path: [c.name], value: c.right}], []);

/**
 * Traverses the parameter `a` recursively and returns a list of all paths which are different from `b`.
 *
 * @example
 * pathDiff({a: 'foo'}, {a: 'bar'}); // => [{path: ['a'], value: 'bar'}]
 * pathDiff({a: {b: {c: 1, d: 2}}}, {a: {b: {c: 1, d: 'foo'}}}); // => [{path: ['a', 'b', 'd'], value: 'foo'}]
 *
 * @typedef {{path: string[], value: *}[]} ChangeSet
 *
 * @param {object} a
 * @param {object} b
 *
 * @return {ChangeSet}
 */
export const pathDiff = (a, b) => pathOfDiff(diff(a, b));
export const memberInChanges = (path, changes) => !isUndefined(changes.find(x => pathEquals(x.path, path)));
const pathEquals = (path, other) =>  JSON.stringify(path) === JSON.stringify(other);
const pathBeginsWith = (path, beginsWith) => path.length >= beginsWith.length && pathEquals(path.slice(0, beginsWith.length), beginsWith);

/**
 * Selects a value in an object by a path.
 * @example
 * path(['a', 'b', 'c'], {a: {b: c: 123}}); // => 123
 *
 * @param {string[]} path
 * @param {*} x
 * @return {*}
 */
export const findPath = (path, x) => 0 === path.length ?
      x :
      isObject(x) ?
      findPath(path.slice(1), x[path[0]]) :
      error('Path not found.');

/**
 * @typedef {function(A): function(Element): void} Action<A>
 *
 * @typedef {{
 *     requires: function(string[]): boolean,
 *     then: Action<A>
 * }} Definition<A>
 *
 * @param {string[]} dependentPath
 * @param {Action} action
 *
 * @return {Definition}
 */
export const onChange = (dependentPath, action) => ({
    requires: path => pathBeginsWith(path, dependentPath),
    then: compose(action, curry(findPath, dependentPath)),
});

/**
 * @template A
 * @param {A} value
 * @param {Action<A>} action
 * @return Definition
 */
export const neverChange = (value, action) => ({
    requires: always(false),
    then: compose(action, always(value)),
});

/**
 * @param {Object<string, string[]>} structure,
 * @param {Action} action
 * @return {Definition}
 */
export const onChangeValues = (structure, action) => ({
    requires: path => any(curry(pathBeginsWith, path), Object.values(structure)),
    then: obj => action(mapObject(path => findPath(path, obj), structure)),
});

/**
 * @param {string} name
 * @return Action<string>
 */
export const setAttribute = name => value => node => node.setAttribute(name, isNumber(value) ? (value) : value);

/**
 * @return Action<string>
 */
export const setText = () => value => node => set(node, 'textContent', value);

/**
 * @param {string} name
 * @return Action<string>
 */
export const setStyleAttribute = name => value => node => node.style.setProperty(name, value);

export const removeDuplicates = a => a.reduce((l, x) => l.includes(x) ? l : [...l, x], []);

/**
 * Runs a given definition on a node element, regardless if the node needs to be updated.
 *
 * @example
 * const div = document.createElement('div');
 * applyDef('foo', [{then: x => n => n.setAttribute('id', x)}], div);
 * div.getAttribute('id'); // => 'foo'
 *
 * @template A
 *
 * @param {A} val
 * @param {Definition<A>[]} def
 * @param {Element} node
 * @return {void}
 */
export const applyDef = (val, def, node) => def.forEach(({then}) => then(val)(node));

/**
 * Runs a given definition on a node element, only the definitions which require a value in the given `changes` are applied.
 *
 * @example
 * const div = document.createElement('div');
 * const def = [onChange(['x'], setAttribute('class')), onChange(['y'], setAttribute('id'))];
 * const changes = [{path: ['bar']}];
 * updateDef({x: 'foo', y: 'bar'}, def, changes, div);
 * div.getAttribute('class'); // => undefined, because it was never set.
 * div.getAttribute('id'); // => 'bar'
 *
 * @param {A} val
 * @param {Definition<A>[]} def
 * @param {ChangeSet} changes
 * @param {Element} node
 * @return {void}
 */
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

/**
 * @template A
 * @typedef {{
 *     current: function(): A,
 *     acquire: function(A, function(function(): void): void)
 * }} Status
 *
 * @param {A} status
 * @return {Status<A>}
 */
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

/**
 * @param {string} url
 * @return {Promise<Size>}
 */
export const loadImage = url => new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(size(image.width, image.height));
    image.onerror = reject;
    image.src = url;
});

const eventIsTouchEnd = event => event.type === 'touchend' && event.touches.length === 0;

/**
 * Definitions what a primary button is for a mouse and a touch event.
 */
const eventIsPrimary = createGeneric((event, name = undefined) => isUndefined(name) ? event.constructor.name : name);
define(eventIsPrimary, 'TouchEvent', event => event.touches.length === 1 || eventIsTouchEnd(event));
define(eventIsPrimary, 'MouseEvent', event => event.button === 0);
define(eventIsPrimary, 'PointerEvent', event => eventIsPrimary(event, 'MouseEvent'));

/**
 * Definitions what a secondary button is for a mouse and a touch event.
 */
const eventIsSecondary = createGeneric(event => event.constructor.name);
define(eventIsSecondary, 'TouchEvent', event => event.touches.length === 2 || eventIsTouchEnd(event));
define(eventIsSecondary, 'MouseEvent', event => event.button === 1);
define(eventIsSecondary, 'PointerEvent', event => eventIsSecondary(event, 'MouseEvent'));

/**
 * Same as `addEventLease` but with the ability to directly define mouse events with for a primary or secondary button.
 * If the button is not specified, the primary button is used.
 * This function doesn't add a mouse event directly for primary AND secondary.
 *
 * The button can be assigned as follows:
 * addEvent(document.createElement('div'), ['click', 'primary'], () => console.log('Primary click.'));
 *
 * @type {function(Element, string|string[], function(Event): void)}
 */
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
