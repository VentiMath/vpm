# CSS box model verification

Pins css-box-model1.2.1 and @hello-pangea/dnd18.0.1. Original source and tests are
retained from commit `1fc7824e417e3106c7d47cc6f8d409a8860ddcb4`, with SHA256 checks
and byte comparison to the installed source. All 16 original test assertions run;
only import routing and Flow-compatible type syntax are transformed.

```sh
npm --prefix scripts/box-model-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/box-model-conformance/run.cjs --upstream
node scripts/box-model-conformance/run.cjs
node scripts/box-model-conformance/callers.cjs
node scripts/box-model-conformance/archives.cjs
```

Repeat runtime commands with Bun. The caller fixture bundles the actual DND
get-dimension modules and compares draggable, plain droppable and scrollable
droppable output. Separate original controls reproduce shared default mutation
and wrong-window style lookup. Archives verify npm/Bun installs, Node/Bun CJS/ESM,
a browser bundle without a host process global and strict TS7 DOM consumers.
[Benchmarks](../../packages/vcss-box-model/bench/results/README.md) isolate each
case and implementation in fresh processes, with balanced order and
identical-source controls. Earlier cases cannot affect later JIT feedback. They measure geometry
CPU costs, not layout, browser frame rates or whole-application latency.
