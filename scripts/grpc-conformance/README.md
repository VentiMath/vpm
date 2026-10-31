# gRPC transport comparison fixture

Pins **@grpc/grpc-js 1.14.7**, checked against npm's latest release on October 30,
2026. Its two runtime dependencies are replaced by `vgrpc-proto-loader` and
`vordered-map` in VPM. Original grpc-js, proto-loader, Mocha and Lodash here are
comparison/test tools and do not ship in VPM archives.

The retained tests are from grpc-node commit
`5e0c170d4c3ccb7c027344663c009fde8db8bee9`, the published release's gitHead.
[upstream/SHA256.json](upstream/SHA256.json) and the original Apache license
accompany the byte-for-byte snapshot. TypeScript files have a `.txt` suffix to
keep root Bun discovery from executing unadapted upstream tests.

## Harness

`run.cjs` verifies hashes, prepares a temporary copy and compiles tests with the
workspace's TypeScript 7 compiler. Source/build imports select the original or
VPM transport. The following adaptations apply identically to both variants:

- The 89 namespace imports become TypeScript `import = require` imports. This
  preserves callable CommonJS `assert` and writable `http2.connect` monkeypatches
  instead of TypeScript 7's getter-based namespace wrappers.
- Original test fixtures remain untouched in the snapshot. Temporary copies use
  the [test TLS material](tls/generate.py), retaining the original certificate
  names and SANs with 2048-bit RSA keys. Node 24 rejects upstream's 1024-bit key.
  Certificate verification and peer-name assertions remain enabled. The committed
  server key is public test-only material; the CA signing key is discarded.
- Test files run in alphabetical order on both runtimes. Node already returned
  that order; Bun's directory enumeration differed. The one no-deadline test
  replaces global `setTimeout` and counts every call, so it runs in its own fresh
  process. That process supplies an explicit HTTP/2 Date response header, on both
  runtimes and for both variants. Bun's `node:http2` otherwise starts a Date-cache
  timer inside `respond()`, unrelated to gRPC deadlines; diagnostic stack traces
  identified this after an original-upstream failure in Linux/Bun CI. No timers
  are filtered, mocked or disabled, and the zero-timer assertion stays intact.
  The main process excludes exactly that case and the isolated process requires
  exactly one case; aggregate counts remain 508. Experimental outlier detection
  is enabled as in upstream's gulp task.

Test bodies and assertions remain unchanged. The 508 cases include nine original
skips: five DNS/TXT/IPv6 cases, continuation after shutdown, NoCompress and two
weighted-round-robin timing cases. No VPM skips are added.

`compare.cjs` runs fresh upstream and VPM processes and compares results. On Node
24, all **499 active cases pass**. Bun's two observed HTTP/2 failures are retained:

- A queued-stream connection-drop test unexpectedly receives a successful call.
- A server-drain test receives `UNAVAILABLE` instead of `CANCELLED`.

The gate accepts these only on Bun, only with their exact known assertions, and
only when VPM matches the upstream control in the same run. Any other failure,
changed test count, changed skip count or unmatched VPM result fails the gate.
It never reports these cases as passes. Direct `run.cjs` exits unsuccessfully for
any failed assertion, including these runtime limitations.

## Additional checks

Seven unit tests cover frame splits, coalescing, empty frames, ownership and size
limits; released chunk references; metadata prototypes/combined binary values;
and inherited package namespaces. `regressions.cjs` adds **1,504 exact differential
comparisons** and original controls demonstrating the deliberate corrections.

`consumers.cjs` privately evaluates installed, unchanged **google-gax 6.14.0** and
**Firestore 9.4.0** modules, substituting only the selected gRPC transport.
`callers.cjs` performs twelve local calls: all four RPC modes in both cross-version
directions, actual Firestore unary/server-stream/bidirectional methods, and
verified TLS with metadata credentials. The main integration gate separately
exercises the combined VPM stack. No cloud access, deployment or credentials.

```sh
npm --prefix scripts/grpc-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/grpc-conformance/compare.cjs
node scripts/grpc-conformance/regressions.cjs
node scripts/grpc-conformance/callers.cjs
node scripts/grpc-conformance/callers.cjs --upstream
```

Run with `bun` too. `GRPC_TEST_FILES=test-end-to-end` selects a diagnostic subset;
CI runs the complete suite. The [package contract](../../packages/vgrpc-js/README.md)
and [benchmarks](../../packages/vgrpc-js/bench/results/README.md) describe the
maintained API, deliberate differences and performance evidence.
