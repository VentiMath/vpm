# vtsconfck

Independent, zero-dependency configuration reader targeting **tsconfck 3.1.6**. It covers the non-compiler path used by VentiMath's Vite path-alias plugin on Node 24 and Bun 1.4.4.

```js
import { parse, TSConfckCache } from 'vtsconfck';
const cache = new TSConfckCache();
const { tsconfigFile, tsconfig } = await parse('src/main.ts', { cache, root: process.cwd() });
// After adding, changing or removing configurations:
cache.clear();
```

The verified contract includes `find`, `findAll`, `toJson`, `parse`, `TSConfckCache` and parse diagnostics: JSON with comments/trailing commas, nearest-config discovery, `jsconfig` defaults, extends chains/arrays, inherited path rebasing, `${configDir}`, JSON configuration packages and solution references. Raw parent configurations remain available in `extended`. Cache results are shared objects; clone before mutating them. Cache invalidation is explicit.

The app sets `parseNative: false`. Compiler-backed `parseNative`/`findNative` reject with `UNSUPPORTED_NATIVE`, and there is no CLI or TypeScript dependency. Source-file reference selection covers ordinary `files`/`include`/`exclude` globs; complete compiler file discovery and diagnostics are not claimed.

Corrections are explicit: root-limited cache lookups cannot reuse a broader lookup, clearing a cache separates pending work from the new generation, inheritance never reverses the source `extends` array, and prototype-looking JSON keys remain data. Cyclic/deep inheritance and references fail with bounded diagnostics; invalid non-object configurations are rejected. Comments retain line positions, including leading line comments that upstream may discard.

Bun's negative module-resolution cache can hide an ordinary JSON package created after an earlier lookup. A filesystem fallback resolves its configured JSON entry. Packages with `exports` remain subject to the runtime's export rules; this is not a replacement module loader.

[Conformance](../../scripts/tsconfck-conformance/README.md) includes unchanged current/app path-plugin builds and a read-only app configuration comparison. [Benchmarks](bench/results/README.md) separate JSONC conversion, explicit-cache reads and uncached inheritance. [Provenance](PROVENANCE.json) records the independently written scope. Source completion is separate from publication or application adoption.

Cached reads measure 69% less time on Node and 72% less on Bun; Bun JSONC conversion measures 65% less. Node JSONC and uncached filesystem comparisons are noisy and establish no direction. These are isolated local measurements, not whole-build speedups.
