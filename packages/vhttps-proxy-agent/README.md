# vhttps-proxy-agent

HTTP CONNECT tunnels for HTTP and HTTPS requests, through HTTP or HTTPS proxies.
This is a counterpart to `https-proxy-agent` 7.0.6 using `vagent-base` and `vdebug`.
Its complete external dependency tree is those two packages plus `vms`.
Node.js 24+ and Bun are supported; performance work targets Node 24 and Bun.

```js
const https = require('node:https');
const { HttpsProxyAgent } = require('vhttps-proxy-agent');

const agent = new HttpsProxyAgent('http://proxy.example:8080', {
  keepAlive: true,
  connectTimeout: 30_000,
  maxProxyHeaderSize: 16_384,
  headers: () => ({ 'Proxy-Authorization': 'Bearer proxy-token' })
});
https.get('https://example.com/', { agent }, response => response.resume());
// Reuse the agent for subsequent requests, then call agent.destroy().
```

CommonJS and named ES module imports export `HttpsProxyAgent`. Both HTTP and
HTTPS destinations use CONNECT, including WebSocket upgrade requests made through
the native client. Socket pooling and queue limits come from
[`vagent-base`](../vagent-base/README.md). Public declarations are self-contained.

## Configuration

The constructor accepts an HTTP/HTTPS URL string or a URL object, followed by
native agent and proxy connection options. Proxy credentials are percent-decoded
once and encoded as Basic authentication. URL credentials override an explicitly
provided `Proxy-Authorization` header. Errors and debug output omit credentials
and response header contents.

- `headers` is an object or a synchronous function returning an object. A function
  runs for each new tunnel, with the agent as `this`. Returned objects are never
  modified. Own header values are stringified once and validated before a socket
  is opened. Undefined values are omitted.
- Header names are case-insensitive. Duplicate names, invalid names/values,
  `Transfer-Encoding`, and nonzero `Content-Length` are rejected. CONNECT always
  supplies the actual destination authority as `Host`. Caller-supplied
  `Proxy-Connection` is respected; otherwise it follows `keepAlive`.
- `maxProxyHeaderSize` defaults to **16,384 bytes**, cumulatively across interim
  and final response headers. It is a positive safe integer at most 2,147,483,647.
  Bytes belonging to the established tunnel do not consume this budget.
- `connectTimeout` defaults to **30,000 ms**; `0` disables it. The deadline covers
  TCP connection, proxy TLS handshake, and CONNECT response headers. Cancellation,
  timeout, parse failure, or agent destruction closes the actual proxy socket.
  Queue time, destination TLS handshake and response transfer need their own
  native request/socket deadlines.
- Proxy `ca`, `cert`, `key`, `rejectUnauthorized` and `servername` belong in the
  agent constructor. Destination TLS options belong on the request. Disabling
  proxy certificate verification does not disable destination verification.
  SNI defaults independently from each hostname, excluding IP literals.
- The proxy connection advertises only `http/1.1` by default. An explicit
  `ALPNProtocols` array may contain only `http/1.1`, or be empty. Encoded ALPN
  buffers and other protocols are rejected: this implementation speaks HTTP/1.1
  CONNECT, not HTTP/2.

URL, static headers, byte arrays, arrays and plain option records are snapshotted.
Opaque native objects such as secure contexts are passed through. The `proxy`,
`proxyHeaders` and `connectOpts` properties provide detached/read-only snapshots;
mutating them does not reconfigure the agent. Use a header function for rotating
credentials and create a new agent when changing the proxy or TLS configuration.

## Response handling and compatibility

The incremental parser scans fragmented headers without repeatedly concatenating
the accumulated prefix. It validates HTTP/1.0 and HTTP/1.1 status lines and fields,
preserves Latin-1 values, and stores headers in a prototype-free map. Duplicate
response fields become arrays. Informational responses are skipped; `101` fails.
All successful **2xx** CONNECT replies establish a tunnel, as specified by
[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.6).
Bytes received immediately after successful headers are returned to the tunnel.

Both the request and agent emit `proxyConnect`; the agent event also receives the
request. An observer cannot change the already captured status decision. A failed
CONNECT destroys the real proxy socket and replays the buffered response through
an isolated Duplex stream so the caller sees its HTTP status. Writes to this
stream are discarded; destination credentials never go over the rejected tunnel.
As upstream does, replay contains only body bytes already buffered with the
headers. It is not a streaming proxy-error-body API.

Intentional changes include bounded headers/deadlines, strict configuration and
wire validation, immutable configuration snapshots, TLS policy separation,
case-insensitive reserved headers, 1xx/2xx handling, preserved tunnel bytes, and
sanitized diagnostics. These are documented differences from 7.0.6. The older
`https-proxy-agent` 5 API and `agent-base` 6 branch are not silently substituted.

## Verification

```sh
node --test packages/vhttps-proxy-agent/test/*.test.cjs
bun test packages/vhttps-proxy-agent/test
npm --prefix scripts/https-proxy-conformance ci --ignore-scripts
node scripts/https-proxy-conformance/run.cjs
bun scripts/https-proxy-conformance/run.cjs
node scripts/integration.cjs
bun scripts/integration.cjs
```

The 33 focused tests cover four HTTP/TLS proxy/destination combinations, pooling,
credentials, SNI, cancellation, queue recovery, deadlines, malformed/oversized
headers, fragmentation and imports. All 18
[pinned upstream cases](../../scripts/https-proxy-conformance/README.md) run on
both runtimes; the same runner also verifies upstream. Actual `gaxios` consumers
exercise the VPM replacement in the isolated integration fixture. Archive checks
install the packed package, verify its file/dependency inventory, and compile
TypeScript consumers. These checks do not imply application adoption or publishing.

See the [benchmark report](bench/results/README.md) for measurements and tradeoffs,
and [provenance](PROVENANCE.json) for source and fixture details.

## License

MIT; upstream attribution is retained in [LICENSE](LICENSE).
