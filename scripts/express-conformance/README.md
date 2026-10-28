# Express compatibility fixture

This isolated test project runs Express 5.3.0's upstream unit and example
acceptance suites against vexpress. It is outside the workspace and is excluded
from every runtime archive. Its npm dependencies are pinned test infrastructure
and original comparison implementations, not dependencies of vexpress.

```sh
npm --prefix scripts/express-conformance ci --ignore-scripts
node scripts/express-conformance/run.cjs
bun scripts/express-conformance/run.cjs
node scripts/express-conformance/run.cjs --upstream
node scripts/express-conformance/run.cjs --unadapted
bun scripts/express-conformance/run.cjs --upstream --all-runtime-tests
```

`--upstream` runs the original implementation and original assertions.
`--unadapted` runs vexpress with original assertions, intentionally exposing the
23 documented expectation differences. `--all-runtime-tests` re-enables six tests
that fail on Bun 1.4.0 with both implementations. `OUTPUT` writes the full Mocha
JSON report. Tests require local HTTP ports; the runner removes its temporary
checkout and uses bounded test/process timeouts. `--exit` ends the isolated test
process after Mocha completes; it is not a resource-leak test.

The compressed fixture contains unmodified package metadata, source, tests,
examples and LICENSE from Express commit
`cf6722bf89a86905281d9160b6482e08166b5ef0`. Its SHA-256 and the npm source's verified
SHA-512 are recorded in [vexpress provenance](../../packages/vexpress/PROVENANCE.json).
The runner redirects only the package entry and tests' private-utils import to
vexpress. `NODE_PATH` makes isolated template-engine dependencies visible.
The original source remains available inside the fixture and carries its MIT license.

[adapt.cjs](adapt.cjs) changes assertions for 23 existing VPM differences:

- Five strict JSON diagnostic expectations, four verify-option error messages,
  two static-root diagnostics, four form-limit diagnostics, two fractional-limit
  rejections, three cookie-option diagnostics and one Vary diagnostic.
- Two negotiation expectations: malformed `*/html` and the invalid quality value
  `.5` with no reverse language-prefix fallback. The former explicitly writes an
  empty string when negotiation returns false; Node tolerates `end(false)` but
  Bun does not.

Every source replacement checks its expected occurrence count. Tests are not
allowed to fail and errors are not swallowed. On Node 24, both the unmodified
upstream control and adapted vexpress run pass all 1,261 tests. The unadapted
vexpress run passes 1,238 and fails the 23 expectations listed above.

[runtime.cjs](runtime.cjs) marks six cases pending on Bun after reproducing the
same failures against unchanged Express: two overlong filesystem paths, three
non-chunked transfer-coding responses and one invalid newline-bearing header.
The remaining 1,255 pass against vexpress. This is an explicit runtime coverage
boundary; it does not claim those six behaviors are fixed.
