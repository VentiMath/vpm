# ProseMirror model compatibility

Development fixtures pin current **prosemirror-model 1.25.12**, the application's
**1.25.4** control and **Tiptap 2.11.7**. Upstream runtime code is installed for
comparison only. It is not copied into the shipped replacement.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vprosemirror-model/test/*.test.cjs
bun test packages/vprosemirror-model/test/
node scripts/prosemirror-model-conformance/run.cjs
node scripts/prosemirror-model-conformance/archives.cjs
```

`upstream/` retains eight unmodified MIT-licensed test files from upstream commit
`4211aeeaa3d738454a5d1428a95c1a210e86d787`. `upstream.json` records their hashes;
`build.cjs` verifies those bytes before bundling. The runner supplies `node:test`
globals and redirects model imports in the tests and their helper dependencies.
All **311 tests** run against both current upstream and VPM on Node and Bun.
The same assertions cover node/fragment operations, marks, content expressions,
positions, slices, replacement, DOM parsing recovery and serialization.

Six original contract groups add **2,000 deterministic open-slice edits**,
retained document/subtree identity, strict position and slice-depth validation,
own-key attributes, whitespace-aware DOM source positions, literal text output and attribute-array DOM injection rejection.
Rejected randomized edits must fail with the replacement-error class; error
wording and the upstream error's generic `name` are not compared.

`callers.cjs` uses the real Tiptap core and application extension set. Thirteen
command snapshots cover HTML input, marks, alignment, split/join, bullet/ordered
lists, undo/redo, cross-block deletion, block paste and a trailing-paragraph
plugin. JSON, HTML and selections must exactly match both upstream versions on
Node and Bun. TypeScript 7 also checks real Tiptap/state/transform declaration
consumers with the replacement types and `skipLibCheck` disabled.

`archives.cjs` verifies exact packed bytes, fresh/frozen npm and Bun installs,
CJS/ESM class identity, TypeScript 7 ESM/CommonJS NodeNext/Bundler consumers,
installed contracts/callers, and all three Tiptap controls in native headless
Chrome. Local archives use explicit file overrides for the two-package closure;
these are packaging checks, not a published consumer release. Browser checks
exercise editor commands and DOM output, not native IME or system clipboard
interaction. No production adoption is claimed.

[Performance results](../../packages/vprosemirror-model/bench/results/README.md)
use isolated child processes, four balanced pairs and two identical-source
controls. All samples and pairs are retained. JSDOM parse/serialize rows measure
that DOM implementation, not native browser layout or end-user editor latency.

```sh
OUTPUT=packages/vprosemirror-model/bench/results/node-isolated.json node packages/vprosemirror-model/bench/compare.cjs
OUTPUT=packages/vprosemirror-model/bench/results/bun-isolated.json bun packages/vprosemirror-model/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-model
```
