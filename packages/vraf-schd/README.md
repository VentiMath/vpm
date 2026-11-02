# vraf-schd

An independently written, zero-dependency replacement for **raf-schd 4.0.3**.
It combines repeated calls into one animation frame and delivers the latest
arguments. This is the scheduler used beneath the app's drag-and-drop library.

```js
import rafSchd from 'vraf-schd';
const move = rafSchd((x, y) => updatePosition(x, y));
move(10, 20);
move(20, 30); // the next frame receives only (20, 30)
move.cancel(); // cancel that pending delivery
```

CommonJS uses `require('vraf-schd')`. Importing is safe on a server; scheduling
requires the host's `requestAnimationFrame` and cancellation requires
`cancelAnimationFrame`. The callback receives its arguments without a caller
receiver; bind methods when needed. Reentrant calls schedule a subsequent frame.
There are no timers or runtime dependencies. Type declarations infer callback
arguments without requiring DOM or Node ambient types. Runtime checks use Node
24 and Bun with a frame host; browser bundles are also checked.

## Changes

- Arguments are released when a frame runs or is canceled.
- A canceled frame delivered late by a host cannot consume a newer request.
- Throwing frame-request providers leave the scheduler reusable.

The last two concern host behavior outside normal browser delivery. They do not
imply a browser rendering speedup. Callback exceptions still propagate and do
not prevent later scheduling.

## Verification

All 13 upstream tests pass, with the original as a control. Six focused tests
cover frame ID zero, cancellation, reuse, reentrancy, exceptions, stale delivery
and module identity. The actual `@hello-pangea/dnd` 18.0.1 scroll listener is
bundled with each implementation and exercised for coalescing, filtering,
latest offsets, cancellation, unbinding and restarting. This does not claim
coverage of the entire drag-and-drop library.

Packed npm/Bun installations, CJS/ESM consumers, browser bundles and TypeScript 7
consumers pass. See [fixtures](../../scripts/raf-schd-conformance/README.md),
[measurements](bench/results/README.md) and [provenance](PROVENANCE.json).

Single-frame cycles take 24 → 30 ns on Node and 25 → 36 ns on Bun in the
isolated corpus. Coalescing has no established difference. Cancellation adds
about 10 ns on Node; the Bun direction is inconclusive against its controls.

Built in VPM; not yet released or adopted by the application.
