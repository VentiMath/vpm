# vremapping

Composes flat version-3 JavaScript source maps for build tools, targeting `@jridgewell/remapping` 2.3.5. VentiMath’s Babel core 7.29.0 uses this operation to map transformed output back to the original source file.

Pass an encoded or decoded map and a synchronous loader, or an array of transformations ordered from latest to earliest. Each intermediate array entry has at most one source. The loader can redirect source paths, replace or remove embedded content and override ignore flags. The result supports encoded or decoded mappings, optional omission of source content and JSON serialization.

```js
import remap from "vremapping";
const original = remap([bundleMap, transformMap], () => null);
```

The runtime uses VPM’s generator and tracer. Both loading and position tracing are iterative. Tests include a 12,000-level loader chain, 200 generated pipelines, explicit unmapped ranges and comparison with Babel’s unchanged source-map merger. Packed installations on npm and Bun run the same callers. [Conformance](../../scripts/source-map-conformance/README.md) · [Node and Bun benchmarks](bench/results/README.md)
