# vnode-fetch

The `node-fetch` 2.7.0 server API with native URL handling, checked limits and
reliable stream cleanup. Supports Node.js 24+ and Bun, CommonJS and native ESM,
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
  Both timeout errors carry `code` and `errno` equal to `ETIMEDOUT`, so a caller
  can identify the timeout regardless of which layer's timer fires first.
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

## Current Google clients and native Fetch

Gaxios 7.1.3 and 8.3.2 are tested with `vnode-fetch` through their public
`fetchImplementation` option. The checks cover JSON and OAuth forms, byte/Blob
and streamed uploads, Google multipart uploads, response readers, compression,
errors, retries, cancellation, Node agents, size bounds and redirect limits.
The same checks run against published node-fetch 3.3.2 as a control. This verifies
those caller paths; it does not establish complete node-fetch 3 API parity or
authorize an unrestricted version-3 package alias.

Native Fetch also handles the ordinary request paths on Node 24 and Bun. Passing
it directly to Gaxios ignores Node agents and the size limit on a response with
no Content-Length, and returns Web Streams instead of Node streams. Node's
native Fetch also ignores Gaxios's redirect-count option; Bun honors it. Reusing
native Fetch therefore needs explicit handling of these requirements in the
caller or an adapter. Browser Fetch and the runtime's native Fetch are separate
from the versioned `node-fetch` npm package.

Other Fetch 3 features, such as file-from-path helpers, referrer policies and
multipart response parsing, are outside the verified caller scope. They are
deferred until a consumer requires them. Existing Fetch 2 compatibility remains.

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
Against node-fetch 2.7.0, the refreshed Bun HTTP JSON, gzip and streamed POST
paired medians take 14%, 7% and 9% less time. Node HTTP changes range from about
1% less to 1% more time and do not establish a speed improvement against the
process/control variation. Safe 32-chunk collection costs 4.53 → 7.64 µs on Node
and 4.69 → 7.59 µs on Bun. The [complete report](bench/results/README.md)
retains process ranges and controls. These results do not measure native Fetch,
Fetch 3, or application throughput.

See [provenance](PROVENANCE.json) and [license](LICENSE).
