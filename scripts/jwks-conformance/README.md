# JWKS compatibility fixture

Runs the 88 JavaScript tests from `auth0/node-jwks-rsa` v3.2.2 against `vjwks-rsa`.
The source archive is pinned to commit
`67f55ff7d72e810f6d0e4d9d9c5d217140d44872`; its SHA-256 is recorded in
[provenance](../../packages/vjwks-rsa/PROVENANCE.json) and verified before use.
Every archived runtime source file must also match the installed npm 3.2.2 copy
before the runner substitutes VPM entry points in a temporary extraction.

```sh
npm --prefix scripts/consumers ci --ignore-scripts
npm --prefix scripts/jwks-conformance ci --ignore-scripts
node scripts/jwks-conformance/run.cjs --upstream
node scripts/jwks-conformance/run.cjs
bun scripts/jwks-conformance/run.cjs
```

All 88 cases pass on Node 24 and Bun without skips. The one expectation change is
the request timeout code: VPM reports `ETIMEDOUT` instead of upstream's incidental
`ECONNRESET`. The runner requires the full test count, zero failures and zero
pending tests. `OUTPUT=/path/to/report.json` retains the Mocha report.

The suites cover cache, rate limiting, interception, requests and actual Express,
Passport and Koa middleware consumers. The upstream TypeScript test file is not
run by this JavaScript suite; VPM's focused tests separately cover Hapi, and its
public declarations compile through TypeScript 7 and the installed-archive gate.

The separately locked upstream tools and middleware here are comparison evidence.
They are outside the workspace and excluded from installable VPM packages.
No compiler is installed by this fixture. The source archive preserves the
upstream MIT license and original tests. Temporary extractions are removed after
each run. Mocha exits explicitly because the original middleware tests leave
listening servers open, matching upstream's test command.
