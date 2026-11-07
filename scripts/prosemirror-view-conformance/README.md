# ProseMirror decoration model checks

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
transform graphs on Node 24 and Bun. Seven original groups include 2,000 seeded
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

The [deep deletion discrepancy](../prosemirror-schema-list-conformance/README.md#remaining-deep-deletion-follow-up)
remains a full editing acceptance gap. Neither supplied-mapping decoration work
nor read-only rendering masks or repairs it.

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
clipboard remain outside this unit. Next is bounded document/DOM position lookup;
geometry/caret visibility follows later. Bulk decoration performance and the
saved deep deletion remain full editing acceptance follow-ups.
