# Agent conformance fixture

The current compatibility target is **agent-base 9.0.0**, while the retained
7.1.4 suite checks older proxy callers. Pinned controls and helper dependencies
remain isolated here and are excluded from runtime packages.

## Current API and ESM caller

`current/run.cjs` runs all 16 tests from proxy-agents commit
`af317e080c20d64fa76f93c741026ca7eaa9a31e` (`agent-base@9.0.0`), against VPM or
the published upstream package. The [SHA-256 manifest](current/upstream/SHA256.json)
checks retained source, license and TLS fixtures. The public test credentials
match the upstream commit's Git blobs. No assertions are skipped or weakened.
The same two TLS-fixture adaptations listed below apply to both versions and
both implementations. TypeScript 7 transpiles the tests; declaration checks
separately verify native and structural delegates.

`current/proxy.cjs` runs published **http-proxy-agent 9.1.0** with upstream and
VPM agent bases. Temporary copies redirect only its `agent-base` import; all
other proxy source is unchanged. Both copies are written before importing, so
Bun's module resolver sees both files. The test checks ESM subclass identity,
plain and TLS proxy connections, absolute request URLs, Basic proxy auth,
keep-alive reuse, proxy events and exact binary POST bytes. It does not exercise
optional Kerberos negotiation or claim full http-proxy-agent parity.

```sh
npm --prefix scripts/agent-conformance ci --ignore-scripts
node scripts/agent-conformance/current/run.cjs
node scripts/agent-conformance/current/run.cjs --upstream
bun scripts/agent-conformance/current/run.cjs
bun scripts/agent-conformance/current/run.cjs --upstream
node scripts/agent-conformance/current/proxy.cjs
bun scripts/agent-conformance/current/proxy.cjs
```

## Retained 7.1.4 coverage

Runs all 15 tests from `agent-base` 7.1.4 at proxy-agents commit
`b923f5363875d8fd56477094d5ffc562840a4b76`. The checked-in source archive is verified
against SHA-256 `181046a2a15cbc2df06287e5256e508bf46583b4513ec8a31b878d74467490b5`
before extraction. Upstream MIT attribution remains in the archive and package.

```sh
npm --prefix scripts/agent-conformance ci --ignore-scripts
node scripts/agent-conformance/run.cjs
bun scripts/agent-conformance/run.cjs
# Optional pinned baseline comparison (requires scripts/consumers installation):
node scripts/agent-conformance/run.cjs --upstream
bun scripts/agent-conformance/run.cjs --upstream
```

The workspace TypeScript 7 CLI transpiles the tests with `noCheck`; public package
types have separate checked consumers. A minimal node:test adapter supplies
`describe`, `it` and deep equality for the suite's sole Jest assertion. No legacy
compiler or Jest dependency is installed. Both implementations pass 15 cases on
Node 24 and Bun 1.4.0, with no skips.

Two fixture adaptations apply equally to upstream and VPM:

- Compare a TLS socket pool name with `https.Agent.prototype.getName` rather than
  a hard-coded historical suffix; Node's native key shape varies by version.
- Explicitly set the two URL-returning HTTPS fixtures to `https:`. The pinned
  `async-listen` helper checks HTTP before HTTPS, and Bun's HTTPS servers also
  satisfy `instanceof http.Server`, producing an incorrect `http:` URL.

`consumer.cjs` is invoked by the main integration gate after its aliases are
installed. It sends actual HTTP and TLS traffic through `vhttps-proxy-agent`
in place of `https-proxy-agent` 7.0.6, verifies tunnel reuse, and exercises
`gaxios` with that same agent.
The separately locked `async-listen` dependency is test-only. This directory,
the source archive and test TLS credentials are excluded from runtime packages.
