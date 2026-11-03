# Google Auth conformance

Hash-pinned test sources from `google-auth-library` 11.3.2, at
`googleapis/google-cloud-node` commit
`cb723569f62de17cb07011e806981b64e80efe3d`. Sources retain Google's Apache-2.0
license. TypeScript files are stored as `.ts.txt` so workspace test discovery does
not accidentally run upstream suites against the wrong package.

The runner uses the existing, separately locked development tools in
[`../google-http-conformance`](../google-http-conformance/README.md). It does not
add upstream runtime dependencies to VPM packages. TypeScript 7 compiles temporary
copies; fixture hashes are verified before any adaptations. The upstream control
uses the same runtime and fixture corrections while retaining upstream behavior.

```sh
npm --prefix scripts/google-http-conformance ci --ignore-scripts
node scripts/google-auth-conformance/run.cjs
node scripts/google-auth-conformance/run.cjs --upstream
bun scripts/google-auth-conformance/run.cjs
bun scripts/google-auth-conformance/run.cjs --upstream
```

The default runner executes `application.cjs` against both the independent VPM
implementation and upstream 11.3.2. These public-API checks use generated fixture
keys and local servers: ADC discovery, project/quota handling, service-account
and refresh exchanges, concurrent requests, callbacks, metadata, identity tokens,
impersonation and signing. Cache isolation and query-encoded Compute audiences
are explicit VPM corrections, with controls demonstrating the upstream behavior.
External credential providers are not part of this application contract.

`--upstream` runs the retained 545-test suite against **upstream only** on Node 24
and Bun. It covers the historical internal classes and file layout as reference
evidence, not independent-implementation conformance. Its fixture adaptations
preserve callable CommonJS namespaces under TypeScript 7, use pinned Nock 14 and
Sinon 21, restore fixture symlinks, and generate canonical Base64url JWTs with
valid issuance/expiry ordering. No selected control tests are skipped. Historical
VPM adaptations remain in `adapt.cjs` as audit evidence; the independent runtime
is tested through public contracts instead of those private modules.

Twenty-eight focused tests in `packages/vgoogle-auth-library/test` cover cache and
credential rotation, refresh failures, malformed token/expiry rejection, stream
non-replay, header isolation, log privacy and explicit unsupported providers.
Separate Firebase Admin, Storage and Firestore/GAX caller gates exercise this
package in the SDK stack. No live cloud account is used.

The unused upstream `aws-security-credentials-fake.json` fixture is omitted: its
AWS-shaped sample credentials trigger GitHub push protection. It is not required
by any selected suite. Distributed source files retain their original hash checks.

The universe-discovery regression compares the original and VPM with failing
credential discovery: both return the default domain, retain explicit settings,
recover on a later lookup and reject credential-dependent requests. The full
`integration-offline.cjs` gate uses an empty ADC directory and a local 404 metadata
server so local developer credentials cannot hide missing-credential failures.
