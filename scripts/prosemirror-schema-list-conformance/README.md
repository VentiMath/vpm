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

Use Node 24 and Bun 1.4.4. Seven independent groups cover 6,000 seeded edits, immutable
schema descriptors, attributes/marks, exact query results, mapped positions,
inverse steps and appending a range wrap to an existing transaction. Chrome
compares 13 actual Tiptap list/task-list snapshots and trusted Tab, Shift-Tab,
Enter and typing. The five-package archive closure is byte-verified, installed
fresh/frozen with npm and Bun, then checked for runtime/module/type behavior.

## Cross-list text replacement regression

`diagnose-transform.cjs` replaces text across differently nested bullet and
ordered lists. VPM now joins the compatible trailing list into the leading list,
preserves its nested list, and places the cursor immediately after the inserted
text, matching upstream. The diagnostic is a passing gate in both the source and
archive suites on Node and Bun. An actual EditorState test also checks backward
selection and undo; the thirteenth Chrome snapshot uses Tiptap's `insertContent`.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs
```

## Remaining deletion follow-up

Broader fuzzing found a separate `deleteRange` expansion issue: deleting a
backward selection across a list and an empty paragraph removes that paragraph
in VPM, while upstream preserves it. The diagnostic accepts this saved fixture
and intentionally exits nonzero; this particular case is not a passing gate.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/deletion-followup.json
```

Randomized list comparison includes arbitrary text selections on current/app
upstream foundations (4,000 edits). Full VPM comparison (2,000 edits) now permits
cross-block text insertion. Only deletion remains limited to one textblock;
list operations still span blocks. Keep this limitation visible before full
editor adoption.

[Benchmarks](../../packages/vprosemirror-schema-list/bench/results/README.md) use
identical foundations for list-only cases and explicitly label complete VPM-stack
cases. Rebuild source graphs after archive checks before recording. All process
pairs, controls, source hashes and inconclusive/regressing results are retained.
