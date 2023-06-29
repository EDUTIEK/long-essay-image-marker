import createMark, { SHAPES } from './Mark';
import { isUndefined, compose, fitInRect, willFollowMouseDown, mousePoint, subtractPoint, addPoint, diff, set, remove, curry, methodArgsFromObject, tap, isObject, error, Void, only, point, rectFromPoints, any, always, isArray, pointInRect, relativePointsAsString, ignoreFirstCall, ref, mapObject } from './utils';

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
    then: compose(action, curry(only, Object.keys(structure))),
});

const setAttribute = name => value => node => node.setAttribute(name, value);
const setText = () => value => node => set(node, 'textContent', value);

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
            return false;
        }
        const newLock = () => {
            if (locked === newLock) {
                locked = null;
                return true;
            }
            return false;
        };
        locked = newLock;
        then(newLock);
        return true;
    };
};

const createStatus = status => {
    const lock = createLock();

    return {
        current: () => status,
        acquire: (newStatus, then) => {
            lock(release => {
                const oldStatus = status;
                status = newStatus;
                then(() => {
                    if (release()) {
                        status = oldStatus;
                    }
                });
            });
        }
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
    onChange(['color'], setAttribute('fill')),
    neverChange('shape', setAttribute('class')),
];

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
    ]
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
};

const createMarkAtPoint = (pos, shape, color) => createMark({
    ...defaultMarkValues[shape],
    shape,
    pos,
    color,
    label: '',
});

const loadImage = url => new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
});

const showImage = (img, rect, url) => loadImage(url).then(imageSize => {
    const size = fitInRect(imageSize, rect);
    setAttributes(img, {
        href: url,
        x: 0,
        y: 0,
        ...size,
    });
});

const createStyle = () => tap(style => set(
    style,
    'innerHTML',
    '.hej {position: relative; width: 100%; height: 100%;} ' +
    'svg .polygon-start:hover {stroke: blue;} ' +
    'svg * {user-select: none;} ' +
    'svg .foreground .shape {fill: rgba(255, 0, 0, 0.5);}'
))(document.createElement('style'));

const createLayers = () => ({
    background: buildSvg('g', {'class': 'background'}),
    normal: svgElement('g'),
    foreground: buildSvg('g', {'class': 'foreground'}),
});

const createRoot = (parent, createMark, selectMark) => {
    const layers = createLayers();
    const svg = buildSvg('svg', {width: '100%', height: '100%'}, ...Object.values(layers));
    const app = div('hej', [svg]);
    const backgroundImage = svgElement('image');
    add(parent, app);
    add(parent, createStyle());

    return {
        nodes: {
            app,
            svg,
            layers,
            backgroundImage,
        },
        creation: {
            color: ref('#0000AAAA'),
            shape: ref(SHAPES.RECTANGLE),
        },
        status: createStatus({name: 'idle'}),
        groups: {},
        emit: {createMark, selectMark},
    };
};

const moveGroup = (root, group, event) => acquireGroupStatus(root, 'moveGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        forceSelect(root, group);
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

const editRectangle = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        forceSelect(root, group);
        return {mark: group.mark, start: {mouse, shape: group.mark.pos}};
    },
    move: (mouse, {mark: oldMark, start}) => {
        const diff = subtractPoint(mouse, start.mouse);
        const {width, height, ...pos} = rectFromPoints(start.shape, addPoint(start.shape, diff));
        const mark = {
            ...oldMark,
            width,
            height,
            pos,
        };
        updateMark(root, mark);
        return {start, mark};
    },
    stop: release,
}));

const editCircle = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(event, {
    start: mouse => {
        const pos = subtractPoint(mouse, rootRect(root));
        forceSelect(root, group);
        return {mark: group.mark, start: {shape: group.mark.pos, mouse}};
    },
    move: (mouse, {mark: oldMark, start}) => {
        const diff = subtractPoint(mouse, start.mouse);
        const mark = {
            ...oldMark,
            pos: addPoint(start.shape, diff),
        };
        updateMark(root, mark);
        return {start, mark};
    },
    stop: release,
}));

