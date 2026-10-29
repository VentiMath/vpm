# vgaxios

Google's HTTP client API, compared with `gaxios` 6.7.1, using VPM throughout its
runtime dependency tree. Supports Node.js 20+ and Bun, CommonJS and native ESM,
with self-contained TypeScript declarations.

```js
const {Gaxios} = require('vgaxios');
const client = new Gaxios({timeout: 5000, maxContentLength: 1048576});
try {
  const response = await client.request({
    url: 'https://example.com/data', responseType: 'json',
    retry: true, retryConfig: {retry: 2, totalTimeout: 15000}
  });
  console.log(response.data);
} finally {
  client.destroy();
}
```

`request`, `instance`, `Gaxios`, `GaxiosError` and `GaxiosInterceptorManager`
retain the public API, including adapters, custom fetch implementations,
interceptors, multipart uploads, proxies and response types. Four runtime
dependencies remain: `vextend`, `vis-stream`, `vnode-fetch` and
`vhttps-proxy-agent`. Multipart boundaries use native `crypto.randomUUID()`.
This package targets server consumers; browser bundling is outside its scope.

## Changes and compatibility

- Constructor defaults and plain request/error state are copied. Error redaction
  no longer mutates a caller's plain response object. Cookie, Set-Cookie and
  Proxy-Authorization headers are also redacted. Streams, agents and other opaque
  objects retain their identities; custom redactors must respect that boundary.
- Default response/redirect limits apply consistently. Numeric limits and retry
  settings are validated before transport. Query parameters precede fragments,
  and an existing case-insensitive Accept header is preserved.
- Falsy values, exact byte views, Blob and URLSearchParams inputs retain their
  contents. Native FormData uses the runtime serializer with the default
  transport; upstream silently drops that request body. A custom fetch receives
  the original FormData.
- Multipart streams start lazily and propagate upload errors. Part Content-Type
  values are checked before constructing a body. Streamed HTTP error responses
  reject on premature closure and honor body limits.
- Retry counts remain hard bounds, even with a custom decision callback. Zero
  delay is honored; aborted requests and one-shot streams are not retried.
  Backoff is cancellable and bounded by the remaining retry budget. An expired
  budget prevents another attempt; the default transport timeout is capped by
  the remaining budget. Request headers and body consumption retain separate
  timeout phases. Custom adapters, fetch functions and decision callbacks must
  implement their own cancellation and deadlines.
- Proxy agents keep destination client certificates out of proxy TLS options.
  Agent reuse distinguishes both certificate and key. `noProxy` RegExp rules
  preserve their state; wildcard and host-with-port exclusions work.
- `destroy()` releases the client's cached agents and their active connections.
  Caller-supplied agents remain caller-owned. The agent cache is per client and
  has no automatic eviction; dispose of clients when their work is complete.

The upstream error symbol and compatibility version are retained so existing
`gaxios` consumers recognize `GaxiosError` with `instanceof`. This branding does
not change the VPM package's own version, recorded in `package.json`.

## Verification and performance

21 focused tests and all 109 upstream tests pass on Node and Bun. The
[compatibility fixture](../../scripts/google-http-conformance/README.md) records
expectation changes for the deliberate fixes. Integration exercises the pinned
Google HTTP client path, multipart uploads, retries and HTTP/HTTPS proxies.
Installed archives are checked with npm, Bun, CommonJS, ESM and TypeScript.

[Benchmarks](bench/results) compare client construction, adapter preparation,
JSON and gzip HTTP requests, uploads and HTTP errors. Three fresh processes and
an identical-upstream control are retained per runtime. Run
`node packages/vgaxios/bench/compare.cjs` (or `bun`) and
`node packages/vgaxios/bench/summarize.cjs --verify-current`.
Multipart uploads take about 8% less paired time on Node and 50% less on Bun.
Node’s other HTTP cases are broadly similar within control/process variation.
Copying constructor defaults costs 173 → 783 ns on Node and 99 → 489 ns on Bun;
adapter-only preparation is 13–15% slower on Node and about 9% faster on Bun.

Bun’s installed upstream client uses its built-in `node-fetch` substitute.
Against that baseline, VPM’s JSON/POST/error cases take 14–19% longer and gzip
61% longer. Against the actual pinned Fetch 2 package, VPM’s Bun JSON/gzip
requests take 14%/9% less time. The [complete report](bench/results/README.md)
keeps both comparisons visible. VPM does not silently switch to the native
substitute and discard its checked transport behavior. These are local operation
measurements, not production throughput claims.

See [provenance](PROVENANCE.json) and [license](LICENSE).
