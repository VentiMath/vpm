# Schema-list conformance

Pins schema-list **1.6.0** and app **1.5.1**, plus the current/app model,
transform, state, view and command graphs used by StarterKit/task extensions
**2.11.7**, core **2.27.2** and PM **2.11.7**. Every transitive Tiptap extension is
pinned to the app's resolved version. The 38 official
tests from commit `1a1c839447b51521637857cdfba0c9b05167f27f` are unchanged, licensed
and hash-verified. Current, full VPM, VPM-on-current and VPM-on-app pass all 38;
app 1.5.1 records exactly eight known pre-1.6.0 failures instead of relabeling them.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-transform-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-schema-list-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/prosemirror-schema-list-conformance/run.cjs
node scripts/prosemirror-schema-list-conformance/archives.cjs
```

Use Node 24 and Bun 1.4.4. Six independent groups cover 6,000 seeded edits, immutable
schema descriptors, attributes/marks, exact query results, mapped positions,
inverse steps and appending a range wrap to an existing transaction. Chrome
compares 12 actual Tiptap list/task-list snapshots and trusted Tab, Shift-Tab,
Enter and typing. The five-package archive closure is byte-verified, installed
fresh/frozen with npm and Bun, then checked for runtime/module/type behavior.

## Existing transform follow-up

`diagnose-transform.cjs` reproduces a synthetic selection spanning differently
nested bullet and ordered lists. With upstream foundations, text replacement
joins the trailing list into the leading list. Current VPM fitting instead keeps
a separate trailing list and places the cursor differently. This is independent
of the schema-list command runtime. The diagnostic intentionally exits nonzero
until both document and selection match; it is not a passing conformance gate.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs
```

Randomized list comparison includes arbitrary text selections on current/app
upstream foundations (4,000 edits). Full VPM comparison (2,000 edits) limits text
replacement to one textblock, while list operations still span blocks. Keep this
limitation visible and resolve the transform discrepancy before full editor adoption.

[Benchmarks](../../packages/vprosemirror-schema-list/bench/results/README.md) use
identical foundations for list-only cases and explicitly label complete VPM-stack
cases. Rebuild source graphs after archive checks before recording. All process
pairs, controls, source hashes and inconclusive/regressing results are retained.
