# Store conformance

Pinned test-only controls: @tanstack/store 0.11.2 and @tanstack/table-core 9.3.1.
The VPM runtime is independently implemented; no upstream signal code ships in
it. `provenance.json` hashes the installed controls and Table declarations.

`run.cjs` compares 160 deterministic dynamic dependency graphs through 9,600
update rounds, with cached reads, diamonds, nested batches, intermediate reads
and subscription disposal. Every value and each subscriber's ordered event
sequence matches. Ordering between independent subscribers is not compared.
`async.cjs` compares initial pending/resolved/rejected states and notifications,
and pins the deliberate difference that VPM continues tracking inputs after
settlement while the current control stops.
Public cases cover stores/actions, custom comparison, observers and shallow
comparison. Package tests cover recovery from exceptions, reentrant writes,
lazy detached branches, cycles and stale asynchronous completions.

`build.cjs` bundles unchanged Table code twice, replacing only its Store import.
`table.cjs` compares 12 scenarios and every options/state notification: sorting,
filtering, pagination, selection, visibility, data replacement and switching
between internal, controlled and external state. These use synthetic rows,
not an authenticated VentiMath page. The installed app still uses Table 8.

`archives.cjs` checks exact packed bytes, fresh/frozen npm and Bun upstream-alias
installs, CJS/ESM, Node/Bun behavior and TS7 NodeNext/Bundler declarations,
including the actual current Table consumer declarations. No public release is
implied by these local archive checks.

```sh
npm --prefix scripts/store-conformance ci --ignore-scripts
bun scripts/store-conformance/build.cjs
node scripts/store-conformance/run.cjs
node scripts/store-conformance/table.cjs
node scripts/store-conformance/archives.cjs
```
