# Google API extensions comparison fixture

Pins **google-gax 6.14.0**, checked October 30, 2026, and its comparison helpers.
The source snapshot comes from release tag `google-gax-v6.14.0` at
`cb723569f62de17cb07011e806981b64e80efe3d` in
[google-cloud-node](https://github.com/googleapis/google-cloud-node/tree/cb723569f62de17cb07011e806981b64e80efe3d/core/packages/gax).
[SHA256.json](upstream/SHA256.json), the original package manifest and Apache
license accompany the byte-for-byte tests and fixtures. TypeScript snapshots
have a `.txt` suffix so root Bun discovery does not execute them unprepared.

`run.cjs` checks hashes, copies the selected published build into a temporary
directory, and compiles 28 test files plus two helpers with TypeScript 7.
It preserves the upstream assertions except for one deliberate correction:
the malformed-message ProtoJSON case must reject the same payload with a
`TypeError`, instead of replacing a string field value with an empty message.
That expectation changes only for VPM; the original control retains its assertion.

The 72 namespace imports use `import = require` to preserve callable `assert`
and Sinon-mutable CommonJS objects. A private module loader selects each runtime
dependency and routes the real Dialogflow CX 6.0.1 fixture through the selected
gax module on Node and Bun. Version assertions read the selected package's own
manifest. No global application modules are replaced.

All **755 cases execute: 751 pass and four retain upstream's skips**, for both
variants on both runtimes. Those skips concern three old retry/timing/A-B tests
and the metadata A-B header test. The 20-second per-test timeout accommodates
real retry backoff. `bunInstall.ts` is excluded: it installs/builds every package
in Google's monorepo, not gax's runtime API. The included Bun certification matrix
still tests its local installer fixtures and transport behavior. Cloud/system,
browser and showcase upload suites are outside this gate.

The upstream OpenTelemetry tracing harness uses SDK trace-base 2.12.0 with API
1.9.0 as isolated comparison dependencies. They are not VPM runtime dependencies
or compiler targets. VPM uses its own API 1.10.0 implementation; the separate
[OpenTelemetry fixture](../otel-conformance/README.md) verifies current SDK 3.0.0
interoperability. This fixture also exercises the selected gax tracing helper
with SDK 3.0.0 promise, callback, error and stream calls. Dialogflow is upstream's pinned validation fixture, not a new
application target.

`regressions.cjs` reproduces the upstream path substitution, validation, wildcard,
shared-options and malformed JSON problems before checking the fixes.
`callers.cjs` privately loads actual **Firestore 9.4.0** from the separately locked
[protobuf fixture](../protobuf-conformance/package.json), substituting only gax.
It verifies generated RPCs plus high-level reads, batches, transactions and query
streams. Local REST calls run through real Google Auth and gaxios, including
native-fetch selection, error status mapping and a truncated stream emitting
exactly one error. No cloud credentials or deployment are involved.

```sh
npm --prefix scripts/gax-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/otel-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/gax-conformance/run.cjs --upstream
node scripts/gax-conformance/run.cjs
node scripts/gax-conformance/regressions.cjs
node scripts/gax-conformance/callers.cjs --upstream
node scripts/gax-conformance/callers.cjs
```

Repeat with `bun`. CI additionally checks root tests, declarations, isolated
archives and the combined integration stack. See the
[package contract](../../packages/vgoogle-gax/README.md) and
[benchmark record](../../packages/vgoogle-gax/bench/results/README.md).
