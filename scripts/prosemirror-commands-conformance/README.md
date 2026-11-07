# Commands conformance

Controls pin `prosemirror-commands` 1.7.2 and the application's 1.7.1, with
current/app model and transform closures. The 134 upstream tests are unchanged;
`upstream.json` records the source commit and SHA-256 hashes. The source archive
comes from the maintainer's repository and its MIT license is retained.

VPM's implementation is independent. Runtime tests compare all upstream contracts,
six original groups and 500 deterministic command sequences on Node 24 and Bun
1.4.4. The 1.7.2 cross-list split regression also covers the underlying VPM
transform deletion fix. Current and app Tiptap callers compare thirteen snapshots
plus application-shaped plugin behavior inherited from the state fixture.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-transform-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-state-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-commands-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/prosemirror-commands-conformance/run.cjs
node scripts/prosemirror-commands-conformance/archives.cjs
```

The archive gate packs commands, state, transform, model and orderedmap, verifies
packed file bytes and excludes test/benchmark fixtures. Fresh and frozen npm/Bun
installs run contracts, CJS/ESM identity, TS7 NodeNext/Bundler consumers and real
Tiptap calls. Chrome checks the same three graphs using installed VPM files.
Upstream `prosemirror-view` is a test consumer; it is not a commands runtime
dependency. Native key events, IME, clipboard and complete app integration are
outside these checks.

[Isolated benchmarks](../../packages/vprosemirror-commands/bench/results/README.md)
compare current upstream with the VPM dependency graph. App 1.7.1 is a correctness
control, not a second performance baseline.
