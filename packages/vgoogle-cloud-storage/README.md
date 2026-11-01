# vgoogle-cloud-storage

**Implementation status:** endpoint selection, per-client emulator context,
CRC32C, hash-stream validation, V2/V4 URL signing, File.save and createWriteStream orchestration have
independent VPM implementations. Remaining bucket/file operations, upload/download
transport and signed POST policies
retain upstream runtime code with focused changes. Rewriting those
application-facing paths is still pending.
[Provenance](PROVENANCE.json) records this boundary.

Google Cloud Storage client built on VPM packages. The API starts from
**@google-cloud/storage 8.4.0**, with stricter signed-URL handling and corrected
CRC32C initialization from sliced byte views. Supports Node 24+ and Bun.

```js
import {Storage} from 'vgoogle-cloud-storage';

const storage = new Storage({projectId: 'your-project'});
const bucket = storage.bucket('your-bucket');
const file = bucket.file('reports/example.pdf');

await file.save(pdfBytes, {resumable: false, contentType: 'application/pdf'});
const [url] = await file.getSignedUrl({
  action: 'read', version: 'v4', expires: Date.now() + 15 * 60 * 1000,
});
```

CommonJS exposes the same classes through `require('vgoogle-cloud-storage')`.
Use normal Google authentication configuration; signed URLs require credentials
capable of signing. V2 remains the default signing version for compatibility;
V4 signatures expire within seven days.

## Changes

- `File.save` captures plain option records and Buffer/Uint8Array payloads before
  asynchronous work. Mutating caller metadata or bytes cannot alter the captured
  upload; each retry gets its own option record. This intentionally copies byte
  payloads, adding allocation proportional to their size. Source factories remain
  caller-owned and must produce a fresh stream on each retry.
- Each save owns its retry configuration. A non-idempotent write cannot disable
  retries on another write using the same Storage client. Invalid contexts settle
  once without starting an upload; premature stream closure rejects instead of
  leaving the operation pending. Promise/callback/progress APIs are preserved.
  One-shot streams are not replayed, and uploads with retries disabled avoid
  allocating a retry operation. The existing multipart/resumable transport and
  direct `createWriteStream` API remain retained code; this rewrite does not claim
  per-operation isolation for every SDK method.

- Endpoint configuration belongs to each client. `apiEndpoint` overrides an ambient
  emulator for both metadata and uploads; the two routes cannot silently select
  different servers. `emulatorHost` is an optional VPM-specific constructor option
  for a client-local emulator, mutually exclusive with `apiEndpoint`.
- Emulator clients retain their endpoint and signed-form bucket routing when
  environment variables change. The captured `emulatorHost` property is read-only.
  `STORAGE_EMULATOR_HOST` remains a default when neither explicit option is set;
  client construction does not write that variable.
- Endpoint normalization recognizes the default Google endpoint despite casing or
  trailing slashes, preserving authentication. Only HTTP(S) endpoints without
  credentials, query strings or fragments are accepted; bare hosts default to HTTPS.

- All 13 production dependencies are VPM packages. The unused `abort-controller`
  dependency is removed; resumable uploads use the runtime's `AbortController`.
- SHA-256 signing headers require exactly 64 hexadecimal digits. Upstream accepts
  a 40-digit substring instead, which can produce an invalid signed request.
- Caller query parameters cannot overwrite generated authentication/signature
  fields. Header names and values are checked before signing; invalid actions
  and headers settle both callback and promise APIs.
- Header normalization merges case variants, omits undefined values consistently,
  trims values, collapses spaces/tabs and snapshots caller records before awaits.
  Nondefault host ports remain in the canonical request.
- CRC32C uses an independently implemented streaming engine with private, derived
  Castagnoli tables. Mutating exported inspection tables cannot corrupt checksums.
  Signed or unsigned 32-bit seeds normalize before serialization; out-of-range
  seeds fail immediately. Chunking and resumed checksums preserve the wire format.
  Initialization respects typed-array/DataView offsets, including cross-realm
  views; upstream base64 decoding remains compatible.
- The hash Transform exposes non-destructive in-progress MD5 snapshots and caches
  the final digest. It hashes each chunk before emission and validates every enabled
  checksum independently; MD5 success cannot hide a CRC failure. Every enabled
  hash needs an expected value unless `updateHashesOnly` is enabled. Custom CRC
  providers, original chunk identity and backpressure are preserved.
- URL signing captures the destination, resource names, dates, query values,
  signing endpoint and authentication provider before asynchronous work. Changing
  destination options or replacing the signer’s provider cannot redirect an
  active signing operation. Query getters
  are read once and the captured fields are validated. Private V4 preparation
  accepts frozen configuration without mutating its Date.
- CJS and native ESM entry points share class identities. Export enumeration
  ignores inherited properties. Public declarations are
  self-contained and do not install ambient Node declarations.

Dependencies: `vasync-retry`, `vduplexify`, `vfast-xml-parser`, `vgaxios`,
`vgoogle-auth-library`, `vhtml-entities`, `vmime`, `vp-limit`, `vpaginator`,
`vprojectify`, `vpromisify`, `vretry-request`, and `vteeny-request`.

