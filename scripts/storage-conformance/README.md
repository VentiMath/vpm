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

The package's nine root tests add independent V2/V4 signature verification,
callback error cases, immutable inputs, asynchronous snapshotting and module
identity checks. Broader retained SDK operations and real IAM/cloud integration
remain outside this selected verification scope.
