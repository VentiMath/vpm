# vgoogle-cloud-storage

Independently implemented object storage for the APIs VentiMath uses, targeting
**@google-cloud/storage 8.4.0** on Node 24+ and Bun. The remaining copied SDK
runtime has been replaced; this package has six VPM runtime dependencies.
[Provenance](PROVENANCE.json) records the implementation and attribution boundary.

```js
import {Storage} from 'vgoogle-cloud-storage';
const storage = new Storage({projectId: 'your-project'});
const file = storage.bucket('your-bucket').file('reports/example.pdf');
await file.save(pdfBytes, {resumable: false, contentType: 'application/pdf'});
const [url] = await file.getSignedUrl({
  action: 'read', version: 'v4', expires: Date.now() + 15 * 60 * 1000,
});
```

CommonJS exports the same classes. Normal Google authentication configuration
is supported; signing needs credentials capable of signing. V2 remains the
URL signing default; V4 signatures expire within seven days.

## Supported API

- `Storage`: construction, `bucket`, `getProjectId`, `createBucket`, request dispatch.
- `Bucket`: `file`, metadata read/update, existence/deletion/creation, local-file
  upload, automatic/manual/streamed object listing.
- `File`: `save`, `createWriteStream`, resumable session creation, metadata
  read/update, existence/deletion, `download`, `createReadStream`, `publicUrl`,
  V2/V4 signed URLs, V4 signed POST forms and customer-supplied encryption keys.
- Promise and callback forms, per-operation preconditions/billing, upload
  progress, gzip, CRC32C/MD5 integrity checks and custom CRC providers.

ACL/IAM administration, HMAC keys, notifications, channels, TransferManager,
object copy/move/compose and other unlisted SDK operations are **not implemented**.
Their retained code and declarations have been removed. The matching version
identifies the API baseline; it does not claim complete SDK coverage. This change
finishes the app-used VPM implementation; it does not migrate or deploy VentiMath.

## Correctness and ownership

Requests capture options and their destination before asynchronous authentication.
Interceptors and auth headers remain supported; cancellation during credential
lookup cannot start a late request. Only replayable, idempotent requests retry.
Saves capture byte payloads and metadata, and concurrent uploads do not share
mutable retry settings. One-shot streams are not replayed. A byte payload copy
costs memory proportional to its size; source factories must produce fresh streams.

The resumable protocol buffers chunks (8 MiB by default), uses explicit byte
positions, validates acknowledgements and probes persisted position before replay
after a transient failure. Empty, partial and continued uploads are supported.
Chunk size must be a positive multiple of 256 KiB. Continued uploads require a
session URI; final CRC-validated continuation also needs `resumeCRC32C`. Session
URIs must use the configured endpoint's origin. Invalid acknowledgements and
repeated listing tokens fail instead of silently skipping data or looping.

Download streams start on consumption, preserve backpressure, validate wire
checksums before gzip decompression, and cancel their HTTP request when destroyed.
Range downloads disable implicit checksum validation; explicitly combining a
range and checksum validation rejects. Custom hash-provider exceptions propagate.

Signing captures inputs before credential lookup. Reserved query fields cannot
overwrite signatures. SHA-256 headers require exactly 64 hex digits; canonical
headers merge case variants, normalize whitespace and preserve host ports.
V4 POST fields and conditions are also captured before asynchronous signing.
CRC32C uses private derived tables, respects byte-view bounds and normalizes seeds;
MD5 digest inspection does not finalize an active hash stream.

`apiEndpoint` overrides ambient emulator settings for metadata and uploads.
The VPM-specific `emulatorHost` option provides a per-client emulator instead;
the two options are mutually exclusive. Neither writes the process environment.
Clients retain captured endpoint and form-routing behavior when the environment
changes. Default Google endpoints preserve authentication after normalization.

Dependencies: `vasync-retry`, `vduplexify`, `vgoogle-auth-library`, `vmime`,
`vp-limit`, `vteeny-request`. MIME inference uses mime 4.1.2-compatible data;
set `contentType` when exact inference is part of your application contract.
Public declarations do not install ambient Node types.

## Verification

Node 24 and Bun checks include 110 retained upstream signer/checksum/helper tests
(with [documented adaptations](../../scripts/storage-conformance/README.md)),
50 focused groups, paired regression controls, independent RSA verification,
real local HTTP upload/download/listing/deletion scenarios and Firebase Admin
12.7.0 and 14.5.0 caller/context controls. Packed npm/Bun installations verify
CJS, ESM and TypeScript 7 consumers. Interrupted uploads are checked against a
server that persists only part of a chunk before returning an error.

These fixtures need no cloud credentials. They do not establish live cloud IAM,
production service behavior, browser support or compatibility with unlisted APIs.

## Performance

[Current complete-client measurements](bench/client-results/README.md) use fresh
isolated processes, balanced ordering and identical-source controls on Node 24
and Bun. They include construction, signing, checksums and local HTTP metadata,
listing, upload and download work. The HTTP timings measure the full dependency
stack, not this package alone, and do not establish production cloud latency.

In the current recording, multipart uploads take 42% less time on Node and 63%
less on Bun; resumable uploads take 46% and 53% less. Normal client construction
and bucket/file handles also improve. Custom-endpoint construction costs 13%
more on Node; canonical signing-header work costs 69%/74% more on Node/Bun
(0.96/0.63 µs). Full RSA signing, metadata and download timings are inconclusive
under the identical-source controls. All results, including costs and uncertainty,
remain in the report; this is not a universal speedup claim.

[Multipart](bench/multipart-results/README.md), [stream](bench/stream-results/README.md),
[save](bench/save-results/README.md) and [earlier client](bench/results/README.md)
reports describe earlier implementations and remain historical evidence.

## Attribution

The public contracts were studied from Google's Apache-2.0
[Storage 8.4.0 source](https://github.com/googleapis/google-cloud-node/tree/27d6be61e43e2f54a78ffc78e141f79471848623/handwritten/storage).
Selected structural checksum/signer declarations and diagnostic strings retain
upstream provenance. Original notices and the [license](LICENSE) remain;
hash-pinned upstream sources and tests live in development fixtures.
