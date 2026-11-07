# ProseMirror decoration model checks

This is an internal milestone, not an EditorView implementation or a release.
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
No package is uploaded. Native DOM rendering and browser editing are outside
this unit.

The [deep deletion discrepancy](../prosemirror-schema-list-conformance/README.md#remaining-deep-deletion-follow-up)
remains recorded for full editing acceptance; supplied-mapping decoration work
does not mask or repair it. Next bounded unit: read-only DOM rendering of the app
schema with inline/node/widget decorations and stable unaffected DOM identity.
Start with text/marks, paragraphs/headings, blockquotes, ordinary/task lists,
code blocks, hard breaks, rules and images from the documentation editor schema.
Its React ImageUploadNode host is a later node-view lifecycle concern. Input,
selection synchronization, IME and clipboard come later. Bulk decoration
creation/mapping/removal costs remain recorded optimization work before editor
acceptance.
