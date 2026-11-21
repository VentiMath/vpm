# vgen-mapping

Builds flat version-3 JavaScript source maps. Babel's generator records original
positions and names as it prints JavaScript. Remapping uses the same writer
when composing the maps from several transforms.

```js
import { GenMapping, maybeAddMapping, toEncodedMap } from "vgen-mapping";

const map = new GenMapping({ file: "menu.js" });
maybeAddMapping(map, {
  generated: { line: 1, column: 0 },
  source: "menu.tsx",
  original: { line: 12, column: 4 },
  name: "Menu",
});
const output = toEncodedMap(map);
```

The target is `@jridgewell/gen-mapping` 0.3.13. `addSegment` takes zero-based
lines and columns. `addMapping` takes one-based lines and zero-based columns.
The `maybeAdd` variants omit consecutive equivalent mappings on a generated line.
The writer accepts out-of-order segments and keeps insertion order at equal columns.

`fromMap` preserves repeated source and name entries, including their contents
and ignore indexes, so existing segments continue to point to their original
slots. Later inserts into the generator leave the imported map's lines intact.
Invalid coordinates fail before adding a source or a segment.

[Benchmarks](bench/results/README.md) · [Build caller checks](../../scripts/source-map-conformance/README.md)
