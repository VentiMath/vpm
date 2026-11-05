# Scrumboard drag-and-drop controls

Pins `@hello-pangea/dnd` 18.0.1 and React 19.1.0/19.2.4. VentiMath main's
`BoardView`, `BoardList`, `BoardCard`, `BoardListHeader` and reorder types establish
the supported scope; the app retains `@hello-pangea/dnd` imports when aliased.

```sh
npm --prefix scripts/dnd-conformance ci --ignore-scripts
npm --prefix scripts/dnd-conformance/current ci --ignore-scripts
bun scripts/dnd-conformance/build.cjs
node --test packages/vhello-pangea-dnd/test/*.test.cjs
bun test packages/vhello-pangea-dnd/test
node scripts/dnd-conformance/archives.cjs
```

Nine Node/Bun test groups compare upstream/VPM server/client cases on both React
versions, including rubric types, disabled handle updates, hydration identity and
teardown; pinned source hashes prevent silent baseline changes. Generated
comparison bundles require fresh runtime/fixture hashes.

Native Chrome controls use the same nested columns/cards fixture with real CDP
keyboard, mouse and touch events. They cover keyboard reorder, cross-list/empty
list moves, column handles, focus return, disabled cards, interactive descendants,
mouse/touch transfers, touch pre-lift scrolling, outside drops, Escape,
container auto-scroll, active teardown, hydration and center-grab stability.
CSS-gap preview has an explicit paired expectation: upstream shifts the next
card by 8 pixels, VPM preserves its position. A disabled nested card starts an
ancestor-column drag upstream, while VPM blocks it. The control waits for the
upstream end callback; an early fixed wait can miss that animated drop. VPM-specific checks exercise the
actual app's missing droppable data props and a destination disabled mid-drag.

Packed archives install under the upstream name, with no overrides, on npm and
Bun using fresh caches and frozen reinstallation. Both React versions undergo
native Chrome controls; Node/Bun consumers check CJS/ESM and hydration. TS7 checks
the nested app type shape with DOM-only types in NodeNext and Bundler modes and
rejects unsupported virtual lists. No Redux/React Redux/Babel/geometry/scheduler
runtime package is installed. Release checks additionally verify committed
source hashes, public archive checksums and the public root dependency URL.

Benchmarks use production React, independent worker processes, balanced order
and identical-code controls. Native-browser acceptance runs before timings,
not alongside them. These are render/update comparisons, not full upstream API
conformance or browser frame-rate measurements.

Build production comparison bundles separately before recording timings:

```sh
bun -e "await require('./scripts/dnd-conformance/build.cjs').build(undefined, undefined, true)"
OUTPUT=packages/vhello-pangea-dnd/bench/results/node-isolated.json node packages/vhello-pangea-dnd/bench/compare.cjs
OUTPUT=packages/vhello-pangea-dnd/bench/results/bun-isolated.json bun packages/vhello-pangea-dnd/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vhello-pangea-dnd results compare.cjs
```

The timing driver shares one document per worker and owns a separate root per
case. Upstream style cleanup uses the global document, so switching documents
between retained roots is not a valid benchmark setup. Production bundles
explicitly strip development validation; the initial development-bundle timing
attempt is excluded from the published measurements.
