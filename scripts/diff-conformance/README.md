# Word-diff conformance

Pinned controls: `diff` 9.0.0 and application `diff` 8.0.2, without modifications.
[Provenance](provenance.json) hashes both full distributions and the lockfile.
Public documentation, declarations and output probes informed an independent
implementation; upstream runtime source is not packaged in vdiff.

- `run.mjs`: 4,056 exact word/space snapshots, including case-insensitive and
  per-token output; 12 synthetic real-caller-shaped comparisons against both
  controls; two explicit v9 tokenization differences from v8.
- `generated.mjs`: 4,000 deterministic generated comparisons, with repeated
  words, arbitrary whitespace, punctuation, TeX, Latin accents, CJK and emoji.
  Whitespace-aware output also reconstructs both inputs exactly.
- `options.mjs`: 240 edit-bound, Intl segmentation and deferred-callback
  comparisons. Zero-millisecond deadlines are deliberately excluded from timing
  parity: VPM stops a changed search deterministically rather than depending on
  the upstream clock's millisecond rounding.
- Package tests exercise independently stated results, invalid inputs, empty and
  equal text, large disjoint input, literal markup, callback ownership and bounds.
- `browser.cjs`: 23 exact current/app/Intl comparisons in real Chrome, rendering
  fragments as text nodes like the app's `InlineDiff`, plus deferred scheduling.
  This does not run or write to a live app account.
- `types.cjs`: strict TS7 NodeNext ESM/CJS and Bundler consumers, including
  abortable result types and negative checks for unadvertised patch APIs.
- `archives.cjs`: exact tarball, isolated npm/Bun installs and frozen reinstalls,
  public export identity, both runtime test suites and installed declarations.

The actual caller was inspected at the revision in
[package provenance](../../packages/vdiff/PROVENANCE.json). It uses default
`diffWords` for proposed problem wording; no patch or other diff API is used.
This evidence supports that documented word scope, not blanket JsDiff parity.

```sh
npm --prefix scripts/diff-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/diff-conformance/check-controls.cjs
node --test packages/vdiff/test/index.test.cjs
bun test packages/vdiff/test/index.test.cjs
node scripts/diff-conformance/run.mjs
bun scripts/diff-conformance/run.mjs
node scripts/diff-conformance/generated.mjs
bun scripts/diff-conformance/generated.mjs
node scripts/diff-conformance/options.mjs
bun scripts/diff-conformance/options.mjs
node scripts/diff-conformance/types.cjs
node scripts/diff-conformance/browser.cjs
node scripts/diff-conformance/archives.cjs
```

[Measurements](../../packages/vdiff/bench/results/README.md) compare six word
workloads on Node 24 and Bun 1.4.4. Timed workers load one implementation each,
use balanced AB/BA order and identical-source controls, and validate exact
expected fragments outside the timed region.
