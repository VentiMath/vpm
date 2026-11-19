# veventemitter3

Independent implementation of the EventEmitter3 **5.0.4** library API, with no
runtime dependencies. Supports Node 24, Bun 1.4.4 and modern browsers.

```js
import EventEmitter from 'veventemitter3';
const events = new EventEmitter();
events.on('change', id => console.log(id));
events.emit('change', 'contest');
```

Supports string/symbol event names, ordered synchronous callbacks, custom context,
once, on/addListener, off/removeListener, filtered removal, listener snapshots,
event names/counts and function-constructor inheritance. Typed event maps accept
argument tuples or callback signatures. CJS and ESM share the same constructor.
Like upstream, an unhandled `error` is an ordinary event, removing a callback
removes every matching registration, and a falsy context defaults to the emitter.
There are no Node-style listener limits or newListener/removeListener signals.

A dispatch retains its original array and length. Subscribing or removing during
a callback affects subsequent dispatches without deleting calls already pending
in the current one. Once subscriptions retire before invoking user code, so
recursion and thrown exceptions cannot replay them.

**Corrected difference:** `removeAllListeners('')` clears the empty-name event
only. Upstream treats that valid string as a request to clear every event.
Omitting the argument still clears everything. Undocumented mutation of internal
storage is not a supported API.

VentiMath's former API documentation viewer used Redoc and EventEmitter3.
App main `211e2186` removes that unused viewer; this is a historical caller.
The [conformance checks](../../scripts/eventemitter3-conformance/README.md) exercise
its unchanged history and scroll services with this implementation. This does
not mean VentiMath has adopted the package or that every Redoc interaction has
been checked. [Provenance](PROVENANCE.json) records the target and source boundary.

[Isolated benchmarks](bench/results/README.md) compare local dispatch and
subscription workloads; these are not app rendering or scrolling measurements.

Timing results are mixed. Single-listener dispatch is slower on both runtimes;
Node's once registration/dispatch takes about 72ns versus 24ns upstream, and
construction/clearing is also slower on Node. Seven-argument dispatch is lower
on both runtimes, and subscribe/emit/unsubscribe is lower on Bun. The other
recorded directions are unestablished against the same-code controls. These
small synthetic timings do not establish visible performance in the API viewer.
