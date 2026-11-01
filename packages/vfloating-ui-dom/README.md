# vfloating-ui-dom

Independent browser positioning and automatic updates targeting
**@floating-ui/dom 1.8.0**, checked November 1, 2026. Its two dependencies are
`vfloating-ui-core` and `vfloating-ui-utils`. Native browser ESM, Node 24 and
Bun imports share the same functions; declarations require DOM types.

```js
import {autoUpdate, computePosition, offset, flip, shift} from 'vfloating-ui-dom';

const stop = autoUpdate(button, popup, async () => {
  const {x, y} = await computePosition(button, popup, {
    middleware: [offset(4), flip(), shift({padding: 4})],
  });
  Object.assign(popup.style, {position: 'absolute', left: `${x}px`, top: `${y}px`});
});
// Call stop() when the popup is hidden or removed.
```

The public API includes `computePosition`, `autoUpdate`, `platform`,
`getOverflowAncestors` and all DOM middleware. React adapters remain separate;
adding this package does not automatically redirect an installed React caller.

## Changes

- Every automatic-update subscription owns its listeners. Two subscriptions
  sharing a callback remain independent when one is cleaned up.
- Cleanup cancels pending resize re-observation, animation frames and movement
  timers. Already queued observer notifications cannot trigger more updates or
  create new observers afterward. Repeated cleanup is harmless.
- An exception during setup, including the initial update, releases resources
  already registered by that subscription.
- Inherited custom platform methods are retained. Direct calls to
  `platform.getClippingRect` work without creating a private cache first;
  `computePosition` still caches clipping ancestry only for its current call.
- Geometry uses shared coordinate transforms and set-based ancestor filtering.
  It preserves scaled and scrolled parents, fixed positioning, virtual elements,
  layout/visual viewports, gutters, SVG, iframe and top-layer contracts.

This is an independently written, source-informed runtime. The MIT declaration
contract and six selected original tests are attributed in [provenance](PROVENANCE.json).
No upstream runtime is shipped.

## Verification and measurements

Chrome compares 144 app middleware configurations and 319 geometry/viewport
cases with DOM 1.8.0, and runs six unchanged upstream tests. Seven Node 24/Bun
groups reproduce lifecycle faults in the original and verify the corrections.
Packed npm/Bun installations check CJS/ESM, browser bundling and TypeScript 7.
[Fixtures and commands](../../scripts/floating-dom-conformance/README.md).

This does not certify every React interaction or Safari/Firefox behavior.
[Isolated measurements](bench/results/README.md) use controlled DOM geometry and
observer objects on Node/Bun. They measure JavaScript costs, including VPM core
and utilities; they do not measure browser layout, frame rate or application
latency. All regressions and inconclusive results are retained.

In this recording, Bun's simulated popover takes 16% more paired time (7.41 vs
6.32 µs). All other comparisons, including every Node case, are inconclusive
against identical-source control variation. No speedup is established. This is
the complete DOM/core/utils stack on synthetic geometry, not a browser render.
