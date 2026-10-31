# Deep-equality conformance

Baseline: **fast-deep-equal 3.1.3**, source commit
`d807ffc5013e710deb1c63d463a03f729bcd144d`, checked October 30, 2026.
The immutable upstream tests, source template, license and metadata are retained
under `upstream/` (spec files use a `.txt` suffix to avoid root test discovery), verified against `SHA256.json` before execution.

```sh
npm --prefix scripts/deep-equal-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/build-deep-equal.cjs --check
node scripts/deep-equal-conformance/run.cjs --upstream
node scripts/deep-equal-conformance/run.cjs
node scripts/deep-equal-conformance/regressions.cjs
node scripts/deep-equal-conformance/callers.cjs --upstream
node scripts/deep-equal-conformance/callers.cjs
```

Repeat the runtime commands with Bun. All **626 upstream tests** run unchanged,
including both argument orders and both React rendering variants; no skips or
expectation rewrites. The harness redirects package imports and resolves test
helpers from this separately locked fixture. React 16.14/its matching renderer
reproduce the original synchronous test contract; they are test-only dependencies,
not the application's React target. Focused tests also cover React's modern
transitional-element marker. Package sources and consumers compile with TypeScript 7.

`regressions.cjs` reproduces original failures before asserting the replacement:
binary false equality, null-prototype and non-callable-hook exceptions, array
kind confusion and the ES6 DataView hang. The hang runs in a child with a 1.5-second
timeout and a startup handshake, identically on Node and Bun.

`callers.cjs` uses the actual Firestore **9.4.0** SDK pinned in the
[protobuf fixture](../protobuf-conformance/package.json). A private module loader
substitutes only the equality function inside its modules; an import count proves
that substitution occurred. Seven ordinary equality paths agree with upstream.
Two binary document/transform paths deliberately differ: upstream reports equality
for distinct bytes, while VPM correctly reports inequality. No network, credentials,
SDK source edits or application changes are involved.

The package's `src/equal.js.txt` is the editable source for its ordinary/React
comparators. Run `node scripts/build-deep-equal.cjs` after editing it. CI checks
that the generated files are current; the published package executes no generator.
