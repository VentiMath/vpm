# Cloud Storage comparison fixtures

Pinned reference: `@google-cloud/storage` **8.4.0**, from
[Google's storage-v8.4.0 source](https://github.com/googleapis/google-cloud-node/tree/27d6be61e43e2f54a78ffc78e141f79471848623/handwritten/storage).
`package-lock.json` pins the installed reference, Mocha and Sinon. The retained
published CJS/declarations and selected source/tests are checked against
`upstream/SHA256.json`; published files must match the installed reference.

```sh
npm --prefix scripts/storage-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/storage-conformance/run.cjs
node scripts/storage-conformance/run.cjs --upstream
node scripts/storage-conformance/regressions.cjs
node scripts/storage-conformance/crc32c.cjs
node scripts/storage-conformance/callers.cjs
node scripts/storage-conformance/callers.cjs --upstream
node scripts/storage-conformance/firebase.cjs
node scripts/storage-conformance/firebase.cjs --upstream
```

Repeat with `bun` in place of `node`. The Firebase fixture additionally needs
`npm --prefix scripts/consumers ci --ignore-scripts --no-audit --no-fund`.
CI runs the same gates; the root integration runner includes VPM HTTP and
Firebase callers. Upstream controls run separately without aliases.

## Retained upstream tests

`run.cjs` executes all **110 cases** from signer, CRC32C and util tests. It checks
hashes, makes temporary TypeScript copies, transpiles them with the repository's
TypeScript 7 compiler, and points their imports at the selected implementation.
There are no skipped cases.

Adaptations are explicit:

- Mutable CommonJS imports replace namespace imports for Sinon/crypto stubbing.
- VPM auth and lazy MIME/limiter package names replace upstream names.
- Two signer fixture inputs use a 40-digit string as a SHA-256 digest. VPM uses a
  64-digit digest in those same canonical-request assertions; separate paired
  probes prove the invalid input is rejected.
- Three header dictionary comparisons spread the actual dictionary before
  comparing, accommodating VPM's prototype-free records without changing values.
- Lazy-loader tests use an injectable CommonJS loader facade on both runtimes.
  It executes the unchanged util source with a module-relative `require`, so
  Bun also exercises the original load, caching, failure and recovery assertions
  without relying on Node-specific `Module._load` interception.

## Additional coverage

`regressions.cjs` runs five desired-behavior probes against both implementations:
SHA-256 length, reserved query fields, byte-view offsets, canonical host ports,
and header normalization. Each has an upstream failure and VPM pass.

`callers.cjs` uses actual SDK methods and a local HTTP server. Each variant makes
25 requests covering binary/simple/default-resumable/local-file uploads,
CRC32C/MD5 download validation, paginated/manual/streamed listing, exists,
callback settlement, ignore-not-found deletion, checksum-failure cleanup,
transient retries and bucket creation. Server assertions inspect payloads and
metadata. It performs no live cloud operations.

`firebase.cjs` replaces the Storage import in Firebase Admin 12.7.0's installed
Storage factory, constructs the actual wrapper, checks bucket identity, and
independently verifies a V2 signature with an ephemeral RSA key. Both client
variants run through the same factory. This fixture models an existing caller;
it does not claim every Firebase Admin method or Storage 7 API is covered.

The package's ten root tests add independent V2/V4 signature verification,
callback error cases, immutable inputs, asynchronous snapshotting and module
identity checks. Broader retained SDK operations and real IAM/cloud integration
remain outside this selected verification scope.

## Per-client endpoint configuration

The Firebase Admin `storage-context.cjs` control also exercises the underlying
Storage 8.4.0/VPM clients in isolated processes. Two real servers reproduce the
original split between metadata and upload endpoints when both an explicit API
endpoint and ambient emulator are set. Metadata, uploads, Firebase download URLs,
V2/V4 signed URLs and independently verified V4 forms retain per-client routing.
The original global-mutation assertion in Admin's suite is unchanged and tracked
as an exact intentional difference. Lower-level endpoint controls cover explicit
per-client emulators, canonical default authentication classification and invalid
endpoint syntax. Broader Storage runtime paths remain upstream-derived.

The benchmark now uses one selected SDK per fresh worker, balanced comparison
order and identical-source controls. A separate Node 24 server serves both client
runtimes. These thirteen CPU/localhost workloads include warm client construction,
handles, real RSA signing, four independently known CRC32C workloads, metadata/listing and integrity-
checked 64 KiB transfers. Historical shared-process recordings remain in Git history.

## Independent CRC32C engine

`crc32c.cjs` runs the original and VPM clients in separate processes and compares
260 byte lengths, five chunkings, resumed checksums and real files with a simple
bit-at-a-time reference. It checks known vectors, input preservation, cross-realm
and sliced views, base64 compatibility, missing-file errors and the public
validator interface. Original controls reproduce corruption after public table
mutation and delayed serialization failures for accepted numeric seeds. VPM uses
private derived slicing tables, normalizes signed/unsigned 32-bit seeds and rejects
out-of-range seeds at construction. The broader bucket/file and signing runtime
is still retained; this checksum rewrite does not imply those paths are rebuilt.

## Independent save orchestration

`lib/save.js` owns option/byte snapshots, per-upload retries, callback settlement
and stream completion. Multipart orchestration is independently implemented; authenticated dispatch and resumable protocol remain retained.
Seven tests include original/VPM controls for shared retry state, mutable payloads
and duplicate callbacks, plus factories, progress and premature closure. The HTTP
control holds a non-idempotent upload open while a conditional upload receives
503: original code prevents its retry; VPM keeps the retry independent.

```sh
node --test packages/vgoogle-cloud-storage/test/save.test.cjs
bun test packages/vgoogle-cloud-storage/test/save.test.cjs
node scripts/storage-conformance/save.cjs
bun scripts/storage-conformance/save.cjs
```

[Focused save measurements](../../packages/vgoogle-cloud-storage/bench/save-results/README.md)
use the isolated harness and preserve all results. Earlier whole-client and
Firebase consumer reports are historical after this source change.

## Independent upload stream

`lib/upload-stream.js` now owns `File.createWriteStream()` option snapshots,
lazy setup, gzip/hash pipelines, cancellation and response-metadata completion.
Multipart orchestration is independently implemented; authentication dispatch and resumable protocol remain retained. Eight focused
groups preserve normal/empty/gzip/partial/resumed uploads, checksums and deletion
errors, prove backpressure with a slow sink, and reproduce original frozen-option,
post-cancellation upload and missing-metadata hang failures.

```sh
node --test packages/vgoogle-cloud-storage/test/upload-stream.test.cjs
bun test packages/vgoogle-cloud-storage/test/upload-stream.test.cjs
```

The existing 25-request HTTP callers, concurrent-save control and 110 original
signing/checksum/helper tests pass on Node 24 and Bun. [Stream measurements](../../packages/vgoogle-cloud-storage/bench/stream-results/README.md)
cover construction, pipeline overhead and real local multipart uploads. The earlier
save report predates this pipeline change; its raw source hashes remain available.

## Independent multipart upload adapter

`lib/simple-upload.js` replaces request planning, progress and settlement beneath
`startSimpleUpload_`. Five groups and a real HTTP control compare original/VPM
query precedence, frozen inputs, binary progress, duplicate/late replies and
cancellation across authentication. The original opens a late HTTP request on
both runtimes; VPM's abort signal prevents it. Auth, customer-supplied encryption
headers and request interceptors remain supported. VPM teeny-request streams MIME
framing; authenticated dispatch and resumable protocol are retained.

```sh
node --test packages/vgoogle-cloud-storage/test/simple-upload.test.cjs
bun test packages/vgoogle-cloud-storage/test/simple-upload.test.cjs
node scripts/storage-conformance/multipart.cjs
bun scripts/storage-conformance/multipart.cjs
```

The existing 25-request HTTP suite, concurrent-save control and 110 original tests
also pass. [Multipart measurements](../../packages/vgoogle-cloud-storage/bench/multipart-results/README.md)
retain request-planning costs and whole-stack local upload comparisons. The stream
report now predates this adapter and is historical.
