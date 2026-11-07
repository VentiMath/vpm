# ProseMirror transform compatibility checks

The baseline is prosemirror-transform **1.12.5**, commit
`240982c95fb03caf28452b5b27dd38f8a1a0cdd5`. The application control is **1.11.0**.
`upstream/` contains its unchanged MIT-licensed tests; `upstream.json` verifies
all source hashes before bundling. The randomized upstream inversion tests use
one reproducible seed in both implementations. No upstream runtime is shipped.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts
npm --prefix scripts/prosemirror-transform-conformance ci --ignore-scripts
node scripts/prosemirror-transform-conformance/run.cjs
node scripts/prosemirror-transform-conformance/archives.cjs
```

Use Node 24 and Bun 1.4.4. The first fixture supplies the shared real Tiptap 2.11.7
caller corpus. Resolution redirects every model and transform import together;
controls retain upstream models, while VPM uses its independent complete closure.
All 248 upstream tests run on both runtimes. Thirteen application-style command
snapshots compare JSON, HTML and selections against both controls. TypeScript 7
checks real Tiptap/state consumers without `skipLibCheck`.

Original package tests add 3,000 deterministic edit/undo/selection comparisons,
mirrored mappings, overlapping marks, invalid serialized input and navigation
helpers across nested documents, plus 18 deletions ending at the start of a
later list item (with empty/nonempty paragraphs and nested containers). Another
64 mixed-depth list replacements compare document structure, insertion mapping
and inversion across list types, empty/nonempty tails, enclosing containers and
UTF-16 text. The schema-list fixture additionally checks actual EditorState
selection, undo and the Tiptap browser caller. The empty-paragraph deletion
regression compares steps and mapped boundaries; 96 additional list-package
cases compare document, actual selection and undo, with a packed browser check.
A saved nested-suffix deletion and another 192 list-package variants cover
empty/nonempty text tails, mixed list types, marks, Unicode, nesting and selection
direction. The two cursor regressions and 256 repeated-text replacements also
check document, mapping and undo. Another 256 cross-depth cases verify that
structural suffixes attach at their original depth; the list fixture has 18
packed Tiptap snapshots.
A documented correction rejects an incompatible
empty-block join that upstream suggests but then fails to apply. Archive checks
verify packed bytes, exclusions, fresh and frozen npm/Bun installs, CJS/ESM
identity, CJS/ESM type consumers under NodeNext and Bundler resolution, and the
same application fixture in native Chrome. No production writes are involved.
The fixtures do not certify native IME, system clipboard or a collaborative
server deployment; those need application integration checks.
