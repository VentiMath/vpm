# Keymap conformance

Pins keymap **1.2.3**, keyname **2.2.8**, state **1.4.4** and current model/transform
controls. `upstream.json` verifies the unmodified source tests and license from
commit `081f24f65b6a394174a4bdf07b9a55a00361f1b7`.

```sh
npm --prefix scripts/prosemirror-model-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-transform-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-commands-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/prosemirror-keymap-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/prosemirror-keymap-conformance/run.cjs
node scripts/prosemirror-keymap-conformance/archives.cjs
```

Use Node 24 and Bun 1.4.4. Five original upstream tests pass. The assertion named
`tries both shifted key and base with shift modifier` fails its second check in
both implementations: published 1.2.3 intentionally stopped the Shift-only
key-code fallback. The gate requires that exact shared failure and rejects any
other failure or unexpected change. It does not edit, silently skip or relabel the
upstream source. The original suite runs with a non-Apple platform because its
`Mod-s` test hard-codes Control; the independent matrix covers six platforms.

Six original groups compare 18,144 alias/modifier/fallback combinations, including
command invocation order and return values, plus real plugin/state operations,
plugin order, bindings snapshots, prototype-like keys and invalid modifiers.
Only own binding definitions are compiled, a documented difference from upstream.

Chrome checks the current, app and VPM graphs in Tiptap 2.11.7. Model/transform and
commands use the app's pinned or current controls; the VPM graph uses its compiled
keymap and completed state/model/transform/keyname closure with current upstream
commands as callers. Five trusted key events verify actual edits, plugin fallback
and non-US Alt shortcuts. Native IME and full application adoption are separate.

Archive checks pack the complete six-package runtime closure, compare file bytes
and exclude tests/benchmarks. Fresh/frozen npm/Bun consumers run installed contract
tests, CJS/ESM identity and TS7 NodeNext/Bundler consumers. Browser code uses the
installed VPM files. State's upstream view peer is a declaration/test consumer,
not a runtime implementation in this package.

[Benchmarks](../../packages/vprosemirror-keymap/bench/results/README.md) retain all
process pairs, controls and source hashes. Both platform-controlled graphs execute
inside CommonJS function scope; VM global-variable overhead is not part of the
comparison.
