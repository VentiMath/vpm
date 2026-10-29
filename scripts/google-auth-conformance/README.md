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

All 545 selected tests pass on Node 24 and Bun, both for VPM and the upstream
control. Selected suites cover GoogleAuth, AuthClient, Compute, crypto, IAM, ID-token
clients, impersonation, JWT/JWTAccess, login tickets, OAuth2 and its shared helpers,
pass-through and refresh clients, package exports, utilities and all seven
internal GoogleToken suites. Dedicated AWS, workload identity, downscoping,
executable-provider and other external-provider suites are retained as source
references but are not run or claimed as verified. No live cloud account is used.

Fixture corrections applied to both implementations:

- Compile mutable/callable CommonJS namespace imports with `import = require` so
  Sinon can stub the same Node/module objects under TypeScript 7.
- Use pinned Nock 14 for native-fetch interception and Sinon 21. Nock plain-object
  network errors become equivalent Error objects for its fetch interceptor.
- Restore the three fixture symlinks from their Git targets in temporary copies.
- Generate canonical Base64url JWTs instead of padded standard-Base64 tokens.
  The expired-token case gets an issue time preceding its expiry, keeping the
  original expiration assertion meaningful under stricter lifetime validation.

VPM-only expectations are explicit in `adapt.cjs` and `run.cjs`: opaque cache-key
format, static debug messages without payloads, a combined malformed-JWS error,
and POST-body revocation. No selected tests are skipped. Additional VPM tests in
`packages/vgoogle-auth-library/test` cover the intentional correctness changes.

The unused upstream `aws-security-credentials-fake.json` fixture is omitted: its
AWS-shaped sample credentials trigger GitHub push protection. It is not required
by any selected suite. Distributed source files retain their original hash checks.
