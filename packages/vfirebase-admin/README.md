# vfirebase-admin

An independently implemented Firebase Admin runtime for the APIs VentiMath uses,
matching **firebase-admin 14.5.0** (checked November 3, 2026). Node 24+ and Bun.
Its direct and optional runtime dependencies are VPM packages.

## Supported scope

| Entry point | Implemented API |
| --- | --- |
| `/app` and root | App initialization, lookup, deletion, ADC, certificate and refresh-token credentials |
| `/auth` | `verifyIdToken`, `getUser`, `updateUser`, `revokeRefreshTokens`, `deleteUsers`, paginated `listUsers` |
| `/firestore` | Default/named database factories, settings/credential ownership, exported Firestore types and values |
| `/storage` | App-scoped Storage client, buckets and download URLs |
| `/messaging` | `send`, `sendEach`, `sendEachForMulticast`, token/FID topic operations and legacy transport selection |
| `/app-check` | Signed token verification and optional replay-protection consumption for callable functions |

The application scope is complete. The Auth list includes the identity-audit
tool's paginated user scan, alongside production authentication and user-lifecycle
operations. Firestore and Storage delegate database/object operations to
`vgoogle-cloud-firestore` and `vgoogle-cloud-storage`. Their implementation status,
and that of `vgoogle-auth-library`, are tracked separately.

Unused provider implementations and their exports have been removed: Realtime
Database, Cloud Tasks, Remote Config, Eventarc, Extensions, Data Connect, Machine
Learning, Installations, project management, security rules and phone verification.
Auth token minting, session-cookie APIs, user creation/import, tenant/provider
configuration and App Check token minting are outside this package's current
scope. They are not advertised by its public declarations.

## What changed

The runtime owns app/service/token lifetimes, credential snapshots and transport,
Auth endpoint validation and user-record projection, request authorization,
HTTP/1 and HTTP/2 retry/response handling, signing-key caches, service entrypoints,
Messaging serialization/dispatch, and App Check policy. No copied provider runtime
remains behind the supported surface. Public declarations, protocol names and
error-code/diagnostic tables retain Apache-licensed upstream attribution.
This is source-informed work, not a clean-room claim.

Correctness improvements include bounded/cycle-aware input snapshots, own-key
handling, ordered and validated batch results, shared concurrent key retrieval,
valid HTTP/2 `:scheme` values and per-client Storage emulator routing. App Check
captures `consume` before asynchronous verification, so callers cannot change
replay-protection policy mid-request. Malformed replay responses, scalar custom
claims and malformed provider records produce structured SDK errors. User-list
page sizes must be integers from 1 through 1000; upstream also accepts fractions.

Multipart response parsing and raw multipart helpers are absent. No supported
Admin API reads those responses; an unexpected multipart response rejects
explicitly. There is no `busboy` or Realtime Database dependency.

## Evidence

[Conformance controls](../../scripts/firebase-admin-conformance/README.md) include
**1,801 unchanged upstream assertions selected for the supported API**, run against
both implementations. Node's upstream control passes all 1,801; VPM passes 1,754
with 47 exact existing differences: 39 HTTP/2 scheme assertions, seven multipart
assertions and one process-global Storage emulator mutation. Bun adds six
readonly-property diagnostic differences shared by both implementations.

Additional controls compare 17 Auth/Storage/FCM requests, 25 Firestore RPCs and 17
results against local servers; verify real signed App Check tokens and replay
requests; and exercise 292 Auth validation cases plus ownership/malformed-input
regressions. Tests also cover credential transport, token revocation, response
truncation, retries, Messaging batches and service cleanup. Clean npm/Bun archives
check CJS, ESM and TypeScript 7 on both runtimes.

[Closeout measurements](bench/completion-results/README.md) use fresh processes,
balanced order and identical-code controls. They measure construction, validation
and cached-key signature verification, not network latency or application speed.
Auth construction takes 61.8% less time on Node and 48.9% less on Bun;
the common disable-user validator takes 25.8% and 75.4% less. Cached-key App Check
verification takes 42.1% and 23.2% less. Remaining costs are explicit: richer
profile validation is 538 → 814 ns on Node and 426 → 562 ns on Bun; App Check
construction is 712 → 1,623 ns and 541 → 1,180 ns. These are local CPU timings.

Earlier measurements describe their recorded source snapshots and remain in
repository history and the other benchmark folders.

## Consumption status

Built and tested; this completion is not a release or an application cutover.
VentiMath's checked main commit `7a8aad2c` still declares Admin `^12.7.0` and uses
some `admin.auth()`, `admin.firestore` and `admin.messaging()` namespace imports.
Admin 14 removed those namespaces. Adoption requires converting those imports to
`/auth`, `/firestore` and `/messaging`; this package exposes their modular APIs.
No application deployment or registry publication is implied by version 14.5.0.
