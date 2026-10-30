# vee-first

Wait for the first of several EventEmitter events, remove the competing
listeners, and invoke a callback once. Zero runtime dependencies.

`vee-first` is VPM's modernized counterpart to `ee-first` 1.1.1. It keeps the
callback API, deferred listener assignment, and `.cancel()` handle. It supports
Node.js 24+ and Bun; browser use requires an EventEmitter-compatible object.

## Use

```js
const { EventEmitter } = require('node:events');
const first = require('vee-first');

const response = new EventEmitter();
const socket = new EventEmitter();

const pending = first([
  [response, 'finish'],
  [socket, 'close', 'error'],
], (error, emitter, event, args) => {
  console.log('First event:', event, args);
});

response.emit('finish');
// The callback runs once; all listeners installed by this call are removed.

pending.cancel(); // Also safe after completion or repeated cancellation.
```

ES modules can use `import first from 'vee-first'`.

## API

### `first(sources, listener?)`

`sources` is an array of `[emitter, ...eventNames]` tuples. An emitter provides
`on()` and `removeListener()`; event names are strings or symbols.

The callback receives `(error, emitter, event, args)`. `error` is the first payload
from an event named `'error'`, or `null` for other events. `args` contains all
emitted arguments. Error payloads are passed through unchanged, including values
that are not `Error` objects.

All listeners installed by this call are removed before the callback runs. Existing
listeners owned by other code are left in place. Exceptions thrown by your callback
propagate to the emitter's caller.

The returned handle is callable: `handle(listener)` sets or replaces the callback.
This supports the deferred assignment style of `ee-first`. Set a callback before an
event is emitted; an event arriving without one throws after listener cleanup.
An empty `sources` array returns an inert, cancellable handle.

### `handle.cancel()`

Detach the listeners installed by this call without invoking the callback.
Cancellation is idempotent and does not reattach listeners. After completion or
cancellation, assigning another callback does not restart the group.

## Improvements and compatibility

- Ships TypeScript declarations with no type-package dependency for consumers.
- Uses modern JavaScript and rest parameters.
- Guards against a second invocation when duplicate listeners are already in an
  emitter's dispatch snapshot, including reentrant event emission during cleanup.
- Handles an event winning during a `newListener` hook without leaving a late
  subscription behind.
- Validates the complete source list before registration and rolls back listeners
  when registration throws.

Valid `ee-first` callback, thunk, and cancellation usage is preserved. Invalid
emitters, event names, and callbacks now receive explicit `TypeError`s. Inputs are
snapshotted before registration. It does not attempt to support the historical
Node.js versions targeted by the original package.

## Install from this repository

From a checkout of VPM, create a standard package archive:

```sh
cd packages/vee-first
bun pm pack
```

In a consuming project, install the generated archive:

```sh
bun add /absolute/path/to/vpm/packages/vee-first/vee-first-0.1.0.tgz
```

The initial commit does not publish a package to npm or a VPM registry.

## Origin and license

Derived from [`ee-first` 1.1.1](https://github.com/jonathanong/ee-first/tree/512e0ce4cc3643f603708f965a97b61b1a9c0441),
by Jonathan Ong, with contributions by Douglas Christopher Wilson.
MIT licensed; the upstream copyright and license are preserved in [LICENSE](LICENSE).
