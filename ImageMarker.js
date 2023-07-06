import createMark, { SHAPES } from './Mark';
import { isUndefined, compose, fitInRect, willFollowMouseDown, mousePoint, subtractPoint, addPoint, diff, set, remove, curry, methodArgsFromObject, tap, isObject, error, Void, only, point, rectFromPoints, any, always, isArray, pointInRect, relativePointsAsString, ignoreFirstCall, ref, mapObject, pointAsSize, sizeAsPoint, multiplyPoint, isNumber, size, assert, rotatePoint } from './utils';

const pattern = size(5, 4);

const pathOfDiff = set => set.reduce((l, c) => isObject(c.right) && !isArray(c.right) ? [
    ...l,
    ...(pathDiff(c.left, c.right).map(({path, ...rest}) => ({path: [c.name, ...path], ...rest})))
] : [...l, {path: [c.name], value: c.right}], []);

const pathDiff = (a, b) => pathOfDiff(diff(a, b));
const memberInChanges = (path, changes) => !isUndefined(changes.find(x => pathEquals(x.path, path)));
const pathEquals = (path, other) => path.join('') === other.join('');
const pathBeginsWith = (path, beginsWith) => path.length >= beginsWith.length && path.slice(0, beginsWith.length).join('') === beginsWith.join('');

const findPath = (path, x) => 0 === path.length ?
      x :
      isObject(x) ?
      findPath(path.slice(1), x[path[0]]) :
      error('Path not found.');

const onChange = (dependentPath, action) => ({
    requires: path => pathBeginsWith(path, dependentPath),
    then: compose(action, curry(findPath, dependentPath)),
});

const neverChange = (value, action) => ({
    requires: always(false),
    then: compose(action, always(value)),
});

const onChangeValues = (structure, action) => ({
    requires: path => any(curry(pathBeginsWith, path), Object.values(structure)),
    then: obj => action(mapObject(path => findPath(path, obj), structure)),
});

const setAttribute = name => value => node => node.setAttribute(name, isNumber(value) ? (value) : value);
const setText = () => value => node => set(node, 'textContent', value);
const setStyleAttribute = name => value => node => node.style.setProperty(name, value);

const removeDuplicates = a => a.reduce((l, x) => l.includes(x) ? l : [...l, x], []);

const applyDef = (val, def, node) => def.forEach(({then}) => then(val)(node));

const updateDef = (val, def, changes, node) => {
    const addArray = ({path}) => def.filter(x => x.requires(path));
    const ons = removeDuplicates(changes.reduce((ons, change) => ons.concat(addArray(change)), []));
    applyDef(val, ons, node);
};

const add = (parent, node) => parent.append(node);
const setAttributes = (node, attributes) => methodArgsFromObject(node, 'setAttribute', attributes);
const mouseFlow = ({start, move, stop = Void}) => {
    let x = null;
    return {
        start: e => {x = start(mousePoint(e));},
        move: e => {x = move(mousePoint(e), x);},
        stop: e => {stop(mousePoint(e), x);},
    };
};
const untilMouseUp = (event, actions) => willFollowMouseDown(
    mouseFlow(actions)
)(event);

const addEventLease = (node, event, listener) => {
    node.addEventListener(event, listener);
    return () => node.removeEventListener(event, listener);
};

const div = (className, children = []) => {
    const node = document.createElement('div');
    node.classList.add(className);
    children.forEach(curry(add, node));
    return node;
};

const moveChildren = (from, to) => Array.from(from.children).forEach(curry(add, to));

const svgElement = name => document.createElementNS('http://www.w3.org/2000/svg', name);
const buildSvg = (name, attributes, ...children) => compose(
    tap(node => children.forEach(child => add(node, child))),
    tap(node => setAttributes(node, attributes))
)(svgElement(name));

