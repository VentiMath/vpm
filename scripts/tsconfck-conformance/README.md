# Configuration-reader conformance

Controls: **tsconfck 3.1.6**, unchanged **vite-tsconfig-paths 6.1.1** and the app's **5.1.4**, with Vite **6.3.5** as the application build control. The app passes `parseNative: false`; no TypeScript compiler is installed or loaded by the reader fixture.

`run.cjs` performs 619 checks across generated JSONC, extends chains/arrays, inherited paths, `${configDir}`, solution references, JavaScript defaults, package configuration lookup, directory discovery and parse errors. Two differences are explicit: VPM preserves the raw source `extends` array instead of reversing it, and a configuration package created after earlier lookups still resolves on Bun where the control reproduces `EXTENDS_RESOLVE`.

Eight fixed package regressions cover prototype-looking JSON keys, root-isolated lookup caches, cache clearing during pending work, source-array order, bounded cycles, invalid shapes/native-mode rejection, and scanning without following symlink cycles.

`callers.cjs` runs real Vite builds with both unchanged plugin versions, substituting only the reader. Inherited aliases must resolve into the emitted module. When the private checkout is present, it also compares `origin/main:tsconfig.json` read-only; private configuration contents are never committed. `types.cjs` uses TypeScript 7 without Node/DOM ambient types. `archives.cjs` verifies clean and frozen npm/Bun installs, CJS/ESM discovery and strict declarations on both runtimes.

```sh
npm --prefix scripts/tsconfck-conformance ci --ignore-scripts
node --test packages/vtsconfck/test/config.test.cjs
bun test packages/vtsconfck/test/config.test.cjs
node scripts/tsconfck-conformance/run.cjs
bun scripts/tsconfck-conformance/run.cjs
node scripts/tsconfck-conformance/callers.cjs
bun scripts/tsconfck-conformance/callers.cjs
node scripts/tsconfck-conformance/types.cjs
node scripts/tsconfck-conformance/archives.cjs
```

The [isolated benchmark](../../packages/vtsconfck/bench/results/README.md) separates JSONC conversion, cached reads and uncached inheritance. Workers use their own files, retain results, alternate implementation order and include identical-source controls. Uncached measurements include filesystem work with warm OS caches; they are not cold-disk startup claims.
