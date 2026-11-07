# ProseMirror state conformance

Pinned `prosemirror-state` 1.4.4 is both the current and VentiMath app baseline.
The unchanged upstream tests are from commit
`d6fdcd19c4f7f68206b0a8d49649860365672585`; `upstream.json` verifies every source hash.
Its MIT license is retained with the test fixture. No upstream implementation is
bundled into the VPM package.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-transform-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-state-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/prosemirror-state-conformance/run.cjs
node scripts/prosemirror-state-conformance/archives.cjs
```

Use Node 24 and Bun 1.4.4. The run script checks 35 unchanged upstream tests and six
original contract groups on both runtimes, then compares 13 real Tiptap command
snapshots and four application-shaped plugin behaviors. These cover link range
selection, blurred selection decorations, trailing-paragraph state and editor-view
lifecycle. The custom plugin contracts are based on VentiMath's link, selection
and trailing-node extensions, not a claim of running its entire application.

Three graphs run separately: upstream state 1.4.4 with current model/transform
1.25.12/1.12.5; the same state version with app model/transform 1.25.4/1.11.0; and
VPM replacements of all three. Upstream view and the Tiptap callers are test
consumers. This work does not replace the view implementation.

The archive check packs the VPM closure, compares bytes to source, excludes
fixtures, installs with npm/Bun, repeats frozen installs, checks CJS/ESM identity,
runs the original contracts and caller comparisons from the installed files, and
runs native Chrome. TypeScript 7 checks browser consumers without skipLibCheck.
The optional view peer supplies the actual consumer's view declarations; type
aliases keep model/state/transform references on the same VPM graph.

Benchmarks use the shared isolated-process harness. Four balanced comparison
pairs and two identical-source controls retain all samples and input hashes.
They measure operations, not application typing latency. See the package's
[measurement report](../../packages/vprosemirror-state/bench/results/README.md).
