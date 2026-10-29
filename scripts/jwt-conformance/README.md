# JWT conformance fixture

The retained `jsonwebtoken` 9.0.3 source archive provides the original 512-case
suite and test keys. It is checked against the archive SHA-256 in
[provenance](../../packages/vjsonwebtoken/PROVENANCE.json); all runtime JavaScript
files matched the npm 9.0.3 baseline when captured. Test keys are public fixtures,
not production credentials. Test tools stay isolated here and are never shipped
in VPM package archives. Sinon 6 matches the upstream suite's nested fake clocks.

From the repository root:

```sh
npm --prefix scripts/consumers ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/jwt-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/jwt-conformance/run.cjs --upstream
node scripts/jwt-conformance/run.cjs
bun scripts/jwt-conformance/run.cjs --upstream
bun scripts/jwt-conformance/run.cjs
```

The runner extracts into a disposable directory, leaves the retained archive
unchanged, and selects upstream or VPM through module entry shims. Independent
upstream `jws` constructs the suite's tokens. The internal asymmetric validation
tests are routed to VPM's key validator as well as testing the public JWT API.

[Explicit adaptations](adapt.cjs) change eleven VPM expectations: nine upstream
TODOs accepting non-finite NumericDates now require rejection; object JSON uses
UTF-8 even with a binary encoding option; and signing `none` with a supplied
secret fails. VPM also enables the original skipped unsigned callback test.

Node: upstream 511 passed/one pending; VPM 512 passed/none pending. Bun: upstream
508 passed/four pending; VPM 509 passed/three pending. Bun cannot import the
restricted RSA-PSS fixtures, so their three tests stay registered as pending on
both sides. Ordinary RSA keys with PSS signatures are exercised. Bun also rejects
the source fixture's explicit-parameter EC public encodings; the runner uses Node
to re-encode the same public points as named-curve SPKI for both implementations,
without changing assertions or signing keys. Native Node must therefore be
available when running the Bun suite. The package itself requires no Node child
process and performs no such conversion.

Set `OUTPUT=/absolute/path/report.json` to retain a full Mocha report. No test body
is silently discarded, and the baseline runs independently of VPM replacements.