const createLock = () => {
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

const createStatus = status => {
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

const pointStringFromMark = ({polygon, pos}) => relativePointsAsString(polygon, pos);
const setPolygonPoints = polygonMark => node => node.setAttribute(
    'points',
    pointStringFromMark(polygonMark)
);

const labelDefinition = [
    onChange(['pos', 'x'], setAttribute('x')),
    onChange(['pos', 'y'], setAttribute('y')),
    onChange(['label'], setText()),
];

const definitionForAllShapes = [
    onChange(['color'], setStyleAttribute('--default-color')),
    onChange(['selectedColor'], setStyleAttribute('--selected-color')),
    neverChange('shape', setAttribute('class')),
];

const createLineLikeShape = lineHeight => {
    const offset = select => ({start, end}) => select(start, start + end);
    const vectorLength = point => Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2));

    const transform = ({start, end}) => {
        const half = Math.atan(end.y / end.x);
        const rad = end.x < 0 ? half - Math.PI : half;
        const pos = rotatePoint(subtractPoint(start, point(0, lineHeight / 2)), -rad);
        const rotate = `rotateZ(${rad}rad)`;
        const translate = `translate(${pos.x}px, ${pos.y}px)`;
        return `${rotate} ${translate}`;
    };

    return [
        ...definitionForAllShapes,
        onChangeValues({start: ['pos'], end: ['end']}, compose(setStyleAttribute('transform'), transform)),
        onChange(['end'], compose(setAttribute('width'), vectorLength)),
        neverChange(`0 ${lineHeight / 2}px`, setStyleAttribute('transform-origin')),
        neverChange(lineHeight, setAttribute('height')),
        neverChange(0, setAttribute('x')),
        neverChange(0, setAttribute('y')),
    ];
};

const shapeDefinition = {
    [SHAPES.RECTANGLE]: [
        ...definitionForAllShapes,
        onChange(['pos', 'x'], setAttribute('x')),
        onChange(['pos', 'y'], setAttribute('y')),
        onChange(['width'], setAttribute('width')),
        onChange(['height'], setAttribute('height')),
    ],
    [SHAPES.CIRCLE]: [
        ...definitionForAllShapes,
        onChange(['pos', 'x'], setAttribute('cx')),
        onChange(['pos', 'y'], setAttribute('cy')),
        neverChange(10, setAttribute('r'))
    ],
    [SHAPES.POLYGON]: [
        ...definitionForAllShapes,
        onChangeValues({
            pos: ['pos'],
            polygon: ['polygon'],
        }, setPolygonPoints),
    ],
    [SHAPES.LINE]: createLineLikeShape(1),
    [SHAPES.WAVE]: [
        ...createLineLikeShape(pattern.height),
        neverChange('shape wave', setAttribute('class'))
    ],
};

const createShape = val => {
    const node = svgElement(nodeNameOfShape(val.shape));
    applyDef(val, shapeDefinition[val.shape], node);
    return node;
};

const createLabel = val => {
    const node = svgElement('text');
    applyDef(val, labelDefinition, node);
    return node;
};

const updateExisting = (val, changes, group) => {
    updateDef(val, shapeDefinition[val.shape], changes, group.nodes.shape);
    updateDef(val, labelDefinition, changes, group.nodes.label);
};

const nodeNameOfShape = name => ({
    [SHAPES.RECTANGLE]: 'rect',
    [SHAPES.CIRCLE]: 'circle',
    [SHAPES.POLYGON]: 'polygon',
    [SHAPES.LINE]: 'rect',
    [SHAPES.WAVE]: 'rect',
})[name] || error(`Invalid shape name: ${name}.`);

const groupFromMark = mark => ({
    mark,
    nodes: {
        root: svgElement('g'),
        label: createLabel(mark),
        shape: createShape(mark),
    }
});

const defaultMarkValues = {
    [SHAPES.RECTANGLE]: {width: 5, height: 5},
    [SHAPES.CIRCLE]: {},
    [SHAPES.POLYGON]: {polygon: [point(0, 0)]},
    [SHAPES.LINE]: {end: point(0, 0)},
    [SHAPES.WAVE]: {end: point(0, 0)},
};

const createMarkAtPoint = (pos, shape, color, selectedColor) => createMark({
    ...defaultMarkValues[shape],
    shape,
    pos,
    color,
    selectedColor,
    label: '',
});

const loadImage = url => new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(size(image.width, image.height));
    image.onerror = reject;
    image.src = url;
});

const showImage = (root, rect, url) => loadImage(url).then(imageSize => {
    const size = fitInRect(imageSize, rect);
    setAttributes(root.nodes.backgroundImage, {
        href: url,
        x: 0,
        y: 0,
        ...imageSize,
    });
    root.canvas.size(imageSize);
    updateView(root);
});

