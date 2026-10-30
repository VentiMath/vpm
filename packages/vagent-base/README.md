# vagent-base

An `agent-base` 9.0.0 counterpart for subclasses that create HTTP or HTTPS
connections synchronously or asynchronously. It retains native connection
pooling and has **zero runtime dependencies**, like that upstream version.
Node.js 24+ and Bun are supported; performance work targets Node 24 and Bun.

```js
const { Agent } = require('vagent-base');
const net = require('node:net');
const tls = require('node:tls');
const https = require('node:https');

class DirectAgent extends Agent {
  connect(request, options) {
    return options.secureEndpoint ? tls.connect(options) : net.connect(options);
  }
}
const agent = new DirectAgent({ keepAlive: true, connectTimeout: 30_000 });
https.get('https://example.com/', { agent }, response => response.resume());
// Reuse the agent for subsequent requests, then call agent.destroy().
```

`connect(request, options)` returns a native Duplex stream, an agent with a
callable `addRequest(request, options)`, or a promise/thenable resolving to either.
Native TCP and TLS options pass through, with `secureEndpoint` identifying the
destination. Delegates may be native agents or structural objects, matching
agent-base 9. The method is read once and called with the delegate as its receiver.
Getter and method failures settle the request and release queued work. Direct
and indirect cycles through VPM agents are rejected. A late shared delegate is
ignored after cancellation; it is not destroyed because other requests may use it.
CommonJS and named ES module exports provide `Agent`, `req`, `toBuffer` and `json`.
Public declarations are self-contained and accept native Node streams and agents.

## Connection lifecycle

- `maxSockets` and `maxTotalSockets` include connections whose promises are still
  pending. Failed connections release capacity and dispatch queued work.
- Queued connector calls keep the request's async context. Native TLS pool keys
  keep differing certificate and verification policies isolated.
- `request.destroy()`, `request.abort()` and `agent.destroy()` settle pending work.
  A stream returned after cancellation or timeout is destroyed immediately.
- `connectTimeout` defaults to **30,000 ms**; `0` disables it. It bounds the wait
  for a promise returned by `connect()`. It does not time out a socket's later
  handshake, queued requests or response transfer. Use native socket/request
  timeouts for those phases. A custom promise's underlying work cannot be forcibly
  stopped; the eventual socket is disposed of.
- Each connection completes once. Invalid return values and destroyed streams
  fail explicitly. Native `Agent.destroy()` reuse remains supported.

Constructor options are copied. Socket limits must be positive safe integers or
`Infinity`; `connectTimeout` must be an integer from 0 through 2,147,483,647.
`protocol` and `defaultPort` remain configurable. Automatic dual-protocol support
uses native structured call sites when available, independent of error stack
formatters. Older runtimes fall back to formatted stacks; set `agent.protocol`
explicitly if an application replaces stack formatting there.

## Response helpers

```js
const { req, json, toBuffer } = require('vagent-base');
const request = req('https://example.com/data.json', { agent });
const response = await request; // The native ClientRequest is also thenable.
const data = await json(response, { limit: 1024 * 1024 });
```

`req(url, options)` ends the request immediately and resolves on response headers.
It accepts HTTP/HTTPS strings and URL objects, forwards native options, and
rejects request errors or a close before headers. Check `response.statusCode` and
apply response deadlines in the caller. It does not redirect or require 2xx.

`toBuffer(iterable, { limit })` collects UTF-8 strings and exact byte-view windows.
It copies bytes before requesting another chunk, so producers may reuse mutable
buffers. The optional limit counts bytes and stops collection before copying an
oversized chunk. The default is `Infinity`, preserving upstream behavior.
`json` uses the same collector, rejects invalid UTF-8, and parses JSON. Its
`SyntaxError` contains no response body or original parse error as a cause.

## Compatibility and evidence

This targets the 9.0.0 API and retains tested 7.1.4 compatibility. Agent-base 9 is
ESM-only; VPM retains CommonJS and named ESM exports from the same implementation.
The older callback-style `agent-base` 6 branches are
reported separately by the consumer gate and are not aliased. Internal upstream
socket-reservation methods are not public APIs here. Subclasses implement
`connect()`, leaving native socket handoff to the base class.

Intentional differences include the finite default connection wait, strict
configuration and result validation, cancellation cleanup, cycle rejection,
correct byte-view/string collection, strict UTF-8 JSON and private error messages.
No package publication or application adoption is implied by these checks.

```sh
node --test packages/vagent-base/test/*.test.cjs
bun test packages/vagent-base/test
npm --prefix scripts/agent-conformance ci --ignore-scripts
node scripts/agent-conformance/run.cjs
bun scripts/agent-conformance/run.cjs
node scripts/agent-conformance/current/run.cjs
node scripts/agent-conformance/current/run.cjs --upstream
node scripts/agent-conformance/current/proxy.cjs
bun scripts/agent-conformance/current/run.cjs
bun scripts/agent-conformance/current/run.cjs --upstream
bun scripts/agent-conformance/current/proxy.cjs
node scripts/integration.cjs
bun scripts/integration.cjs
```

The 36 focused tests exercise transport, native pools, queue failure recovery,
cancellation, deadlines, structural delegation, context, helpers and module
imports. All 16 current and 15 older
[pinned upstream cases](../../scripts/agent-conformance/README.md) run on both
runtimes, alongside upstream controls. The published ESM http-proxy-agent 9.1.0
caller passes HTTP/TLS proxy, keep-alive, Basic auth, event and binary POST checks
with only its agent-base import changed. Kerberos negotiation is outside this
agent-base caller check. The integration gate uses `vhttps-proxy-agent` in place of the pinned
`https-proxy-agent` 7.0.6, including `gaxios` consumers, HTTP/TLS tunnels and
keep-alive reuse. Archive checks install the packed package
and compile a native Node subclass with TypeScript 7.

See the [benchmark report](bench/results/README.md) for complete measurements,
controls and remaining costs. [Provenance](PROVENANCE.json) records the source
commits, source hashes and adaptations. The public TLS key and certificate under
`test/` are upstream test fixtures; they are excluded from the package archive.

## License

MIT; upstream attribution is retained in [LICENSE](LICENSE).
