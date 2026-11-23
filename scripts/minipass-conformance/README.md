# Minipass caller checks

Controls are Minipass 7.1.3, glob 13.0.6 and path-scurry 2.0.2. The current
VentiMath build/cleanup tree reaches these file-discovery streams through glob.
The VPM implementation is independent; upstream runtime code is confined to
the comparison installation.

`callers.cjs` copies the unchanged caller closure, substitutes only Minipass and
counts constructions. It checks glob's raw sync/async streams, collection,
iteration, incremental reads, path objects, ignores, depth limits, slow consumers
and aborts, plus both path-scurry stream variants. Each runtime runs 83 checks
and observes 82 replacement constructions. The bundled glob entry is not used
because replacing an external package cannot change its embedded runtime.

`contract.cjs` compares 50,000 deterministic object/string operations with the
control, including queue length, partial reads, flow state, drain and completion.
Focused tests cover split Unicode, 12,000 queued objects, reentrant unpipe/end,
pending iterator return, abort cleanup and module identity.

`upstream/test` contains 30 unmodified Minipass 7.1.3 regression files. Their
checksums and Blue Oak license are retained; only the source-import bridge is
ours. Node runs all 308 assertions. The upstream TAP 21 harness imports V8's
Serializer, which Bun 1.4.4 does not implement; Bun instead runs the focused,
generated and unchanged-caller checks directly. The upstream basic snapshot /
subprocess suite and its module-mocking stdio test are not included. These are
regression files, not a claim of full upstream-suite coverage.

```sh
npm --prefix scripts/minipass-conformance ci --ignore-scripts
node --test packages/vminipass/test/stream.test.cjs
bun test packages/vminipass/test/stream.test.cjs
node scripts/minipass-conformance/upstream.cjs
node scripts/minipass-conformance/contract.cjs
bun scripts/minipass-conformance/contract.cjs
node scripts/minipass-conformance/callers.cjs
bun scripts/minipass-conformance/callers.cjs
node scripts/minipass-conformance/archives.cjs
```

Archive checks install only the packed package into fresh npm and Bun consumers,
repeat frozen installs, verify CJS/ESM identities and run the callers on both
runtimes. TS7 checks the installed declarations in NodeNext and Bundler modes.
No release or app adoption is implied by local packing.