const createStyle = () => tap(style => set(
    style,
    'innerHTML',
    '.hej {position: relative; width: 100%; height: 100%; overflow: auto;} ' +
    'svg .polygon-start:hover {stroke: blue;} ' +
    'svg {position: absolute;}' +
    'svg * {user-select: none;} ' +
    'svg .shape {fill: var(--default-color);}' +
    'svg .shape.wave {mask: url(#wave-mask);}' +
    'svg .foreground .shape {fill: var(--selected-color);}'
))(document.createElement('style'));

const createLayers = () => ({
    background: buildSvg('g', {'class': 'background'}),
    normal: svgElement('g'),
    foreground: buildSvg('g', {'class': 'foreground'}),
});

const assertShapeName = shape => assert(
    Object.values(SHAPES).includes(shape),
    `Invalid shape name: ${shape}.`
);

const assertValidScale = scale => {
    assert(isNumber(level), `Level must be a number, given: ${JSON.stringify(level)}.`);
    assert(level > 0, `Level must be > 0 given: ${level}.`);
};

const createRoot = (parent, createMark, selectMark) => {
    const layers = createLayers();
    const svg = buildSvg('svg', {width: '100%', height: '100%'}, ...Object.values(layers));
    const app = div('hej', [svg]);
    const backgroundImage = svgElement('image');
    add(parent, app);
    add(parent, createStyle());
    add(svg, buildSvg('defs', {}, wavePattern(), waveMask()));

    return {
        nodes: {
            app,
            svg,
            layers,
            backgroundImage,
        },
        creation: {
            color: ref('#0000AAAA'),
            selectedColor: ref('#FF0000AA'),
            shape: ref(SHAPES.WAVE, assertShapeName),
        },
        status: createStatus({name: 'idle'}),
        canvas: {
            scale: ref(1, assertValidScale),
            size: ref(null),
        },
        groups: {},
        emit: {createMark, selectMark},
    };
};

const moveGroup = (root, group, event) => acquireGroupStatus(root, 'moveGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        forceSelectSilently(root, group);
        return {
            mouse,
            pos: group.mark.pos,
        };
    },
    move: (mouse, old) => {
        const diff = subtractPoint(mouse, old.mouse);
        const newOne = {mouse, pos: addPoint(old.pos, diff)};
        updateMark(root, {...group.mark, pos: newOne.pos});
        return newOne;
    },
    stop: release,
}));

const acquireStatus = (root, newStatus, then) => root.status.acquire(newStatus, then);
const acquireGroupStatus = (root, name, group, proc) => acquireStatus(root, {name, group}, proc);

const addGroupInteractionsFor = (root, group, node) => {
    // node.addEventListener('mousedown', curry(moveGroup, root, group));
    node.addEventListener('click', () => selectGroup(root, group));
};

const attachGroup = (root, group) => {
    attachShape(root, group);
    attachLabel(root, group);
    add(root.nodes.layers.normal, group.nodes.root);
};

const attachLabel = (root, group) => {
    add(group.nodes.root, group.nodes.label);
    addGroupInteractionsFor(root, group, group.nodes.label);
};

const attachShape = (root, group) => {
    add(group.nodes.root, group.nodes.shape);
    addGroupInteractionsFor(root, group, group.nodes.shape);
};

const editLineLike = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        forceSelectSilently(root, group);
        mouse = globalToSvgPoint(root, mouse);
        return {mark: group.mark, start: {mouse, pos: group.mark.pos}};
    },
    move: (mouse, {mark: oldMark, start}) => {
        const diff = subtractPoint(globalToSvgPoint(root, mouse), start.mouse);
        const mark = {
            ...oldMark,
            end: diff,
        };
        updateMark(root, mark);
        return {start, mark};
    },
    stop: release,
}));

const editRectangle = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        forceSelectSilently(root, group);
        mouse = globalToSvgPoint(root, mouse);
        return {mark: group.mark, start: {mouse, pos: group.mark.pos}};
    },
    move: (mouse, {mark: oldMark, start}) => {
        const diff = subtractPoint(globalToSvgPoint(root, mouse), start.mouse);
        const {width, height, ...pos} = rectFromPoints(start.pos, addPoint(start.pos, diff));
        const mark = {
            ...oldMark,
            pos,
            width,
            height,
        };
        updateMark(root, mark);
        return {start, mark};
    },
    stop: release,
}));

