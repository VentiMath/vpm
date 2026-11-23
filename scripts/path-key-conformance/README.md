# PATH key conformance

Pinned current path-key 4.0.0, app 3.1.1 and unchanged cross-spawn 7.0.6.
The current app lockfile uses cross-spawn through Ionic subprocess tooling and
foreground-child. No private application source is copied here.

- Package tests: all 16 case combinations, 8,192 generated environment objects,
  inherited/nonenumerable names, throwing value getters, mutations and defaults.
- `callers.cjs`: unchanged cross-spawn resolver, 15 platform/environment cases
  compared to both controls; actual host executable lookup in a temporary directory.
  No command is executed. Windows key lookup is simulated, not native Windows CI.
- `archives.cjs`: direct **vpath-key** fresh/frozen npm/Bun installs, CJS/ESM,
  runtime/caller tests on both engines and strict TypeScript 7 consumers.

```sh
npm --prefix scripts/path-key-conformance ci --ignore-scripts
node --test packages/vpath-key/test/*.test.cjs
bun test packages/vpath-key/test
node scripts/path-key-conformance/callers.cjs
bun scripts/path-key-conformance/callers.cjs
node scripts/path-key-conformance/archives.cjs
node packages/vpath-key/bench/compare.cjs
bun packages/vpath-key/bench/compare.cjs
```
