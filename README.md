# Long Essay Image Marker

## Documentation

The following concepts are used throughout the image marker, which are described in more detail below:
- createGeneric: Multimethods for polymorphism
- updateDef: Mapping of value changes to DOM element updates
- createStatus: Locking & process management over multiple events

### createGeneric

This is a simple implementation of Clojure's multimethods. See https://clojure.org/reference/multimethods for a detailed description.

This function is used for polymorphism. This can be seen as an extendable pattern matching or switch statement.

`const foo createGeneric(...);` function creates a new function which provides the frame for the switch statement.

To add a new case to such a function we can call `define(foo, 'bar', () => 'baz');`.

To add a default case to the function we can use `define(foo, () => 'default case')`.

The twist of this function is how the arguments are converted to the switch argument.
For this the initial function given to `createGeneric` is relevant.
This functions sole purpose is to return from all the given arguments, the values which should be used to match all the cases upon.

So the following example would be very similar to an actual switch statement.
```js
const foo = createGeneric(x => x);

define(foo, 'case1', () => 'a');
define(foo, 'case2', () => 'b');
define(foo, 'case3', () => 'c');
define(foo, 'case4', () => 'd');
define(foo, value => 'default case: ' + value);

foo('case2'); // => 'b'
foo('dummy'); // => 'default case: dummy'
```

But because one can select which value the cases should be matched upon we can also match on values derived from the arguments:
```js
const foo = createGeneric((x, overwrite) => overwrite || x.name);

define(foo, 'rect', x => x.width);
define(foo, 'circle', x => x.radius);
define(foo, 'hexagon', x => x.edges);

foo({name: 'circle', radius: 4}); // => 4
foo({name: 'something other', edges: 9}, 'hexagon'); // => 9

```

To additionally be able to match against arrays and objects too, the cases are stringified automatically:
```js
const foo = createGeneric(x => x.foo);

define(foo, {name: 'bar'}, x => 'Name is ' + x.foo.name);
define(foo, ['bar', 'baz'], x => 'Foos elements are: ' + x.foo.join(', '));

foo({foo: {name: 'bar'}}); // => 'Name is bar'
foo({foo: ['bar', 'baz']}); // => 'Foos elements are bar, baz'
```

Please see `createGeneric` in [/utils.js](/utils.js) for more information.

The function `addEvent` uses this `createGeneric` extensively to map mouse events to touch events and to add mouse events for primary and secondary buttons.

### updateDef & applyDef

These functions synchronize a given value (in this repository only `Mark`s are used as a value) with a DOM element.

The rules on how the DOM node must be changed are specified with a list of `Definition`s.
Each definition contains a requirement, which points so specific parts of the provided value and an action which manipulates a concrete DOM element:

```js
{
    requires: function(string[]): boolean,
    then: Action<A>
}
```

and action is a curried function which accepts the updated value and a DOM element:

```js
function(A): function(Element): void
```

`applyDef` always runs all definitions, ignoring the requirements of a definition.
This function is used when creating a node as everything needs to be updated.

`updateDef` only runs the definitions where it's requirements have changed.
To achieve this, the function receives a `ChangeSet`, which contains all changes made to a given `val` argument.
Only definitions that require a path in the `ChangeSet` (where `def.requires(...)` returns true) are executed.
This is used to update only the necessary parts of the corresponding DOM element.

To calculate a change set between two objects the function `pathDiff(obj1, obj2)` is used.
This function returns a `ChangeSet` containing all paths that are different in argument 1 to argument 2, in the form: `{path: string[], value: <value of obj2>}`.

#### Creating definitions

To create definitions the following functions are provided.
All these functions ensure that only the values that the defintion requires, are passed to the action:

##### onChange

```js
onChange(['foo', 'bar'], x => node => node.setAttribute('class', x));
```

This function will be called when the path to it's first argument changed.
In the above example this would be `value.foo.bar`.

The changed value (`value.foo.bar`) will be given to the provided action argument (not the whole value).

##### onChangeValues

```js
onChangeValues({foo: ['x', 'y'], bar: ['a']}, ({foo, bar}) => node => node.setAttribute(foo, bar));
```

Similar to `onChange` but one can select multiple paths instead of one, on which this action is dependent on.
When any of the dependent paths changed, the action is called.
The given action will be called with all the dependent values, in the same object form as the dependent paths are given (`{a: ['x']}` will be given as `{a: <new value>}`).

##### neverChange

```js
neverChange('foo', x => node => node.setAttribute('class', x)); // x will always be 'foo'.
```

This function defines an action which has no values it depends upon.
This is called only when a node is created and not again.

The first argument is the value with which the provided action will be called.

#### Actions

Actions are given to definitions and contain the actual change which is applied to a DOM element.

Predefined actions are:

- setAttribute: node.setAttribute as an action.
- setText: node.textContent = <value> as an action.
- setStyleAttribute: node.style.setProperty as an action

All actions can be passed to definitions like this:

```js
onChange(['foo'], setAttribute('class'));
onChange(['foo'], setText());
onChange(['foo'], setStyleAttribute('margin-right'));
```

### createStatus

To coordinate an ongoing process, which spans over multiple events, the function `createStatus` is used, so that other operations can be blocked while a process is running. E.g. when a user is drawing a polygon a click should not draw another polygon (start a new process).

To manage this the function `createStatus` (as well as `acquireStatus` and `acquireGroupStatus`) is used.
This function provides a way of locking the image marker into a specific status / process.
A status can only be acquired when no other process is in progress.
If the lock could be acquired, the provided function is called.
If it could not, the provided function is simply ignored.
To release a lock, the given release function must be called.

```js
const lock = createStatus('No status');
lock.current(); // => 'No status'

lock.acquire('New status name', release => {
    console.log('Called when status could be acquired');
    lock.current(); // => 'New status name'
    const releaseMe = [
        addEvent(window, 'click', () => callAll(releaseMe)),
        release,
    ];
});

lock.current(); // => 'New status name'

lock.acquire('Will never be the status', () => {
    console.assert(false, 'Will never be called');
});

window.dispatchEvent(new Event('click'));
lock.current(); // => 'No status'
```

The status name is just be able to tell which process currently contains the lock, it is currently not used anywhere.
