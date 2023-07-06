export const Void = () => {};

export const willFollowMouseDown = ({start = Void, move = Void, stop = Void}) => e => {
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

export const mismatch = (shape, value) => compose(
    ...Object.entries(shape).map(([key, proc]) => ifNone(() => proc(value[key]) ? none : {key, type: proc.name, offendingValue: value[key]})),
)(isObject(value) ? none : {type: isObject.name, offendingValue: value});

export const errorOnMismatch = (shape, value) => {
    const showKey = key => key ? `Key "${key}" of ` : '';
    ifSome(({type, key = false}) => error(
        `Value does not match required form: ${showKey(key)}${JSON.stringify(value)} does not satisfy ${type}.`
    ))(mismatch(shape, value));
};

export const point = (x, y) => ({x, y});
export const isPoint = p => matchesShape({x: isNumber, y: isNumber}, p);
export const mousePoint = event => ({x: event.clientX, y: event.clientY});

export const addPoint = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
export const multiplyPoint = (scalar, a) => ({x: a.x * scalar, y: a.y * scalar});
export const subtractPoint = (a, b) => addPoint(a, multiplyPoint(-1, b));
export const pointAsSize = a => ({width: a.x, height: a.y});
export const sizeAsPoint = s => point(s.width, s.height);
export const size = (width, height) => ({width, height});

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
export const functionArgsFromObject = (proc, object) => Object.entries(object).forEach(apply(proc));
export const methodArgsFromObject = (x, method, object) => functionArgsFromObject(x[method].bind(x), object);
export const tap = proc => x => {
    proc(x);
    return x;
};

export const between = (left, x, right) => left <= x && x <= right;

export const pointInRect = (p, rect) => between(rect.x, p.x, rect.x + rect.width) && between(rect.y, p.y, rect.y + rect.height);

export const pointAsString = ({x, y}) => `${x},${y}`;
export const relativePoints = (polygon, point) => polygon.map(p => addPoint(p, point));
export const pointsAsString = points => points.map(pointAsString).join(' ');

export const relativePointsAsString = (points, point) => pointsAsString(relativePoints(points, point));

export const ignoreFirstCall = proc => {
    let wrapper = () => {wrapper = proc;};
    return (...args) => wrapper(...args);
};

export const ref = value => (newValue = undefined, guard = Void) => {
    if (isUndefined(newValue)) {
        return value;
    }
    guard(newValue);
    value = newValue;
};

export const rotatePoint = (a, r) => point(a.x * Math.cos(r) - a.y*Math.sin(r), a.x*Math.sin(r) + a.y*Math.cos(r));