These foundations target current upstream releases. In particular, the transport
uses gaxios 8.3.2/auth 11.3.2-compatible VPM implementations, and MIME lookup uses
[mime 4.1.2 data and behavior](../vmime/README.md) instead of Storage's mime 3.
That can change inferred content types; pass `contentType` when its exact value is
part of your application contract.

## Verified scope

The broader published SDK implementation and public declarations are retained;
endpoint configuration, CRC32C, hash streams, V2/V4 URL signing, File.save and createWriteStream
orchestration are independently implemented.
Independent verification focuses on backend object uploads, signed URLs,
listings, existence checks and deletion, plus local-file uploads and bucket
creation. Retaining the broader API does not certify every SDK operation.

Checks on Node 24 and Bun cover:

- 110 retained upstream signer, CRC32C and lazy-import tests, with documented
  fixture adaptations and original-upstream controls.
- Thirty-six focused tests, five paired regression probes, ordinary V2/V4 URL parity,
  and independently verified RSA signatures for corrected canonical requests.
- CRC32C controls compare 260 lengths, five chunkings, resumed seeds and real
  files against an independent bit-at-a-time oracle. Upstream controls reproduce
  table-mutation and numeric-seed failures, alongside sliced-view regressions.
- Six hash-stream groups include original/VPM fault controls, non-destructive MD5
  snapshots, simultaneous checksum failures, custom provider errors and real
  backpressure pipelines.
- Five signer groups reproduce original destination/provider mutation failures,
  check query getter and frozen-date handling, and verify app-used V2/V4 download
  URLs independently with RSA public keys.
- Seven save groups cover original mutable-payload, shared-policy and duplicate-
  callback failures, retries, factories, progress and premature closure. A paired
  real HTTP control holds a non-idempotent upload open while another upload
  receives 503: VPM preserves the conditional upload's retry; original code does not.
- 25 real local HTTP requests per caller run: binary multipart and resumable
  uploads, download integrity, automatic/manual/streamed pagination, callbacks,
  cleanup, checksum failure deletion and transient retries.
- Firebase Admin 12.7.0's actual Storage factory and signed-URL path using this
  client. This is selected caller coverage, not a claim of complete compatibility
  with every version of Firebase Admin or Storage 7.
- Firebase Admin 14.5.0 context controls against two real servers: metadata,
  uploads, download URLs, V2/V4 signatures, independently verified V4 signed forms,
  explicit/ambient endpoint precedence and client isolation.
- Packed npm/Bun installations, both module systems, and public type consumers.

These checks require no cloud credentials and perform no live cloud operations.
Cloud IAM, production service behavior, browser bundles and unlisted SDK methods
have not been independently verified. [Fixtures and commands](../../scripts/storage-conformance/README.md).

## Upload stream ownership

`File.createWriteStream()` now captures plain options/metadata and owns lazy MIME
setup, gzip/checksum pipelines, backpressure and completion. Frozen options are
accepted without mutation. Destroying a stream during MIME resolution cannot
start an upload afterwards. Successful completion waits for response metadata;
transport closure without that metadata rejects with `ERR_STREAM_PREMATURE_CLOSE`
instead of leaving `finish` pending. Cancellation removes owned listeners.
Partial/resumed uploads and existing checksum/deletion failure codes remain covered.

Eight focused groups reproduce the original failures and verify normal/empty,
compressed, partial and resumed uploads, slow-sink backpressure and error identity
on Node 24 and Bun. The existing 25-request HTTP suite and concurrent-save control
also pass. Lower multipart/resumable transport and other SDK operations remain
retained upstream code; this is still a partial independent rewrite.

## Performance

[Current upload-stream measurements](bench/stream-results/README.md) separate stream
construction, in-memory pipeline completion and real localhost multipart uploads
with CRC32C. Four balanced process pairs and two identical-source controls retain
all samples. Both runtimes use the same separate Node 24 HTTP server. The local
HTTP case includes the entire VPM client dependency stack; it does not isolate
this component or establish cloud latency or production throughput.

Node's 64 KiB local upload uses 43% less paired time. Bun's observed 57%
reduction is inconclusive against its noisy identical-source controls. Construction
and immediate destruction are slower: 4.69 versus 1.87 µs on Node and 1.42 versus
0.81 µs on Bun, including option snapshots and lifecycle ownership. Node's
construction result is strongly order-sensitive, and synthetic pipeline results
are inconclusive. These costs and all raw samples are retained.

[Previous save measurements](bench/save-results/README.md) and
[earlier client measurements](bench/results/README.md) predate the new upload
pipeline. Their raw samples and source hashes remain historical evidence.

## Provenance

Derived from Google's Apache-2.0 implementation at
[storage-v8.4.0](https://github.com/googleapis/google-cloud-node/tree/27d6be61e43e2f54a78ffc78e141f79471848623/handwritten/storage).
[PROVENANCE.json](PROVENANCE.json) records the exact source and npm integrity.
Original notices and the [license](LICENSE) are retained. Hash-pinned published
files and selected upstream tests are kept in the development fixture.
