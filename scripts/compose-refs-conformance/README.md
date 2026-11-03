# Radix ref composition comparison

Pins **@radix-ui/react-compose-refs 1.1.5**, checked November 2, 2026, alongside
the application's **1.1.2** baseline. The package lock records exact upstream
archives. React 19.2.4, Slot 1.5.0 / 1.2.3, jsdom and Testing Library are test-only
fixtures. Public VPM code is independently written; reference runtime/type hashes
and MIT attribution are recorded in the [package provenance](../../packages/vradix-react-compose-refs/PROVENANCE.json).

`run.cjs` starts a separate process for current upstream, app baseline and VPM.
Each checks all 125 three-ref combinations of missing, null, object, plain callback
and cleanup callback refs. Other cases cover zero refs, non-function callback
returns, bare-function receivers and attachment exceptions. Paired controls demonstrate upstream's repeated
cleanup and early-abort cleanup behavior before verifying VPM's once-only,
complete teardown. Thrown `Error`, `null` and `undefined` values stay intact.

`callers.cjs` checks stable/changed hook identity and server rendering. A private
loader substitutes only the ref-composition import in unchanged current and
app-version Radix Slot bundles; React identity is shared with the fixture renderer.
StrictMode setup/cleanup, updates, object refs and unmount run for original and
VPM. The older Slot recreates composition on updates; that extra cleanup/attach
cycle remains expected for both implementations. No upstream assertions are
relaxed to hide the difference.

`archives.cjs` packs only distributable package files, installs through npm and
Bun in fresh directories, and verifies CJS/ESM identity, SSR, cleanup semantics,
TypeScript 7 NodeNext/Bundler consumers without ambient Node types and a browser
bundle. It uses declared React peers rather than a workspace-only import alias.
No application dependency or saved browser setting is changed.

```sh
npm --prefix scripts/compose-refs-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-react-compose-refs/test/refs.test.cjs
bun test packages/vradix-react-compose-refs/test/refs.test.cjs
node scripts/compose-refs-conformance/archives.cjs
```

[Benchmarks](../../packages/vradix-react-compose-refs/bench/results/README.md)
compare the current 1.1.5 reference in isolated processes. Creation, ordinary
attachment and mixed cleanup are separate cases; hook-render speed is not claimed.
