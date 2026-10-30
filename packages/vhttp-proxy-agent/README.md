# vhttp-proxy-agent

HTTP forward requests through HTTP or HTTPS proxies, using `vagent-base` and
`vdebug`. Targets **http-proxy-agent 9.1.0** for the ordinary proxy paths used by
the backend; current teeny-request 11.1.1 callers still using 7.0.2 are checked
separately. Runtime verification targets Node 24 and Bun.

```js
const http = require('node:http');
const { HttpProxyAgent } = require('vhttp-proxy-agent');

const agent = new HttpProxyAgent('http://proxy.example:8080', {
  keepAlive: true,
  connectTimeout: 30_000,
  headers: () => ({ 'Proxy-Authorization': 'Bearer proxy-token' })
});
http.get('http://example.com/data', { agent }, response => response.resume());
// Reuse the agent, then call agent.destroy() when it is no longer needed.
```

CommonJS and named ESM imports export `HttpProxyAgent`. For HTTPS destinations,
use [`vhttps-proxy-agent`](../vhttps-proxy-agent/README.md) to establish a CONNECT
tunnel. Forward proxying exposes the HTTP request to the configured proxy.

## Requests and configuration

The constructor takes a proxy URL string or URL object, and native agent/TLS
options. Proxy TLS verification remains enabled by default. `ca`, `cert`, `key`
and `servername` configure the proxy connection; SNI is inferred for DNS names.
ALPN defaults to `['http/1.1']`; an explicit array may contain only that protocol
or be empty. The implementation sends HTTP/1.1 requests.

- Absolute targets and proxy headers are prepared when the request registers,
  including requests queued behind `maxSockets`. This avoids upstream's second
  rewrite of the buffered request after connecting. Delayed agent delegation
  verifies and replaces only the buffered header prefix, preserving body bytes
  and pending-byte accounting.
- Origin-form paths use the destination in request options. A custom `Host`
  header remains intact for virtual hosting but cannot reroute the absolute
  target. Leading double slashes, dot segments and percent escapes are preserved;
  fragments are stripped. Explicit absolute targets must be HTTP URLs without
  credentials. Relative paths and the asterisk request target are unsupported.
- `headers` accepts own enumerable fields or a synchronous provider called once
  per request, with the agent as `this`. Provider results are not mutated. Zero
  and empty strings are preserved, undefined is omitted, and arrays are copied.
  Duplicate case variants and invalid names/values fail before connecting.
  Configured `Host`, `Content-Length`, `Transfer-Encoding` and `Trailer` fields
  are rejected; authority and framing belong to the request.
- URL credentials are percent-decoded once and supply Basic authentication,
  overriding configured `Proxy-Authorization` case-insensitively. An explicit
  `Proxy-Connection` is respected; otherwise it follows `keepAlive`.
- Proxy URLs, headers, arrays, byte views and plain option records are copied.
  Opaque native objects, such as secure contexts, pass through. Public `proxy`,
  `proxyHeaders` and `connectOpts` are detached or immutable snapshots. Create a
  new agent to reconfigure its destination or TLS policy; use a header provider
  for credentials that rotate.
- `connectTimeout` defaults to **30,000 ms**, including TCP establishment and
  the proxy TLS handshake. `0` disables it. Timeout, request cancellation and
  agent destruction close pending sockets. Queue time and response transfer
  need their own request deadlines. Pooling and queue behavior come from
  [`vagent-base`](../vagent-base/README.md).

## Events and compatibility scope

The request and agent emit `proxyConnect` with `{socket}` once the connection is
ready; the agent event also receives the request. TLS proxies become ready only
after certificate verification. The request's `proxy` event contains `{proxy,
socket}`; its URL omits username, password, query and fragment. Debug messages
omit credentials and header contents. A 407 response passes through normally;
the agent does not retry or consume the body behind the caller's back.

Automatic Kerberos/Negotiate and `onProxyAuth` callbacks are outside the verified
application scope. Supplying either is rejected explicitly (`negotiate: false`
is accepted). This removes the `proxy-agent-negotiate` dependency and its optional
native Kerberos peer. The retained 9.1.0 source stores these options but does not
invoke them in its connection path. This package does not claim those features
or unrestricted compatibility with every major version. Its complete external
runtime tree contains `vagent-base`, `vdebug` and `vms`.

## Verification and measurements

The focused suite checks streamed binary/UTF-8 bodies, delayed delegation,
keep-alive queues, URL authority, header snapshots, authentication, real TLS,
deadlines, cancellation and listener failures. All 16 pinned upstream 9.1.0
tests run against both implementations on Node 24 and Bun. Actual teeny-request
and Cloud Storage callback/download paths run through both HTTP and TLS proxies,
including Basic authentication and exact body checks.

```sh
node --test packages/vhttp-proxy-agent/test/*.test.cjs
bun test ./packages/vhttp-proxy-agent/test
npm --prefix scripts/http-proxy-conformance ci --ignore-scripts
node scripts/http-proxy-conformance/run.cjs
node scripts/http-proxy-conformance/run.cjs --upstream
node scripts/http-proxy-conformance/callers.cjs
node scripts/http-proxy-conformance/callers.cjs --upstream
bun run typecheck
```

The caller fixture also needs `npm --prefix scripts/retry-request-conformance ci
--ignore-scripts`. Repeat the conformance commands with `bun` for that runtime.
Packed CommonJS/ESM exports and standalone declarations are checked separately.
These tests do not change application dependencies or constitute deployment.

See the [benchmark report](bench/results/README.md),
[conformance fixture](../../scripts/http-proxy-conformance/README.md), and
[provenance](PROVENANCE.json). MIT; attribution is retained in [LICENSE](LICENSE).