const editCircle = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        mouse = globalToSvgPoint(root, mouse);
        forceSelectSilently(root, group);
        return {mark: group.mark, start: {pos: group.mark.pos, mouse}};
    },
    move: (mouse, {mark: oldMark, start}) => {
        const diff = subtractPoint(globalToSvgPoint(root, mouse), start.mouse);
        const mark = {
            ...oldMark,
            pos: addPoint(start.pos, diff),
        };
        updateMark(root, mark);
        return {start, mark};
    },
    stop: release,
}));

const createPolygonFrame = (parent, start, finish) => {
    const finishDot = buildSvg('circle', {
        cx: start.x,
        cy: start.y,
        r: 6,
        fill: 'lightblue',
        'class': 'polygon-start',
    });
    const path = buildSvg('polyline', {
        points: '',
        stroke: 'blue',
        'class': 'polygon-next-point',
        'stroke-width': '2px',
        fill: 'none',
    });
    const root = buildSvg('g', {'class': 'new-polygon'});
    add(root, path);
    add(root, finishDot);
    add(parent, root);

    finishDot.addEventListener('click', event => {
        event.stopPropagation();
        root.remove();
        finish();
    })

    return points => setAttributes(path, {
        points: relativePointsAsString(points, start)
    });
};

const wavePattern = () => {
    const bounds = point(pattern.width, pattern.height);
    const c = multiplyPoint(0.5, bounds);
    const q = multiplyPoint(0.5, c);
    // 'M -1 11 Q 12.5 -5, 25 10 T 51 9'
    return buildSvg('pattern', {
        x: '0',
        y: '0',
        id: 'wave-pattern',
        width: `${bounds.x}px`,
        height: `${bounds.y}px`,
        patternUnits: "userSpaceOnUse",
    }, buildSvg('path', {d: `M 0 ${c.y} Q ${q.x} -${q.y}, ${c.x} ${c.y} T ${bounds.x} ${c.y}`, fill: 'none', stroke: 'white'}))
};

const waveMask = () => buildSvg('mask', {
    id: 'wave-mask',
    x: 0,
    y: 0,
    width: '100%',
    height: '100%',
}, buildSvg('rect', {x: 0, y: 0, width: '100%', height: '100%', fill: 'url(#wave-pattern)'}));

const createPolygonMark = (root, polygon, pos) => createMark({
    label: '',
    polygon,
    pos,
    color: creationColor(root),
    shape: SHAPES.POLYGON,
});

const relativeClick = (root, relativeTo, proc) => event => proc(subtractPoint(
    globalToSvgPoint(root, mousePoint(event)),
    relativeTo
));

const newPolygon = (root, event) => acquireStatus(root, {name: 'newPolygon'}, release => {
    const start = globalToSvgPoint(root, mousePoint(event));
    const updatePath = createPolygonFrame(root.nodes.layers.foreground, start, () => finish());
    const polygon = [point(0, 0)];
    const relative = proc => relativeClick(root, start, proc);

    const toBeReleased = [
        release,
        addEventLease(window, 'mousemove', relative(
            point => updatePath([...polygon, point])
        )),
        addEventLease(root.nodes.svg, 'click', ignoreFirstCall(relative(
            point => polygon.push(point)
        ))),
    ];

    const finish = () => {
        toBeReleased.forEach(release => release());
        const mark = createPolygonMark(root, polygon, start);
        addMark(root, mark);
        selectMark(root, mark.key);
    };
});

const addInteractions = root => {
    root.nodes.svg.addEventListener('mousedown', event => {
        const isBackground = [root.nodes.svg, root.nodes.backgroundImage].includes(event.target);
        const isLeftClick = event.button === 0;
        isBackground && isLeftClick && drawNewGroup(root, event);
    });
};

const creationColor = root => root.creation.color();
const creationSelectedColor = root => root.creation.selectedColor();
const creationShape = root => root.creation.shape();

