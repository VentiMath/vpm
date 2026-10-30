# Google Cloud promise and project-ID helper conformance

Pinned **@google-cloud/promisify 6.2.1** and **@google-cloud/projectify 6.2.1**,
both from [google-cloud-node at c6fbbcb5](https://github.com/googleapis/google-cloud-node/tree/c6fbbcb565d7485d6fece20487fc00a6675074b8/core).
Source, tests, manifests and licenses are retained under `upstream/`, with
SHA-256 manifests checked before each run. Test dependencies and controls are
excluded from installable VPM archives.

```sh
npm --prefix scripts/cloud-utils-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/cloud-utils-conformance/run.cjs
node scripts/cloud-utils-conformance/run.cjs --upstream
node scripts/cloud-utils-conformance/regressions.cjs
node scripts/cloud-utils-conformance/callers.cjs
node scripts/cloud-utils-conformance/callers.cjs --upstream
```

Repeat with `bun` instead of `node`. Runtime verification targets Node 24+ and
Bun. All **27 promisify cases** and **five projectify cases** pass, with no skips.
TypeScript 7 compiles the retained tests; CommonJS import assignments preserve
callable assert and mutable module exports for Sinon's upstream stubs. Three
upstream asynchronous tests explicitly return their promise or await their
callback/unhandled-rejection event, so their assertions finish before success
is reported. The same adaptations apply to the upstream and VPM controls.
Original test assertions remain intact; trailing source whitespace was normalized
before hashing.

The root suite adds **22 promisify** and **14 projectify** cases. Independent
controls demonstrate upstream prototype-accessor execution, success-shaped
falsy rejection reasons, replacement-pattern interpretation, skipped
null-prototype records and recursive failure on cyclic records.

Caller tests load the actual Storage **8.4.0** classes from the separately pinned
retry-request fixture, with each selected library substituted before module
initialization. They verify **36 wrapper invocations** across bucket/file
metadata, existence and error paths in promise and callback modes. The transport
boundary returns asynchronous fixture responses; these tests do not contact
Google. The actual SDK request decorator also performs **seven instrumented
project substitutions**, covering query records, URLs, JSON, multipart data,
opaque stream/Buffer bodies and the missing-project error class. The root
integration suite repeats this with VPM substitutions installed.

Performance evidence is retained separately for [vpromisify](../../packages/vpromisify/bench/results/README.md)
and [vprojectify](../../packages/vprojectify/bench/results/README.md). Each has
three fresh comparison processes and one identical-upstream control per runtime.
