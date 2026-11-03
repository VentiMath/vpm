# vradix-rect

Independent replacement for `@radix-ui/rect` **1.1.3**, providing
`observeElementRect(element, callback)` and its unsubscribe function. No runtime
dependencies. Imports are safe without a DOM; observation needs the browser's
animation-frame APIs. Node 24 and Bun are the test runtimes.

```js
import { observeElementRect } from 'vradix-rect';
const stop = observeElementRect(element, rect => positionOverlay(rect));
// Later:
stop();
```

One animation loop measures observed elements before notifying listeners, so
callbacks can update layout without interleaving measurement and writes. Changes
to width, height, top, right, bottom or left trigger delivery. The first
subscription starts on the next frame; additional subscriptions get an immediate
measurement, matching Radix. This is polling, not ResizeObserver: position changes
matter even when size does not change.

## Fixes and differences

- Removing the last observer during a callback stops the loop immediately.
- Each unsubscribe is idempotent, even when the same callback is registered twice.
- Coordinates are compared by value, including measurable objects that reuse a
  mutable rectangle. New listeners do not join an already queued notification;
  removed listeners do not receive it.
- Measurement/callback exceptions do not strand unrelated observers. Remaining
  work completes, the next frame is scheduled if needed, then the first exception
  is rethrown to the normal RAF error reporter. A failing synchronous additional
  subscription rolls itself back before throwing.

The [contract checks](../../scripts/radix-rect-conformance/run.cjs) include original
upstream controls and the unchanged React `useRect` 1.1.4 caller. Clean archive
checks cover CJS/ESM, npm/Bun installation, browser bundles and TypeScript 7 DOM
types. [Benchmarks](bench/results/README.md) use isolated balanced processes and
identical-source controls; synthetic measurements exclude browser layout cost.
[Provenance](PROVENANCE.json) records the checked source hashes. Implemented here;
not yet released or adopted by the application.

On Node 24, measured frame checks took 6–31% less time in this recording;
subscription creation/cleanup took 8% more (about 9 ns). Bun established a
35% reduction for the 100-changing-element case; its other directions were
within process/control variability. These are synthetic observer costs, not
measured browser layout improvements.
