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

Use Node 24 and Bun 1.4.4. Ten independent groups cover 6,000 seeded edits, immutable
schema descriptors, attributes/marks, exact query results, mapped positions,
inverse steps and appending a range wrap to an existing transaction. Chrome
compares 17 actual Tiptap list/task-list snapshots and trusted Tab, Shift-Tab,
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

## Boundary deletion regression

`deletion-followup.json` originally deleted an empty paragraph when the selection
ended at its first editable position. VPM now retains it and places the cursor
inside it, matching upstream. This saved case is a source/archive gate on both
runtimes. Another 96 cases exercise both list types, empty/nonempty starting text,
empty/marked trailing text, paragraphs/headings, zero to two enclosing quotes,
forward/backward selection and history undo. The fourteenth Chrome snapshot
uses Tiptap's `deleteSelection` with this regression. Current transform 1.12.5
and VPM agree. The older app transform 1.11.0 leaves an empty list instead; that
exact document, HTML and cursor remain an explicit negative control. The other
sixteen snapshots still match all three graphs.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/deletion-followup.json
```

## Nested suffix regression

`nested-fitting-followup.json` reproduces an interior deletion from 5 to 17.
The fitter previously joined a carried list suffix to a shallower list, removing
a wrapper. It now preserves that wrapper after joining the textblocks. The
saved case is a source/archive gate: document, cursor and undo match upstream.
Another 192 cases cover mixed list types at three levels, marked ASCII/Unicode
text tails, ASCII/Unicode starting text, enclosing quotes and both selection
directions, including empty text tails. The fifteenth Chrome snapshot
checks the same deletion through Tiptap on current/app/VPM graphs.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/nested-fitting-followup.json
```

## Empty and repeated text cursor regressions

`cursor-followup.json` ends the saved nested deletion at an empty text tail.
`nested-insertion-followup.json` inserts text equal to the surviving text. VPM
now anchors the preserved tail by its source boundary, instead of choosing an
earliest equal substring or treating trailing wrappers as inserted text. Both
saved cases match upstream document and cursor 5; both are source/archive gates.
Another 256 replacements cover empty/ASCII/Unicode insertion, repeated tails,
marks, enclosing quotes, both selection directions and undo. The sixteenth and
seventeenth Chrome snapshots verify these cases through Tiptap; all three graphs
agree.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/cursor-followup.json
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/nested-insertion-followup.json
```

## Remaining cross-depth structure follow-up

Unrestricted mixed-command exploration still finds a structural mismatch.
`structure-followup.json` reduces it to two lists with a selection from 9 to 18:
the cursor agrees at 9, but VPM attaches a surviving list one level deeper than
upstream. This diagnostic intentionally exits nonzero; it is not a passing gate.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/structure-followup.json
```

Randomized list comparison includes arbitrary text selections on current/app
upstream foundations (4,000 edits). Full VPM comparison (2,000 edits) permits
cross-block text insertion for the retained seed and confines mixed deletion
operations to one textblock. Dedicated matrices add 96 boundary cases, 192 nested
deletions and 256 repeated-text replacements. These results do not establish
arbitrary cross-depth replacement parity or complete editor adoption.

[Benchmarks](../../packages/vprosemirror-schema-list/bench/results/README.md) use
identical foundations for list-only cases and explicitly label complete VPM-stack
cases. Rebuild source graphs after archive checks before recording. All process
pairs, controls, source hashes and inconclusive/regressing results are retained.
