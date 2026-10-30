# JWKS compatibility fixture

Runs all **96 JavaScript tests from jwks-rsa 4.1.0** and the retained **88 tests
from 3.2.2**, on Node 24 and Bun, against both VPM and the unmodified upstream
packages. The source archives are pinned by commit and SHA-256 in
[provenance](../../packages/vjwks-rsa/PROVENANCE.json). Every archived runtime
source file must match its installed npm counterpart before substitution.

The runner redirects the client, factory, request wrapper and current key utility
to the selected implementation in a temporary extraction. No tests are skipped.
The sole VPM expectation adaptation is `ETIMEDOUT` instead of the incidental
upstream `ECONNRESET` timeout code. Reports require the exact case count, zero
failures and zero pending tests; `OUTPUT=/path/to/report.json` retains a report.

```sh
npm --prefix scripts/consumers ci --ignore-scripts
npm --prefix scripts/jwks-conformance ci --ignore-scripts
node scripts/jwks-conformance/run.cjs
node scripts/jwks-conformance/run.cjs --upstream
node scripts/jwks-conformance/run.cjs --legacy
node scripts/jwks-conformance/run.cjs --legacy --upstream
node scripts/jwks-conformance/callers.cjs
node scripts/jwks-conformance/callers.cjs --upstream
node scripts/jwks-conformance/regressions.cjs
```

Run the same seven checks with `bun`; CI runs both runtimes. Middleware fixtures
retain Express/Passport/Koa consumers. The archived TypeScript test file is not
part of the JavaScript runner; VPM's focused Hapi tests and public declaration /
installed-archive gates cover those surfaces separately with TypeScript 7.

`callers.cjs` loads Firebase Admin **14.5.0** with only its JWKS import replaced.
It asserts five observed JWKS calls and the real client's options, then checks
RSA/EC signatures, missing and unknown IDs, signature corruption, token expiry,
the SDK's six-hour cache, forced rotation/removal, and outage recovery. The real
App Check verifier checks signed claims, audience and mapped errors against an
intercepted Google JWKS endpoint. Other requests are limited to a local HTTP
server; no credentials or live Google service are used. Firebase Auth certificate
retrieval does not use jwks-rsa and is not claimed as JWKS coverage.

`regressions.cjs` advances wall and monotonic clocks inside its own standalone
process and restores them afterward. The stock 4.1.0 control serves a stale key
past its original fallback deadline because it caches that result as fresh.
VPM reattempts the refresh and rejects at the original deadline. Real timers
remain active, including the upstream LRU's 1 ms clock sampling interval.

The fixture is outside the workspace and excluded from installable packages.
Its locked upstream libraries, type dependencies and SDKs are comparison tools.
Archives preserve the upstream MIT license. Extra sources are extracted only in
a temporary directory. Mocha exits explicitly because the original middleware
tests leave listening servers open, matching upstream's test command.