const createThenEdit = edit => (root, event) => acquireStatus(root, {name: 'drawNew'}, release => {
    const mark = createMarkAtPoint(globalToSvgPoint(root, mousePoint(event)), creationShape(root), creationColor(root), creationSelectedColor(root));
    release();
    addMarkSilently(root, mark);
    edit(root, root.groups[mark.key], event).then(() => {
        root.emit.createMark(root.groups[mark.key].mark);
        selectMark(root, mark.key);
    });
});

const drawNew = {
    [SHAPES.RECTANGLE]: createThenEdit(editRectangle),
    [SHAPES.CIRCLE]: createThenEdit(editCircle),
    [SHAPES.POLYGON]: newPolygon,
    [SHAPES.LINE]: createThenEdit(editLineLike),
    [SHAPES.WAVE]: createThenEdit(editLineLike),
};

const drawNewGroup = (root, event) => drawNew[creationShape(root)](root, event);

const forceSelectSilently = (root, group) => {
    moveChildren(root.nodes.layers.foreground, root.nodes.layers.normal);
    add(root.nodes.layers.foreground, group.nodes.root);
};

const selectGroup = (root, group) => acquireStatus(root, {name: 'selecting'}, release => {
    forceSelectSilently(root, group);
    root.emit.selectMark(group.mark);
    release();
});

const selectMark = (root, key) => selectGroup(root, root.groups[key]);

const addMarkSilently = (root, mark) => {
    assert(!root.groups[mark.key], `Duplicated key: ${mark.key}`);

    const group = groupFromMark(mark);
    attachGroup(root, group);
    root.groups[mark.key] = group;
};

const addMark = (root, mark) => {
    addMarkSilently(root, mark);
    root.emit.createMark(mark);
};

const updateMark = (root, mark) => {
    const group = root.groups[mark.key];
    const changes = pathDiff(group.mark, mark);
    group.mark = mark;
    if (memberInChanges(['shape'], changes)) {
        group.nodes.shape.remove();
        group.nodes.shape = createShape(group.mark);
        attachShape(root, group);
    } else {
        updateExisting(group.mark, changes, group);
    }
};

const updateView = root => setAttributes(root.nodes.svg, {
    ...pointAsSize(multiplyPoint(root.canvas.scale(), sizeAsPoint(root.canvas.size()))),
    'viewBox': [0, 0, root.canvas.size().width, root.canvas.size().height].join(' '),
});

const rootRect = root => root.nodes.app.getBoundingClientRect();
const globalToSvgPoint = (root, point) => multiplyPoint(
    1 / root.canvas.scale(),
    subtractPoint(point, root.nodes.svg.getBoundingClientRect())
);

/**
 * @typedef {{
 *     showPage: {function(string, Mark[]): void},
 *     addMark: {function(Mark): void},
 *     removeMark: {function(string): void},
 *     selectMark: {function(string): void},
 *     updateMark: {function(Mark): void},
 *     setDefaultColor: {function(string): void},
 *     setDefaultShape: {function(string): void},
 *     setZoomLevel: {function(number): void},
 * }} ImageMarker
 *
 * @param {HTMLElement} parent
 * @param {function(Mark): any} onCreation
 * @param {function(Mark): any} onSelection
 * @return ImageMarker
 */
export default (parent, onCreation, onSelection) => {
    const root = createRoot(
        parent,
        compose(onCreation, createMark),
        compose(onSelection, createMark)
    );
    addInteractions(root);

    const addMarkToCurrentRoot = mark => addMark(root, createMark(mark));
    const removeMark = key => {
        root.groups[key].nodes.root.remove();
        remove(root.groups, key);
    };

    return {
        showPage: (url, marks) => {
            showImage(root, rootRect(root), url);
            add(root.nodes.layers.background, root.nodes.backgroundImage);
            root.canvas.scale(1);
            Object.values(root.groups).forEach(group => removeMark(group.mark.key));
            marks.forEach(addMarkToCurrentRoot);
        },
        addMark: addMarkToCurrentRoot,
        removeMark,
        selectMark: key => selectMark(root, key),
        updateMark: mark => updateMark(root, createMark(mark)),
        setDefaultColor: color => root.creation.color(color),
        setDefaultShape: shape => root.creation.shape(shape),
        setZoomLevel: level => {
            root.canvas.scale(level);
            updateView(root);
        },
    };
};
