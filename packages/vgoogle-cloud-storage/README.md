# vgoogle-cloud-storage

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
- CRC32C initialization respects the offset and length of typed-array/DataView
  slices instead of reading the entire backing buffer.
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

The complete published SDK implementation and public declarations are retained.
Independent verification focuses on backend object uploads, signed URLs,
listings, existence checks and deletion, plus local-file uploads and bucket
creation. Retaining the broader API does not certify every SDK operation.

Checks on Node 24 and Bun cover:

- 110 retained upstream signer, CRC32C and lazy-import tests, with documented
  fixture adaptations and original-upstream controls.
- Nine focused tests, five paired regression probes, ordinary V2/V4 URL parity,
  and independently verified RSA signatures for corrected canonical requests.
- 25 real local HTTP requests per caller run: binary multipart and resumable
  uploads, download integrity, automatic/manual/streamed pagination, callbacks,
  cleanup, checksum failure deletion and transient retries.
- Firebase Admin 12.7.0's actual Storage factory and signed-URL path using this
  client. This is selected caller coverage, not a claim of complete compatibility
  with every version of Firebase Admin or Storage 7.
- Packed npm/Bun installations, both module systems, and public type consumers.

These checks require no cloud credentials and perform no live cloud operations.
Cloud IAM, production service behavior, browser bundles and unlisted SDK methods
have not been independently verified. [Fixtures and commands](../../scripts/storage-conformance/README.md).

## Performance

[Measurements and methodology](bench/results/README.md) compare the full client
against Storage 8.4.0, including actual RSA signing and localhost transfers with
checksum validation. They do not predict cloud request latency.

## Provenance

Derived from Google's Apache-2.0 implementation at
[storage-v8.4.0](https://github.com/googleapis/google-cloud-node/tree/27d6be61e43e2f54a78ffc78e141f79471848623/handwritten/storage).
[PROVENANCE.json](PROVENANCE.json) records the exact source and npm integrity.
Original notices and the [license](LICENSE) are retained. Hash-pinned published
files and selected upstream tests are kept in the development fixture.