const createPolygonFrame = (parent, relativeStart) => {
    const finishDot = buildSvg('circle', {
        cx: relativeStart.x,
        cy: relativeStart.y,
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

    return {
        remove: () => root.remove(),
        setPath: points => setAttributes(path, {
            points: relativePointsAsString(points, relativeStart)
        })
    };
};

const polygonMouseMove = (frame, absoluteStart, polygon) => event => {
    const mouse = mousePoint(event);
    frame.setPath([...polygon(), subtractPoint(mouse, absoluteStart)]);
};

const addPolygonPoint = (absoluteStart, pushPoint, finish) => event => {
    const rect = rectFromPoints(
        addPoint(absoluteStart, point(-5, -5)),
        addPoint(absoluteStart, point(5, 5))
    );
    const mouse = mousePoint(event);
    if (pointInRect(mouse, rect)) {
        finish();
        return;
    }
    pushPoint(subtractPoint(mouse, absoluteStart));
};

const createPolygonMark = (root, polygon, pos) => createMark({
    label: '',
    polygon,
    pos,
    color: creationColor(root),
    shape: SHAPES.POLYGON,
});

const newPolygon = (root, event) => acquireStatus(root, {name: 'newPolygon'}, release => {
    const absoluteStart = mousePoint(event);
    const offset = rootRect(root);
    const frame = createPolygonFrame(root.nodes.layers.foreground, subtractPoint(absoluteStart, offset));
    const polygon = [point(0, 0)];

    const toBeReleased = [
        release,
        frame.remove,
        addEventLease(window, 'mousemove', polygonMouseMove(frame, absoluteStart, () => polygon)),
        addEventLease(root.nodes.svg, 'click', ignoreFirstCall(
            addPolygonPoint(absoluteStart, polygon.push.bind(polygon), () => finish())
        )),
    ];

    const finish = () => {
        toBeReleased.forEach(release => release());
        const mark = createPolygonMark(root, polygon, subtractPoint(absoluteStart, offset));
        addMark(root, mark);
        selectMark(root, mark.key);
    };
});

const addInteractions = root => {
    root.nodes.svg.addEventListener('mousedown', event => {
        [root.nodes.svg, root.nodes.backgroundImage].includes(event.target) && drawNewGroup(root, event);
    });
};

const creationColor = root => root.creation.color();
const creationShape = root => root.creation.shape();

const createThenEdit = edit => (root, event) => acquireStatus(root, {name: 'drawNew'}, release => {
    const mark = createMarkAtPoint(subtractPoint(mousePoint(event), rootRect(root)), creationShape(root), creationColor(root));
    addMark(root, mark);
    release();
    edit(root, root.groups[mark.key], event);
});

const drawNew = {
    [SHAPES.RECTANGLE]: createThenEdit(editRectangle),
    [SHAPES.CIRCLE]: createThenEdit(editCircle),
    [SHAPES.POLYGON]: newPolygon,
};

const drawNewGroup = (root, event) => drawNew[creationShape(root)](root, event);

const forceSelect = (root, group) => {
    moveChildren(root.nodes.layers.foreground, root.nodes.layers.normal);
    add(root.nodes.layers.foreground, group.nodes.root);
    root.emit.selectMark(group.mark);
};

const selectGroup = (root, group) => acquireStatus(root, {name: 'selecting'}, release => {
    forceSelect(root, group);
    release();
});

const selectMark = (root, key) => selectGroup(root, root.groups[key]);

const addMark = (root, mark) => {
    root.groups[mark.key] && error(`Duplicated key: ${mark.key}`);

    const group = groupFromMark(mark);
    attachGroup(root, group);
    root.groups[mark.key] = group;
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

const rootRect = root => root.nodes.app.getBoundingClientRect();

/**
 * @typedef {{
 *     showPage: {function(string, Mark[]): void},
 *     addMark: {function(Mark): void},
 *     removeMark: {function(string): void},
 *     selectMark: {function(string): void},
 *     updateMark: {function(Mark): void},
 *     setDefaultColor: {function(string): void},
 *     setDefaultShape : {function(string): void},
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

    return {
        showPage: (url, marks) => {
            showImage(root.nodes.backgroundImage, rootRect(root), url);
            add(root.nodes.layers.background, root.nodes.backgroundImage);
            marks.forEach(addMark);
        },
        addMark: mark => addMark(root, createMark(mark)),
        removeMark: key => {
            root.groups[key].nodes.root.remove();
            remove(root.groups, key);
        },
        selectMark: key => selectMark(root, key),
        updateMark: mark => updateMark(root, createMark(mark)),
        setDefaultColor: color => root.creation.color(color),
        setDefaultShape: shape => {
            Object.keys(SHAPES).includes(shape) || error(`Invalid shape name: ${shape}.`);
            root.creation.shape(shape);
        },
    };
};
