const Void = () => {};

const willFollowMouseDown = ({start = Void, move = Void, stop = Void}) => e => {
    const onMove = e => move(e); // Don't use move directly, to keep the event listener private.

    const onUp = e => {
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('mousemove', onMove);

        stop(e);
    };

    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    start(e);
};

const distance = (a, b) => Math.abs(a - b);

const rectFromPoints = (a, b) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: distance(a.x, b.x),
    height: distance(a.y, b.y),
});

const identity = x => x;
const isObject = x => typeof x === 'object';
const isString = x => typeof x === 'string';
const isNumber = x => typeof x === 'number';
const isUndefined = x => typeof x === 'undefined';
const mapObject = (proc, object) => Object.fromEntries(Object.entries(object).map(([k, v]) => [k, proc(v, k)]));
const filterObject = (keep, object) => Object.fromEntries(Object.entries(object).filter(([k, v]) => keep(v, k)));
const without = (keys, object) => filterObject((_, key) => !keys.includes(key), object);
const only = (keys, object) => filterObject((_, key) => keys.includes(key), object);

const matchesShape = (shape, value) => isObject(value) && 0 === Object.values(mapObject((proc, k) => proc(value[k]), shape)).filter(x => !x).length;

const pipe = (...args) => x => args.reduce((x, f) => f(x), x);
const compose = (...args) => pipe(...args.reverse());

const none = Symbol('none');
const ifSome = proc => x => x === none ? none : proc(x);
const ifNone = proc => x => x === none ? proc() : x;

const mismatch = (shape, value) => compose(
    ...Object.entries(shape).map(([key, proc]) => ifNone(() => proc(value[key]) ? none : {key, type: proc.name, offendingValue: value[key]})),
)(isObject(value) ? none : {type: isObject.name, offendingValue: value});

const errorOnMismatch = (shape, value) => {
    const showKey = key => key ? `Key "${key}" of ` : '';
    ifSome(({type, key = false}) => error(
        `Value does not match required form: ${showKey(key)}${JSON.stringify(value)} does not satisfy ${type}.`
    ))(mismatch(shape, value));
};

const point = (x, y) => ({x, y});
const isPoint = p => matchesShape({x: isNumber, y: isNumber}, p);
const mousePoint = event => ({x: event.clientX, y: event.clientY});

const addPoint = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
const multiplyPoint = (scalar, a) => ({x: a.x * scalar, y: a.y * scalar});
const subtractPoint = (a, b) => addPoint(a, multiplyPoint(-1, b));
const pointAsSize = a => ({width: a.x, height: a.y});
const sizeAsPoint = s => point(s.width, s.height);

const fitInRect = (viewport, size) => {
    const [first, second] = (viewport.width / viewport.height) < (size.width / size.height) ?
          ['height', 'width'] :
          ['width', 'height'];
    return {
        [first]: size[first],
        [second]: size[first] * (viewport[second] / viewport[first])
    };
};

const error = message => {
    throw new Error(message);
};

const always = x => () => x;
const any = (predicate, array) => !isUndefined(array.find(predicate));
const all = (predicate, array) => !any(x => !predicate(x), array);
const isArray = x => x instanceof Array;

const arrayOf = isType => {
    const desiredFunctionName = arrayOf.name + '(' + isType.name + ')';
    const trickJsToSetFunctioName = {
        [desiredFunctionName]: x => isArray(x) && all(isType, x),
    };
    return trickJsToSetFunctioName[desiredFunctionName];
};

const diff = (left, right) => Object.entries(left).reduce((prev, [k, v]) => v === right[k] ? prev : [...prev, {left: v, right: right[k], name: k}], []);

const set = Reflect.set;
const remove = Reflect.deleteProperty;
const curry = (proc, ...args) => proc.bind(null, ...args);
const apply = proc => proc.apply.bind(proc, null);
const functionArgsFromObject = (proc, object) => Object.entries(object).forEach(apply(proc));
const methodArgsFromObject = (x, method, object) => functionArgsFromObject(x[method].bind(x), object);
const tap = proc => x => {
    proc(x);
    return x;
};

const between = (left, x, right) => left <= x && x <= right;

const pointInRect = (p, rect) => between(rect.x, p.x, rect.x + rect.width) && between(rect.y, p.y, rect.y + rect.height);

const pointAsString = ({x, y}) => `${x},${y}`;
const relativePoints = (polygon, point) => polygon.map(p => addPoint(p, point));
const pointsAsString = points => points.map(pointAsString).join(' ');

const relativePointsAsString = (points, point) => pointsAsString(relativePoints(points, point));

const ignoreFirstCall = proc => {
    let wrapper = () => {wrapper = proc;};
    return (...args) => wrapper(...args);
};

const ref = value => (newValue = undefined) => {
    if (isUndefined(newValue)) {
        return value;
    }
    value = newValue;
};

export {willFollowMouseDown, mousePoint, rectFromPoints, addPoint, multiplyPoint, subtractPoint, pointAsSize, sizeAsPoint, point, without, isUndefined, isString, matchesShape, arrayOf, isNumber, error, mismatch, compose, ifSome, ifNone, errorOnMismatch, fitInRect, diff, apply, functionArgsFromObject, methodArgsFromObject, tap, only, Void, isObject, set, remove, curry, identity, any, all, always, isArray, between, pointInRect, isPoint, relativePoints, pointsAsString, ignoreFirstCall, ref, relativePointsAsString, mapObject};
