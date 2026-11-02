# vcss-box-model

Independent **css-box-model 1.2.1** geometry for the application's drag-and-drop
library. It provides `getRect`, `expand`, `shrink`, `createBox`, `offset`,
`withScroll`, `calculateBox` and `getBox`, with CJS/ESM exports and DOM types.
Its one runtime dependency is `vtiny-invariant`.

```js
import {getBox, withScroll} from 'vcss-box-model';
const client = getBox(element);
const page = withScroll(client);
```

Rectangles include four edges, signed dimensions, x/y and center. Boxes expose
margin, border, padding and content rectangles, plus their spacing records.
Fractional and negative geometry is preserved. CSS pixel values use upstream's
numeric conversion, non-pixel units become zero, and malformed pixel strings
throw. Production bundlers should replace `process.env.NODE_ENV` for assertions.

Derived rectangles are calculated directly, avoiding intermediate spacing
allocations. Default spacing records are independent: changing one cannot affect
another field or later box. Explicitly supplied spacing retains its identity.
`getBox` obtains computed styles from the element's own document window, including
iframe elements. `withScroll` without an explicit position uses the global window,
as upstream does. Geometry functions work without a DOM; `getBox` and implicit
scroll require a browser window.

All 16 original tests, focused controls and actual DND18 draggable and scrollable
and plain droppable calculations pass on Node24/Bun. Packed npm/Bun installations,
standalone browser bundles and TS7 DOM consumers are checked. The two corrections
are reproduced against upstream. See [verification](../../scripts/box-model-conformance/README.md),
[measurements](bench/results/README.md) and [provenance](PROVENANCE.json).

Each benchmark case runs in separate workers to avoid cross-case JIT feedback.
The isolated comparisons establish no parsing or combined client/page speed
change. Independent default spacing costs about 4 ns extra per box on Node
(35 → 39 ns); the corresponding Bun result is inconclusive.

Built in VPM; application adoption and release remain separate.
