# vnode-fetch

The `node-fetch` 2.7.0 server API with native URL handling, checked limits and
reliable stream cleanup. Supports Node.js 20+ and Bun, CommonJS and native ESM,
with self-contained TypeScript declarations. Its one runtime dependency is
`viconv-lite`, loaded only by the legacy `textConverted()` method.

```js
const fetch = require('vnode-fetch');
const response = await fetch('https://example.com/data', {timeout: 5000, size: 1048576});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();
```

`Headers`, `Request`, `Response`, `FetchError`, `AbortError`, `isRedirect`, the
custom `Promise` property and the default fetch export retain the Fetch 2 API.
This includes Node streams, `buffer()`, `textConverted()`, agents, compression
and redirect controls. Native Blob input is supported. This is a server package;
it does not add a browser bundle or adopt node-fetch 3's different module contract.

## Changes and compatibility

- Native absolute URL conversion removes `whatwg-url` and its `tr46` and
  `webidl-conversions` children. Relative `Request` construction remains supported;
  sending a request still requires an absolute HTTP(S) URL.
- Body sizes and redirect counts must be nonnegative safe integers. Timeouts
  must be integers from zero through 2,147,483,647 milliseconds. Zero retains
  the upstream meaning: no body size or timeout limit; zero follows no redirects.
- Explicit zero/false options override inherited Request settings. Direct buffer
  bodies honor the size limit, just as streamed bodies do.
- Body collection rejects premature closure, cleans up listeners and timers,
  copies emitted chunks to protect against producer buffer reuse, and cancels
  upstream transport on limits, aborts or decoder errors. Successful requests
  preserve agent keep-alive reuse.
- Request deadlines include time waiting for an agent socket. Request/header
  and body-consumption timeouts remain separate phases, as in Fetch 2.
- Any cross-origin redirect, including a port change, drops authorization,
  proxy authorization, cookies, `www-authenticate` and an explicit Host header.
  This is stricter than upstream's domain-based credential forwarding.
- Upload errors and aborts immediately before consuming a body reject reliably.
  JSON parse errors omit the response payload; collector errors omit body and
  URL contents. Other transport diagnostics retain Fetch 2 behavior.

Response streams must still be consumed or destroyed by their owner. `size`
protects body-reader methods; it does not impose a limit on a manually consumed
`response.body`. The upstream tolerant gzip completion mode is retained.
These are intentional boundaries, not guarantees of complete Fetch Standard
conformance.

## Verification and performance

23 focused tests and 214 upstream tests pass on Node and Bun. Two upstream
conditional tests remain pending; fixture adaptations and unchanged-upstream
comparisons are described in the
[compatibility fixture](../../scripts/google-http-conformance/README.md).
The consumer integration gate exercises `teeny-request`, Google HTTP requests,
retries and proxy transport through the VPM replacement.

[Benchmark reports](bench/results) contain three fresh processes and an
identical-upstream control for each runtime, with retained outputs and paired
rounds. Run `node packages/vnode-fetch/bench/compare.cjs` (or `bun`) and
`node packages/vnode-fetch/bench/summarize.cjs --verify-current`.
The final paired medians show Bun JSON and streamed POST requests taking 8%
and 14% less time; gzip's 6% reduction is inconclusive against a 31% control
variation. Node HTTP cases range from 1% to 7% more time, with substantial
process variation. Safe 32-chunk collection costs 5.21 → 8.65 µs on Node and
6.04 → 8.39 µs on Bun. Small-body results also vary between processes; the
[complete report](bench/results/README.md) retains that uncertainty instead of
claiming uniform gains. These results do not establish application throughput.

See [provenance](PROVENANCE.json) and [license](LICENSE).
