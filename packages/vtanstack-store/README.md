# vtanstack-store

Independent reactive atoms and stores targeting **@tanstack/store 0.11.2**.
Zero runtime dependencies; usable in browsers, Node 24 and Bun.

```js
import { createAtom, createStore, batch } from "vtanstack-store";

const count = createAtom(0);
const doubled = createAtom(() => count.get() * 2);
const subscription = doubled.subscribe((value) => console.log(value));
batch(() => {
  count.set(1);
  count.set((previous) => previous + 1);
}); // one notification: 4
subscription.unsubscribe();

const counter = createStore(0, ({ get, setState }) => ({
  increment() {
    setState((value) => value + 1);
    return get();
  },
}));
counter.actions.increment();
```

## Contract

`createAtom(value)` creates a writable atom with `get`, `set` and `subscribe`.
A function argument creates a read-only computed atom; synchronous reads inside
that function become dependencies. Its previous successful value is passed back
to the computation. `compare` defaults to `Object.is`; equal values retain the
previous object. Subscribing evaluates the current value without emitting it.
Subscriptions have an idempotent `unsubscribe()` method and accept callbacks or
observer objects. Observer methods keep their receiver.

`batch` defers notifications until the outermost batch exits. Reads inside a
batch see current values; `flush` does not break an active batch. Writable atoms
changed and restored within a batch still notify, matching the current control.
Computed atoms notify only when their evaluated version changes. Subscriber
ordering across different atoms is not an API guarantee.

`Store`, `ReadonlyStore` and `createStore` expose `get`, `.state` and subscriptions.
Writable stores add bound `setState(updater)` and optional typed actions.
`createStore(compute)` returns a read-only store. `createAsyncAtom` exposes
`pending`, `done` and `error` states, tracks reads made before the first await,
and ignores stale promise completions; it cannot cancel external work.
Unlike the current control, its dependencies remain reactive after a promise
settles; later input changes start a new request. This is an intentional behavior
change, verified separately from initial pending/resolved/rejected parity.
`shallow` compares own enumerable string properties, Maps, Sets and Dates.
Private upstream signal-node types, `_snapshot`, `_update` and framework hooks
are not part of this package.

## Design and deliberate differences

Observed branches propagate invalidations. Computations with no subscribers
keep only their input references and validate cached input versions on demand;
source atoms do not retain them. Dynamic branches detach discarded dependencies.

Notifications are delivered in complete successive waves. If a listener writes
again, every subscriber receives the current wave before the next one. This
avoids the upstream control's lost reentrant notification. A throwing listener
does not strand other subscribers or future writes: delivery finishes before
errors are rethrown (an `AggregateError` for multiple failures).

Computed failures reach error observers and are rethrown by `get()` until an
input change allows recovery. Without an error observer, notification throws
after other listeners have run. This deliberately replaces upstream behavior
that can leave a computed subscriber stalled after an exception. Circular reads
report a clear error. Notifications that do not settle after 10,000 waves throw
instead of looping indefinitely. Batch-body failures still flush valid writes.

## Verification and scope

Current Table 9.3.1 is tested unchanged against the VPM store: sorting,
filtering, pagination, selection, column visibility, data replacement, controlled
state and external-atom ownership. VentiMath currently uses Table 8.20.5 through
Material React Table 3.2.1; this package is a prerequisite for the current Table
upgrade, not a claim of an existing direct app Store import or adoption.

[Conformance](../../scripts/store-conformance/README.md) ·
[Benchmarks](bench/results/README.md) · [Provenance](PROVENANCE.json)
