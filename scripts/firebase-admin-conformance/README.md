# Firebase Admin application conformance

The current gate selects **1,801 upstream 14.5.0 tests**, using
[application-specs.json](application-specs.json), for VentiMath's supported Admin
surface. Both the upstream control and VPM use the same suite selection, hooks
and assertions. Suite filtering runs before excluded provider hooks; no assertion
is rewritten. Archived test sources and their SHA-256 manifest are unchanged.

The selected Auth suite covers ID verification, lookup/update/revocation/batch
deletion and paginated users; App Check includes verification and replay
consumption. App, HTTP, JWT, Messaging, Firestore and Storage controls remain.
Unused providers and private raw-multipart helpers are excluded. Original Auth
configuration/import/signing classes listed in `fixtureOnlyModules` are test-input
tools only; none substitute for a supported implementation under test. The token
verifier tests use original signers to manufacture valid and invalid tokens.

Node control: 1,801 pass. VPM: 1,754 pass plus 47 exact pre-existing differences
(39 HTTP/2 `:scheme`, seven unsupported multipart responses, one Storage global
emulator mutation). Bun control: 1,795 pass plus six readonly diagnostic differences;
VPM: 1,748 pass plus those same six and the 47 VPM differences. Counts are gated.
The full original 6,146-test SDK suite remains runnable with
`node scripts/firebase-admin-conformance/run.cjs --upstream --all-upstream`.

`app-check.cjs` uses real signatures and local JWKS/replay HTTP endpoints, checking
audience/issuer/subject/expiry/signature failures, bearer authorization, replay
results, option mutation and malformed payloads. `update-schema.cjs` compares 292
validation cases and own-key handling. Explicit differences are structured errors
for scalar claims or malformed provider records and removal of prototype keys.
Wire comparisons omit undefined properties as JSON does. Listing rejects fractional
page sizes even though upstream's nominal integer check accepts them.

```sh
npm --prefix scripts/firebase-admin-conformance ci --ignore-scripts
node scripts/firebase-admin-conformance/run.cjs --upstream
node scripts/firebase-admin-conformance/run.cjs
bun scripts/firebase-admin-conformance/run.cjs --upstream
bun scripts/firebase-admin-conformance/run.cjs
node --test packages/vfirebase-admin/test/*.test.cjs
bun test packages/vfirebase-admin/test
```

The package [README](../../packages/vfirebase-admin/README.md) states the supported
API and Admin 12-to-14 consumer migration still required. No application code is
modified by these controls.

## Focused controls

| Control | Evidence |
| --- | --- |
| `callers.cjs` | 17 Auth/Storage/FCM requests, 25 Firestore RPCs and 17 results match through local servers |
| `regressions.cjs` | Concurrent key-fetch coalescing, actual HTTP/2 scheme behavior and lazy module loading |
| `app-lifecycle.cjs` | App registry, idempotent initialization, cleanup, token leases and option snapshots |
| `credentials.cjs`, `credential-transport.cjs` | Detached credentials, token validation, actual local OAuth/signing transport through the configured agent |
| `user-records.cjs` | 160 generated record projections, detached claims, deep input and prototype handling |
| `user-operations.cjs`, `auth-requests.cjs` | Lookup/update/revoke/delete wire data, input ownership, encoded paths and corrupt batch responses |
| `user-listing.cjs` | Real GET pagination and page-token encoding, integer limits, malformed responses and terminal pages |
| `token-verification.cjs`, `key-verification.cjs` | Signed Auth tokens, revocation, certificate/JWKS HTTP, immutable caches and cache lifetime |
| `app-check.cjs`, `update-schema.cjs` | Signed App Check/replay transport and 292 Auth endpoint validation comparisons |
| `http-transport.cjs`, `http-retry.cjs`, `authorized-headers.cjs` | Captured request bytes/headers, retries, timeout/truncation/decompression failures and authorization casing |
| `http2-transport.cjs`, `http2-session.cjs`, `http-response.cjs` | HTTP/2 request/session ownership, stream failures, response lengths and structured errors |
| `firestore-facade.cjs`, `storage-context.cjs` | Per-client configuration/credentials, named databases and independent emulator/download routing |
| `messaging-validation.cjs`, `messaging-send.cjs`, `messaging-response.cjs`, `messaging-topics.cjs` | Payload validation, ordered batches, service/session cleanup, malformed responses, topics and bounded concurrency |

The normal package tests invoke these controls. `scripts/check-media-archives.cjs`
checks packed CJS/ESM consumers and public declarations, including the narrower
exports and version 14.5.0. Release publication and application deployment are
outside these checks.

## Source evidence and measurements

The archived source comes from upstream commit
`50ab2502c1faaf0685891ee5087a20dfd20eba2a`. The tarball and per-file hashes,
retained declarations/diagnostics and independent runtime ownership are recorded
in [PROVENANCE.json](../../packages/vfirebase-admin/PROVENANCE.json).
`verificationHistory` preserves earlier broad-SDK and incremental results; those
counts are not the current shipping scope.

The [closeout benchmark](../../packages/vfirebase-admin/bench/completion-results/README.md)
measures Auth/App Check construction, update validation and real signature
verification with cached keys. Each implementation runs alone in a fresh process;
all samples and identical-source controls are retained. The initial schema
measurement identified repeated table allocations and general-path work for the
application's two-field disable/revoke request. The final recording follows their
removal and re-verification. Older reports describe their recorded source snapshots.
