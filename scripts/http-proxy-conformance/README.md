# HTTP proxy conformance

Pinned development-only controls for `vhttp-proxy-agent`: current 9.1.0 and a
7.0.2 comparison alias, alongside the upstream test helpers. Runtime packages do
not include this directory, SDK fixtures, upstream modules or TLS test keys.

`run.cjs` verifies the [SHA-256 manifest](upstream/SHA256.json), transpiles all
16 upstream tests with the workspace TypeScript 7 compiler, and executes them
against VPM or published **http-proxy-agent 9.1.0**. The source, test, manifest,
MIT license and test TLS pair come from proxy-agents commit
`b7e5f7ccce1a3ac5b339cc4c587974e8989cbc16` (`http-proxy-agent@9.1.0`).

A minimal node:test adapter supplies the suite's Jest assertions. The HTTPS
fixture URL is explicitly marked `https:` because async-listen misidentifies
Bun HTTPS servers as HTTP. That adjustment is identical for both implementations;
no upstream assertions are skipped or weakened, and the original TLS files are
retained. TypeScript transpilation uses `noCheck`; separate gates check package
declarations and native HTTP consumers.

`callers.cjs` exercises **teeny-request 11.1.1** and **Cloud Storage 8.4.0** from
the separately locked [retry fixture](../retry-request-conformance/README.md).
Only teeny-request's http-proxy-agent export is replaced in the standalone run,
then restored. Both implementations complete callback POSTs, streamed reads and
Storage callback/download paths through HTTP and TLS forward proxies. These
eight requests check Basic proxy authentication, response status and body bytes.
The control uses the caller's pinned **http-proxy-agent 7.0.2**. The root
integration gate repeats the caller checks with its broader VPM aliases and
requires the proxy replacement to be reached. It reloads the original teeny
transport for this comparison even when the outer integration aliases teeny
itself; separate teeny tests exercise VPM composition. Success paths are covered here;
retry behavior has its own suite.

```sh
npm --prefix scripts/http-proxy-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/http-proxy-conformance/run.cjs
node scripts/http-proxy-conformance/run.cjs --upstream
node scripts/http-proxy-conformance/callers.cjs
node scripts/http-proxy-conformance/callers.cjs --upstream
```

Run the same commands with `bun` in place of `node`. CI targets Node 24 and Bun.
Automatic Negotiate/Kerberos challenge handling is outside the verified caller
scope and is rejected explicitly by VPM; see the
[package contract](../../packages/vhttp-proxy-agent/README.md).
