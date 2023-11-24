import createMark, { SHAPES } from './Mark';
import { compose, fitInRect, mousePoint, subtractPoint, addPoint, set, remove, tap, error, point, rectFromPoints, relativePointsAsString, ref, pointAsSize, sizeAsPoint, multiplyPoint, isNumber, size, assert, rotatePoint, define, createGeneric, callAll, onChange, setStyleAttribute, neverChange, setAttribute, buildSvg, buildNode, add, createStatus, addEvent, onlyWhen, loadImage, setAttributes, applyDef, updateDef, setText, onChangeValues, moveChildren, willFollowMouseDown, mouseFlow, pathDiff, memberInChanges, isNull, unless, identity } from './utils';

const WAVE_PATTERN = {
    lambda: 60,
    amplitude: 20,
    lineWidth: 10,
};

const POLYGON_FRAME = {
    startDot: {radius: 20, borderWidth: 10},
    lineWidth: 10,
};

const LINE = {
    width: 15,
};

const pointStringFromMark = ({polygon, pos}) => relativePointsAsString(polygon, pos);
const setPolygonPoints = polygonMark => node => node.setAttribute(
    'points',
    pointStringFromMark(polygonMark)
);

const definitionForAllShapes = [
    onChange(['color'], setStyleAttribute('--default-color')),
    onChange(['selectedColor'], setStyleAttribute('--selected-color')),
    onChange(['locked'], l => setAttribute('class')('shape' + (l ? ' locked' : ''))),
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

const definitionFor = createGeneric(val => val.shape || val);

define(definitionFor, SHAPES.RECTANGLE, () => [
    ...definitionForAllShapes,
    onChange(['pos', 'x'], setAttribute('x')),
    onChange(['pos', 'y'], setAttribute('y')),
    onChange(['width'], setAttribute('width')),
    onChange(['height'], setAttribute('height')),
]);

define(definitionFor, SHAPES.CIRCLE, () => [
    ...definitionForAllShapes,
    onChange(['pos', 'x'], child(0, setAttribute('cx'))),
    onChange(['pos', 'y'], child(0, setAttribute('cy'))),
    onChange(['pos', 'x'], child(1, setAttribute('x'))),
    onChange(['pos', 'y'], child(1, setAttribute('y'))),
    onChange(['symbol'], child(1, setText())),
    onChange(['symbolColor'], child(1, setStyleAttribute('fill'))),
    neverChange('symbol', child(1, setAttribute('class'))),
    neverChange(100, child(0, setAttribute('r'))),
]);

define(definitionFor, SHAPES.POLYGON, () => [
    ...definitionForAllShapes,
    onChangeValues({
        pos: ['pos'],
        polygon: ['polygon'],
    }, setPolygonPoints),
]);

define(definitionFor, SHAPES.LINE, () => createLineLikeShape(LINE.width));

define(definitionFor, SHAPES.WAVE, () => [
    ...createLineLikeShape(WAVE_PATTERN.amplitude * 2),
    neverChange('shape wave', setAttribute('class')),
    onChange(['locked'], l => setAttribute('class')('shape wave' + (l ? ' locked' : ''))), 
]);

const child = (nr, proc) => v => node => proc(v)(node.children[nr]);

define(definitionFor, 'label', () => [
    onChange(['pos', 'x'], child(0, setAttribute('x'))),
    onChange(['pos', 'x'], child(1, setAttribute('x'))),
    //onChange(['pos', 'y'], child(1, setAttribute('y'))),
    neverChange('label', child(0, setAttribute('class'))),
    neverChange('label', child(1, setAttribute('class'))),
    onChangeValues({shape: ['shape'], label: ['label'], y: ['pos', 'y']}, ({shape, label, y}) => node => {
        if (shape == SHAPES.CIRCLE) {
            y = y - 100;
        }
        setAttributes(node.children[1], {y});
        setText()(label)(node.children[1]);
        requestAnimationFrame(() => {
            const {width, height} = node.children[1].getBBox();
            setAttributes(node.children[0], {y: y - height + (height * 0.15), width, height});

        });
    }),
]);

const buildShape = createGeneric(identity);

define(buildShape, SHAPES.RECTANGLE, () => buildSvg('rect'));
define(buildShape, SHAPES.CIRCLE, () => buildSvg('g', {}, buildSvg('circle'), buildSvg('text')));
define(buildShape, SHAPES.POLYGON, () => buildSvg('polygon'));
define(buildShape, SHAPES.LINE, () => buildSvg('rect'));
define(buildShape, SHAPES.WAVE, () => buildSvg('rect'));
define(buildShape, name => error(`Invalid shape name: ${name}.`));

const createShape = val => {
    const node = buildShape(val.shape);
    applyDef(val, definitionFor(val), node);
    return node;
};

const createLabel = val => {
    const node = buildSvg('g', {}, buildSvg('rect'), buildSvg('text'));
    applyDef(val, definitionFor('label'), node);
    return node;
};

const updateExisting = (val, changes, group) => {
    updateDef(val, definitionFor(val), changes, group.nodes.shape);
    updateDef(val, definitionFor('label'), changes, group.nodes.label);
};

const groupFromMark = mark => ({
    mark,
    nodes: {
        root: buildSvg('g'),
        label: createLabel(mark),
        shape: createShape(mark),
    }
});

const defaultMarkValues = {
    [SHAPES.RECTANGLE]: {width: 10, height: 20},
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

const untilMouseUp = (root, event, actions, button = 'primary') => willFollowMouseDown(root.nodes.svg, mouseFlow(actions), button, event);

const showImage = (root, url) => loadImage(url).then(imageSize => {
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
    [
        ' {position: relative; width: 100%; height: 100%; overflow: auto;}',
        '.moving {overflow: hidden;}',
        ' svg .polygon-start:hover {stroke: blue;}',
        ' svg {position: absolute;}',
        ' svg * {user-select: none;}',
        ' svg .shape {fill: var(--default-color);}',
        ' svg .shape.wave {mask: url(#wave-mask);}',
        ' svg rect.label {fill: lightblue;}',
        ' svg .foreground .shape {fill: var(--selected-color);}',
        ' svg .shape text.symbol {text-anchor: middle; dominant-baseline: central; fill: black;}',
    ].map(s => '.long-essay-image-marker' + s).join(' ')
))(document.createElement('style'));

const createLayers = () => ({
    background: buildSvg('g', {'class': 'background'}),
    normal: buildSvg('g'),
    foreground: buildSvg('g', {'class': 'foreground'}),
});

const assertShapeName = shape => assert(
    Object.values(SHAPES).includes(shape),
    `Invalid shape name: ${shape}.`
);

const assertValidScale = scale => {
    assert(isNumber(scale), `Scale must be a number, given: ${JSON.stringify(scale)}.`);
    assert(scale > 0, `Scale must be > 0 given: ${scale}.`);
};

const createRoot = (parent, createMark, selectMark) => {
    const layers = createLayers();
    const svg = buildSvg('svg', {width: '100%', height: '100%'}, ...Object.values(layers));
    const app = buildNode('div', {'class': 'long-essay-image-marker'}, svg);
    const backgroundImage = buildSvg('image');
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
            shape: ref(SHAPES.CIRCLE, assertShapeName),
        },
        status: createStatus({name: 'idle'}),
        canvas: {
            scale: ref(1, assertValidScale),
            size: ref(null),
        },
        mode: ref('draw-shape', x => assert(['draw-shape', 'scroll'].includes(x), `Invalid marker mode: ${x}`)),
        groups: {},
        emit: {createMark, selectMark},
    };
};

