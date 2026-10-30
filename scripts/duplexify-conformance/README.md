# Duplexify compatibility fixture

Pinned duplexify **4.1.3**, from tag `v4.1.3`, commit
`94c835466622b46aefa8573265bc92f24ebcf297`. Retained upstream files are protected
by [SHA256.json](upstream/SHA256.json); final whitespace is normalized. The
published npm control is pinned by the fixture's separate package lock. Tape,
through2 and concat-stream are test dependencies only, outside VPM's workspace
and installable package archives.

`run.cjs` executes all **16 original cases / 37 assertions** in a bounded child
process and checks successful TAP completion and the exact assertion count.
VPM retains those assertions and adds one error-code assertion to the upstream
premature-close test, for **38 assertions**. Silent truncation is intentionally
replaced with `ERR_STREAM_PREMATURE_CLOSE`. `regressions.cjs` independently reproduces upstream option mutation, ignored
object watermarks, dropped falsy end values and an unsettled blocked write.
No cases are skipped. All other
adaptations change only the implementation import.

`callers.cjs` loads the separately pinned Cloud Storage **8.4.0** and google-gax
**6.14.0** from the retry-request fixture. It substitutes only duplexify between
control and VPM runs; retry-request and teeny-request remain their tested VPM
implementations in both. It verifies six constructed adapter instances across
Storage download retry and binary multipart upload, and gax server retry,
delayed client writes, bidirectional data and cancellation. Storage's callback
request is also exercised by the reused transport helper. Local HTTP servers
replace cloud endpoints; gax uses local streams instead of a live gRPC service.
The main integration gate invokes these checks with its counted VPM alias.

```sh
npm --prefix scripts/duplexify-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/duplexify-conformance/regressions.cjs
node scripts/duplexify-conformance/run.cjs --upstream
node scripts/duplexify-conformance/run.cjs
node scripts/duplexify-conformance/callers.cjs --upstream
node scripts/duplexify-conformance/callers.cjs
```

Repeat the five verification commands with `bun`. Both runtimes and upstream controls run in
CI. Package tests separately cover the corrected behaviors and native pipeline
interoperability. Performance evidence is under
[vduplexify/bench/results](../../packages/vduplexify/bench/results/README.md).
