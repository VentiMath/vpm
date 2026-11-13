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

Use Node 24 and Bun 1.4.4. Eleven independent groups cover 6,000 seeded edits, immutable
schema descriptors, attributes/marks, exact query results, mapped positions,
inverse steps and appending a range wrap to an existing transaction. Chrome
compares 18 actual Tiptap list/task-list snapshots and trusted Tab, Shift-Tab,
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
seventeen snapshots still match all three graphs.

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

## Cross-depth structure regression

`structure-followup.json` selects from 9 to 18 across two lists. Its surviving
list previously attached one level too deep. Structural suffixes now join at
their original depth, preserving the document, cursor 9 and undo. This case is a
source/archive gate and the eighteenth Chrome snapshot. Another 256 cases cover
four list-type choices, Unicode prefixes, empty/marked text tails, enclosing
quotes and both selection directions.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/structure-followup.json
```

## Deep-deletion follow-up

`deep-deletion-followup.json` reduces the saved defect to one nested list and a selection from 3 to 42. The repair retains the right-hand wrappers and cursor at 19, matching upstream. This diagnostic now passes; 64 additional variants compare actual EditorState document, cursor and undo, including empty endpoints and partial-text negative controls.

```sh
node scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs scripts/prosemirror-schema-list-conformance/deep-deletion-followup.json
```

Randomized list comparison includes arbitrary text selections on current/app
upstream foundations (4,000 edits). Full VPM comparison (2,000 edits) permits
cross-block text insertion for the retained seed and confines mixed deletion
operations to one textblock. Dedicated matrices add 96 boundary, 192 nested,
256 repeated-text, 256 cross-depth and 64 deep-boundary cases. These results do not establish
arbitrary deletion parity or complete editor adoption.

## First view milestone

Begin `vprosemirror-view` with the independently implemented `Decoration` and
`DecorationSet` model: inline/node/widget descriptions, create/find/add/remove,
mapping, persistent updates and removal callbacks. The confirmed app caller is
the documentation Tiptap editor's `Selection` extension, which creates an inline
selection decoration while the editable editor is unfocused. Its empty,
node-selection, focused and noneditable paths return no decoration.

Verify that contract with the VPM model/state graph and current/app controls.
Decoration construction and mapping consume documents and supplied mappings;
they do not choose `deleteRange`'s ancestor restructuring. The saved transform
failure therefore does not block this model milestone. Full `EditorView`, DOM
rendering and selection, composition/IME, clipboard and editing adoption remain
separate; the deletion discrepancy must be resolved for full editing acceptance.
Do not publish a partial decoration implementation as a complete view replacement.

[Benchmarks](../../packages/vprosemirror-schema-list/bench/results/README.md) use
identical foundations for list-only cases and explicitly label complete VPM-stack
cases. Rebuild source graphs after archive checks before recording. All process
pairs, controls, source hashes and inconclusive/regressing results are retained.
