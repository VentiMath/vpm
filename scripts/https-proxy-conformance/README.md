# HTTPS proxy conformance fixture

Runs the 18 local tests from `https-proxy-agent` 7.0.6 at
[`7cf0b795e05218d9e49047d5c93de77d2f606510`](https://github.com/TooTallNate/proxy-agents/tree/7cf0b795e05218d9e49047d5c93de77d2f606510/packages/https-proxy-agent).
The checked-in source archive is SHA-256 verified before extraction:
`b56fff3bb7ab6c12674333781860badcd3faf5712f801cefd9510bc639cb42de`.

```sh
npm --prefix scripts/https-proxy-conformance ci --ignore-scripts
node scripts/https-proxy-conformance/run.cjs
bun scripts/https-proxy-conformance/run.cjs
node scripts/https-proxy-conformance/run.cjs --upstream
bun scripts/https-proxy-conformance/run.cjs --upstream
```

TypeScript 7 transpiles the tests in a temporary directory. A small `node:test`
adapter supplies the original runner globals and three assertion methods.
The source test count is asserted; all 18 cases run without skips on Node 24 and
Bun. The upstream control uses the pinned consumer fixture's package.

Three adaptations are explicit:

- Replace the expired 1024-bit TLS certificate/key with the 4096-bit upstream
  agent-base fixture already checked into `packages/vagent-base/test`, valid
  through 2035. Both implementations use the same replacement certificate.
- Set HTTPS URL protocols explicitly for both implementations. `async-listen`
  3.1.0 misidentifies Bun HTTPS servers as HTTP servers.
- Expect VPM's malformed-header error without the original header contents.
  Upstream retains its original expectation.

The fixture uses pinned upstream `agent-base` response helpers so they do not
mask behavior in the agent under test. Dependencies here are test tools, excluded
from all package archives. External-network end-to-end tests are not run; the
separate package and integration suites exercise local HTTP/TLS tunnel traffic.
