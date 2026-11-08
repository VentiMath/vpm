# vtanstack-virtual-core

Independent single-lane table virtualization, targeting **@tanstack/virtual-core
3.19.11** with **3.11.2** as the application control. Zero runtime dependencies.

The supported surface includes vertical rows and horizontal columns, variable
sizes, overscan and custom ranges, keyed measurements and snapshots, padding,
gaps, scroll margins, RTL element scrolling, element/window observers, index
alignment, scrolling commands and the React adapter lifecycle. Existing Material
React Table row/column hooks and its React adapter are test consumers; this
package does not include a React wrapper.

```js
import {
  Virtualizer,
  observeElementRect,
  observeElementOffset,
  elementScroll,
} from "vtanstack-virtual-core";

const rows = new Virtualizer({
  count: 1000,
  getScrollElement: () => document.querySelector(".scrollport"),
  estimateSize: () => 37,
  observeElementRect,
  observeElementOffset,
  scrollToFn: elementScroll,
  onChange: (instance) => drawVisibleRows(instance.getVirtualItems()),
});
const dispose = rows._didMount();
rows._willUpdate(); // Recheck after a host/option change; adapters handle this.
// Call dispose() when the owner unmounts.
```

Use stable `getItemKey` values for records that move. Attach `measureElement` as
an item ref with its `data-index`, or call `resizeItem(index, size)`. `measure()`
clears saved sizes when density or estimates change. `takeSnapshot()` returns
independent copies of cached size overrides for `initialMeasurementsCache`.
Count/key changes rebuild estimates while measured overrides follow their keys.

## Scope and behavior

- Typed geometry buffers and lazy visible-item objects avoid allocating a full
  object per row on the ordinary viewport path. Repeated unchanged reads reuse
  their item array. Asking for `measurementsCache` materializes the full array.
- Caller options are copied. Undefined properties are not deleted from the
  caller, so frozen option objects work. Invalid counts, sizes and overscan are
  rejected before they can poison geometry.
- Observers, queued frames, scroll reconciliation and reset timers belong to the
  attached window. Teardown cancels them; late observer delivery cannot queue new
  work. React StrictMode remounts can attach the same element again.
- Current behavior clamps visible ranges after a filtered list shrinks, uses
  client viewport dimensions, folds size corrections into `scrollOffset`, and
  supports the current snapshot and end-distance APIs. These differ from some
  behaviors in the app's older control.
- **Single lane, start anchored only.** Masonry lanes, measured lane assignment,
  end-anchored chat/feed following and iOS touch-momentum correction are outside
  this implementation. Unsupported layout options throw explicitly. Native
  Chrome is verified; Safari/iOS momentum behavior is not claimed. Debug timing
  output and private upstream test helpers are not reproduced.

MRT contains these callers behind its virtualization options. The inspected
VentiMath call sites do not currently enable them explicitly; this is completion
of a dependency beneath the existing table stack, not production adoption.
Consumer release, the independent React wrapper and app cutover are separate.

[Conformance](../../scripts/virtual-core-conformance/README.md) ·
[Benchmarks](bench/results/README.md) · [Provenance](PROVENANCE.json)
