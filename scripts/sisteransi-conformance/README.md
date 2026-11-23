# Terminal sequence conformance

`npm ci --prefix scripts/sisteransi-conformance --ignore-scripts` installs pinned
comparison fixtures, never shipped runtime code. `contract.cjs` compares 55,958
valid outputs with sisteransi 1.0.5 and 2.0.0 and preserves the row-zero defect as
an explicit differential. `callers.cjs` bundles unchanged Prompts 2.4.2 and Clack
core 1.4.2 with either helper, records synthetic input/output, and compares
keyboard traces and frame diffs at 8, 20, 80 and 120 columns. Source hashes are
reported. It neither prompts on nor writes escape sequences to the real terminal.

Run both scripts with Node 24 and Bun. `archives.cjs` verifies exact packed npm
and Bun aliases, frozen installs, CJS/ESM identity, runtime contracts/callers and
TypeScript 7 declarations. Local tests cover validation and receiver independence.
See the [package](../../packages/vsisteransi/README.md) and
[benchmarks](../../packages/vsisteransi/bench/README.md).
