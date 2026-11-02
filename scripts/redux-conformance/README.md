# Redux comparison fixture

Pins **redux 5.0.1**, checked November 2, 2026, with source/tests from release
commit `50b010210df25c470386f7e39a9389a4a77b3842`. Original MIT attribution and
[SHA256 hashes](upstream/SHA256.json) accompany the byte-for-byte snapshot.
TypeScript files use `.txt` suffixes to prevent root test discovery.

`run.cjs` verifies the snapshot and installed source, then runs the five public
API suites and the public `isAction` / `isPlainObject` utility suites: **78 tests**
on both original and VPM, on Node 24 and Bun. Assertions are unchanged. Temporary
module shims redirect source imports to the selected public implementation and
supply the observable-symbol constant. Vitest uses one thread and a CommonJS
configuration so both runtimes load it. The original private warning and error-
formatter tests are excluded because those internal functions are not implemented
or exported by VPM. The original TypeScript test suite is retained as evidence;
it is not counted as runtime coverage. Packed consumers and the repository's
TypeScript 7 gates verify public declarations separately.

`callers.cjs` bundles unchanged DND18 store/reducer/middleware code against each
Redux implementation. Creation, FLUSH side effects and subscriptions match. It
does not simulate a full drag lifecycle. Separate upstream controls reproduce
prototype-named reducer/action-creator problems. Five package test groups cover
these corrections, reentrancy, cross-realm actions, unbound composition and
recovery after a reducer throws.

`archives.cjs` packs only package files, installs through npm and Bun in isolated
directories, runs Node/Bun CJS/ESM consumers and a standalone browser bundle, and
compiles strict positive/negative TypeScript 7 consumers. All runtime dependencies
in this fixture are test tools; `vredux` ships with none.

```sh
npm --prefix scripts/redux-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/redux-conformance/run.cjs --upstream
node scripts/redux-conformance/run.cjs
bun scripts/redux-conformance/run.cjs --upstream
bun scripts/redux-conformance/run.cjs
node scripts/redux-conformance/callers.cjs
bun scripts/redux-conformance/callers.cjs
node scripts/redux-conformance/archives.cjs
```
