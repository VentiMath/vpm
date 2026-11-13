# ProseMirror internal view checks

These are internal decoration and read-only DOM milestones, not an EditorView implementation or a release.
Current upstream is 1.42.9 (registry checked 2026-11-07), app upstream is 1.41.6.
Pinned official tests and their licenses are under `upstream/`; hashes and commits
are in `upstream.json`. No upstream runtime is copied into the VPM package.

```sh
npm --prefix scripts/prosemirror-view-conformance ci --ignore-scripts
node scripts/prosemirror-view-conformance/run.cjs
node scripts/prosemirror-view-conformance/archives.cjs
```

Both 47-test upstream suites run unchanged across current, app and full VPM model/
transform graphs on Node 24 and Bun. Eight original groups include 2,000 seeded
cases using identical supplied mappings to isolate decoration behavior. Other
checks cover affinity, widget identity, child layers, callbacks and persistent
snapshots. The shared upstream dependency fixture does not indicate application
adoption.

`selection-source.cjs` independently expresses the documentation Tiptap Selection
extension's contract: highlight a nonempty text selection while editable and
unfocused; return null when empty, a node selection, focused or noneditable.
`caller.cjs` exercises all 12 combinations on real Plugin/EditorState objects.
For read-only verification of the actual app source, set `APP_SELECTION_SOURCE`
to its `selection-extension.ts` path when running the suite. Its `@tiptap/react`
import is resolved to `@tiptap/core`, the public re-export that supplies Extension
and isNodeSelection; this is a model contract test, not a mounted React/DOM test.

Archive checks verify exact source bytes, fresh and frozen npm/Bun installs,
CJS/ESM identity, absent root export, TS7 NodeNext/Bundler declarations without
skipLibCheck, and the same runtime contracts with archived decoration bytes.
No package is uploaded. The native read-only rendering gate is described below;
browser editing remains outside this unit.

The repaired [deep deletion discrepancy](../prosemirror-schema-list-conformance/README.md#deep-deletion-follow-up)
now passes its saved case and 64 variants. Arbitrary mixed deletion and complete editing acceptance remain separate from read-only rendering.

## Read-only DOM milestone

The `readonly` entry is independently implemented and remains private. `schema.cjs`
loads the public Tiptap extensions at the versions and configuration used by the
documentation editor: StarterKit, text alignment, underline, task lists/items,
multicolor highlighting, images, sub/superscript and link marks. The app's Link
extension preserves the upstream DOM recipe; its editing plugins, TrailingNode
behavior and the React ImageUploadNode lifecycle are outside this rendering unit.
This is schema rendering, not a mounted copy of the complete application editor.

`dom-cases.cjs` compares schema-only upstream EditorView instances with
`editable: false` against the VPM renderer. Fourteen initial and 120 update
snapshots cover the nodes/marks above, overlapping and custom decoration wrappers,
widgets and retained identities. Attribute order is canonicalized. The sole
intentional markup difference removed from structural comparison is `disabled`
on static task checkboxes; a separate assertion and native click verify that
policy. Caller-owned checkbox widgets are not disabled. No other structural
mismatches are filtered out.

```sh
bun scripts/prosemirror-view-conformance/dom-build.cjs
node scripts/prosemirror-view-conformance/browser.cjs scripts/prosemirror-view-conformance/node_modules/.vpm-view
```

Chrome compares block layout, retains focused widget identity across unrelated
edits, verifies updated/removed widget positions and cleanup, exercises iframe
ownership, and attempts native input into the noneditable document. A screenshot
can be saved with `VPM_DOM_SCREENSHOT`. Seven original DOM test groups also cover
wrapper/attribute cleanup, equivalent-update mutation counts, literal text,
constructor/update failures and rejection of attribute-array DOM recipes.

The archive gate repeats native Chrome against the exact packed renderer/model
closure after both npm and Bun installs. Widget factories that need an EditorView
host, custom node views, browser editing, selection synchronization, IME and
clipboard remain outside this unit. The retained-record position lookup gate is described below;
geometry/caret visibility follows later. Bulk decoration performance and the
saved deep deletion remain full editing acceptance follow-ups.


## Document/DOM position lookup

`position-cases.cjs` expresses the public `nodeDOM`, `domAtPos` and `posAtDOM`
contracts independently. It compares all valid document positions (sides -1/0/1),
all DOM node/offset pairs (biases -1/0/1), and the exact returned DOM paths across
current/app/VPM. Every document-to-DOM result must round-trip to the same document
position. UTF-16 offsets deliberately include surrogate-pair and combining-mark
boundaries; no grapheme rounding is applied.

The 21 initial fixtures cover the documentation schema, marks, inline/node wrappers,
static task labels/content holes, leaf nodes, empty blocks, trailing breaks and
negative/zero/positive widget affinities, including widgets with their own marks.
A further 24 updates change text lengths, marks and wrappers while retaining the
second paragraph and moving a keyed widget. Each update repeats the complete
lookup comparison. The iframe check repeats round trips in its owner document.
Original tests also verify a ShadowRoot mount, no DOM writes from queries, stale
and foreign DOM rejection, strict offset validation and destroyed-instance guards.
These checks run in JSDOM on Node/Bun and native Chrome, including exact archives.
Bounds and sibling offsets are cached for one successful update only; the update
sequence warms queries before changing the document/decorations, exercising cache
invalidation even when an unchanged node is retained and moves.

No geometry APIs, browser selection/input, mutation reconciliation or custom
node-view mapping are claimed. The app-used `coordsAtPos` geometry contract is covered below;
the deep-deletion and bulk decoration costs remain editing acceptance follow-ups.


## Caret geometry

`geometry-cases.cjs` compares every document position and sides -1/0/1, plus the
default-side call, against current 1.42.9 and app 1.41.6 in native Chrome. Nineteen
scenarios cover wrapped text, marks and decoration wrappers, hard breaks and
empty paragraphs, images and rules, code newlines, lists/task content holes,
widgets and mixed-direction text. They also cover vertical and horizontal
container scrolling, window scrolling, resize without a model update, document/
decoration updates, iframe viewport ownership and an existing focused widget/DOM
selection. Each query run asserts no DOM mutation or focus/selection changes.

The gate compares more than 15,000 rectangles with a 0.05 CSS-pixel tolerance for
subpixel rounding. Native comparisons run after both exact archive installs.
The fixture keeps upstream's zero-size `ProseMirror-separator` images separate
from its sized content images and applies the documented separator CSS; no
geometry differences or cases are filtered out. JSDOM verifies the explicit
missing-layout error, not fabricated rectangle results.

The caller reference remains the pinned documentation `simple-editor.tsx` source:
it uses `coordsAtPos(selection.from).top` to decide whether the toolbar leaves
space for the caret and to compute a scroll target. This unit verifies that
geometry contract, not the complete React editor or its `hasFocus`/selection
lifecycle. Hit testing, native input/selection, IME, clipboard, custom node views,
other browser engines and vertical writing remain separate acceptance work.
No geometry performance comparison is claimed.

Decoration indexing also checks cache invalidation by immutable document identity and repeated/duplicate removal without changing retained snapshots. Single-item removal traverses only its owning branch. Bulk mapping remains a measured cost.