const acquireStatus = (root, newStatus, then) => root.status.acquire(newStatus, then);
const acquireGroupStatus = (root, name, group, proc) => acquireStatus(root, {name, group}, proc);

const addGroupInteractionsFor = (root, group, node) => {
    addEvent(node, 'mousedown', e => (group.mark.locked ? Promise.resolve() : moveGroup(root, group, e)).then(() => selectGroup(root, group)));
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

const createThenEdit = edit => (root, event) => acquireStatus(root, {name: 'drawNew'}, release => {
    const mark = createMarkAtPoint(globalToSvgPoint(root, mousePoint(event)), creationShape(root), creationColor(root), creationSelectedColor(root));
    root.emit.selectMark(null);
    release();
    addMarkSilently(root, mark);
    edit(root, root.groups[mark.key], event).then(() => {
        root.emit.createMark(root.groups[mark.key].mark);
        selectMark(root, mark.key);
    });
});

const rootMode = createGeneric(root => root.mode());
const mouseDown = createGeneric(rootMode);

const editLineLike = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(root, event, {
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
define(mouseDown, ['draw-shape', SHAPES.LINE], createThenEdit(editLineLike));
define(mouseDown, ['draw-shape', SHAPES.WAVE], createThenEdit(editLineLike));

const editRectangle = (root, group, event) => acquireGroupStatus(root, 'editGroup', group, release => untilMouseUp(root, event, {
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

define(mouseDown, ['draw-shape', SHAPES.RECTANGLE], createThenEdit(editRectangle));

const moveGroup = (root, group, event) => acquireGroupStatus(root, 'moveGroup', group, release => untilMouseUp(root, event, {
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

define(mouseDown, ['draw-shape', SHAPES.CIRCLE], createThenEdit(moveGroup));

const createPolygonFrame = (parent, start, finish) => {
    const finishDot = buildSvg('circle', {
        cx: start.x,
        cy: start.y,
        r: POLYGON_FRAME.startDot.radius + 'px',
        'stroke-width': POLYGON_FRAME.startDot.borderWidth + 'px',
        fill: 'lightblue',
        'class': 'polygon-start',
    });
    const path = buildSvg('polyline', {
        points: '',
        stroke: 'blue',
        'class': 'polygon-next-point',
        'stroke-width': POLYGON_FRAME.lineWidth + 'px',
        fill: 'none',
    });
    const root = buildSvg('g', {'class': 'new-polygon'});
    add(root, path);
    add(root, finishDot);
    add(parent, root);

    addEvent(finishDot, 'click', event => {
        event.stopPropagation();
        root.remove();
        finish();
    });

    return points => setAttributes(path, {
        points: relativePointsAsString(points, start)
    });
};

const wavePattern = () => {
    const bounds = point(WAVE_PATTERN.lambda, WAVE_PATTERN.amplitude * 2);
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
    }, buildSvg('path', {
        d: `M -${c.x} ${c.y} Q -${q.x} -${q.y}, 0 ${c.y} t ${c.x} 0 t ${c.x} 0`,
        fill: 'none',
        stroke: 'white',
        'stroke-width': WAVE_PATTERN.lineWidth + 'px',
    }));
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
    selectedColor: creationSelectedColor(root),
    shape: SHAPES.POLYGON,
});

const relativeClick = (root, relativeTo, proc) => event => {
    event.preventDefault();
    proc(subtractPoint(
        globalToSvgPoint(root, mousePoint(event)),
        relativeTo
    ));
};

define(mouseDown, ['draw-shape', SHAPES.POLYGON], (root, event) => acquireStatus(root, {name: 'newPolygon'}, release => {
    event.preventDefault();
    root.emit.selectMark(null);
    const start = globalToSvgPoint(root, mousePoint(event));
    const updatePath = createPolygonFrame(root.nodes.layers.foreground, start, () => finish());
    const polygon = [point(0, 0)];
    const relative = proc => relativeClick(root, start, proc);
    let lastPoint = point(0, 0);

    const toBeReleased = [
        release,
        addEvent(root.nodes.svg, 'mousemove', relative(point => {
            updatePath([...polygon, point]);
            lastPoint = point;
        })),
        addEvent(window, 'mouseup', (
            _ => polygon.push(lastPoint)
        ))
    ];

    const finish = () => {
        callAll(toBeReleased);
        const mark = createPolygonMark(root, polygon, start);
        addMark(root, mark);
        selectMark(root, mark.key);
    };
}));

const addInteractions = root => {
    const isNotBackground = event => [root.nodes.svg, root.nodes.backgroundImage].includes(event.target);

    addEvent(root.nodes.svg, 'mousedown', onlyWhen(isNotBackground, e => mouseDown(root, e)));
    addEvent(root.nodes.svg, ['mousedown', 'secondary'], onlyWhen(isNotBackground, e => moveView(root, e, 'secondary')));
};

const creationColor = root => root.creation.color();
const creationSelectedColor = root => root.creation.selectedColor();
const creationShape = root => root.creation.shape();

define(rootMode, 'draw-shape', root => [root.mode(), root.creation.shape()]);
define(rootMode, root => root.mode());

const moveView = (root, event, button = 'primary') => acquireStatus(root, {name: 'moving-view'}, release => {
    root.nodes.app.classList.add('moving');
    untilMouseUp(root, event, {
        start: mouse => mouse,
        move: (mouse, prev) => {
            const diff = subtractPoint(prev, mouse);
            root.nodes.app.scrollBy(diff.x, diff.y);
            return mouse;
        },
        stop: () => {
            root.nodes.app.classList.remove('moving');
            release();
        },
    }, button);
});

define(mouseDown, 'scroll', moveView);

const forceSelectSilently = (root, group) => {
    const foreground = [].slice.call(root.nodes.layers.foreground.children)
          .forEach(node => node.classList.remove('active'));
    moveChildren(root.nodes.layers.foreground, root.nodes.layers.normal);
    group.nodes.root.classList.add('active');
    add(root.nodes.layers.foreground, group.nodes.root);
};

const selectGroup = (root, group) => acquireStatus(root, {name: 'selecting'}, release => {
    forceSelectSilently(root, group);
    root.emit.selectMark(group.mark);
    release();
});

const selectMark = (root, key) => selectGroup(root, root.groups[key] || error(`Mark with key ${key} does not exist.`));

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
    assert(root.groups[mark.key], `Mark with key ${mark.key} does not exist.`);
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
       setDefaultSelectedColor: {function(string): void},
 *     setDefaultShape: {function(string): void},
 *     setZoomLevel: {function(number): void},
 *     fitToPage: {function(): void},
 *     drawMode: {function(): void},
 *     scrollMode: {function(): void},
 * }} ImageMarker
 *
 * @param {HTMLElement} parent
 * @param {function(Mark): any} onCreation
 * @param {function(?Mark): any} onSelection
 * @return ImageMarker
 */
export default (parent, onCreation, onSelection) => {
    const root = createRoot(
        parent,
        compose(onCreation, createMark),
        compose(onSelection, unless(isNull, createMark))
    );
    addInteractions(root);

    const addMarkToCurrentRoot = mark => addMark(root, createMark(mark));
    const removeMark = key => {
        root.groups[key].nodes.root.remove();
        remove(root.groups, key);
    };

    const setZoomLevel = level => {
        root.canvas.scale(level);
        updateView(root);
    };

    return {
        showPage: (url, marks) => {
            showImage(root, url);
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
        setDefaultSelectedColor: shape => root.creation.selectedColor(shape),
        setDefaultShape: shape => root.creation.shape(shape),
        setZoomLevel,
        fitToPage: () => {
            if(root.canvas.size()) {
                const size = fitInRect(root.canvas.size(), root.nodes.app.getBoundingClientRect());
                setZoomLevel(size.width / root.canvas.size().width);
            }
        },
        drawMode: () => root.mode('draw-shape'),
        scrollMode: () => root.mode('scroll'),
    };
};
