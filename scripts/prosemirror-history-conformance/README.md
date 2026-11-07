# History conformance

Pins history **1.5.1**, app history **1.5.0**, state **1.4.4**, current model/transform
and the existing app-pinned model/transform fixtures. Native callers use view
**1.42.9** / app **1.41.6** and commands **1.7.2** / app **1.7.1**. The official history test
source from commit `44956b6a1929d7bc99aca9a8ec01c790260fa45f` and its license are
retained unchanged and verified by hash.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-transform-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-history-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/prosemirror-history-conformance/run.cjs
node scripts/prosemirror-history-conformance/archives.cjs
```

Use Node 24 and Bun 1.4.4. Four coherent graphs run all 28 original tests: current,
app, full VPM, and VPM history/rope on app model/state/transform. No failures are
skipped or relabeled. Independent contracts cover 4,000 seeded edits, state
branching, 1,000 partial cycles with map reclamation, flags, beforeinput, and a
trimmed-history rebase. The last test explicitly records upstream 1.5.0's wrong
text deletion and requires the VPM graphs to match the corrected 1.5.1 result.

Chrome loads actual Tiptap 2.11.7 with current/app/VPM graphs, compares 13 API
snapshots and trusted typing/undo/redo through an untracked edit. The complete
six-package archive closure is byte-checked and installed fresh/frozen with npm
and Bun. Installed contracts, native browser controls, CJS/ESM and TS7
NodeNext/Bundler consumers are repeated. No app or network collaboration is changed.

[Isolated measurements](../../packages/vprosemirror-history/bench/results/README.md)
compare bundled current/VPM graphs built with identical settings. Their source
hashes include those complete graph files; rebuild from workspace sources after
archive checks before recording them. All comparison/control samples are retained.
