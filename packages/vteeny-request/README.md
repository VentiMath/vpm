# vteeny-request

Callback and streaming HTTP requests for the Google SDK paths served by
**teeny-request 11.1.1**. Supports Node 24 and Bun. The four runtime dependencies
are VPM packages: `vnode-fetch`, `vhttp-proxy-agent`, `vhttps-proxy-agent` and
`vstream-events`.

```js
const {teenyRequest} = require('vteeny-request');
const request = teenyRequest.defaults({timeout: 60_000, forever: true});
request({uri: 'https://example.com/data'}, (error, response, body) => {
  if (error) return console.error(error.code, error.message);
  console.log(response.statusCode, body);
});
const download = request({uri: 'https://example.com/file'});
download.on('response', response => console.log(response.headers));
download.on('error', error => console.error(error.code));
download.pipe(destination);
```

`destination` above is the caller's writable stream. ESM named imports are also
supported. Public declarations work without ambient Node, DOM or Undici types.

## Request contract

Supply `uri` or `url`, optional `method`, `headers`, `qs`, `body` or `json`.
Object-valued `json` supplies a JSON body and content type. Strings, exact byte
views and Node readable bodies work directly; other body values are serialized
as JSON. Headers accept records, pairs or a Headers-like `entries()` method.
Query fields append to existing parameters; URL fragments are omitted.

Callbacks receive `(error, response, body)` once. A JSON content type decodes
JSON; other bodies become text. Non-2xx statuses are delivered normally for SDK
retry/error handling. On a failure before headers, response and body are null.
HTTP 204 JSON preserves upstream's readable body shape. Callback responses
decompress gzip by default; `gzip: false` disables that behavior.

Without a callback, the returned Node stream emits `response` before forwarding
body bytes. Reading remains lazy, preserves compressed bytes, and applies stream
backpressure. `destroy()` cancels the connection; `abort()` also emits an
`AbortError`. The response is readable and supplies `statusCode`, `statusMessage`,
plain `headers`, `body`, request metadata and `toJSON()`.

`timeout` is a **total deadline** in integer milliseconds, including redirects
and body consumption; zero disables it. Expiration reports `ETIMEDOUT` and
`request-timeout`. An optional `signal` cancels callbacks, uploads and downloads.
`maxResponseSize` bounds consumed response bytes (decoded bytes in callback
mode); zero means unlimited. There is no automatic body-size cap.

`multipart` requires callback mode. Each part accepts a string, byte view or
Node readable and optional `Content-Type`. Parts are written sequentially and
the final boundary always terminates. Canceling or failing an upload destroys
its remaining input streams. `multipart` and ordinary bodies are alternatives.

## Agents and isolation

`proxy` selects an HTTP/TLS proxy; `proxy: false` disables environment proxies.
Otherwise HTTP destinations prefer `HTTP_PROXY`/`http_proxy`, and HTTPS prefers
`HTTPS_PROXY`/`https_proxy`, with the other pair as fallback. `NO_PROXY`/`no_proxy`
supports exact hosts, suffixes, optional ports, bracketed IPv6 and `*`. An
explicit proxy takes precedence over `NO_PROXY`.

`forever: true` enables connection reuse for direct **and proxied** requests.
`pool` supplies native agent/TLS options; as upstream, direct requests without
`forever` use the runtime's default agent. Cache keys include protocol, proxy
credentials and configuration. Mutable byte and plain-object options are
snapshotted. Opaque/cyclic options use an uncached agent; the shared cache holds
at most 64 entries and never evicts an active request. `teenyRequest.close()`
retires cached agents immediately or after active requests finish.

Defaults snapshot plain objects, arrays and byte views; opaque objects retain
their identity. Individual calls shallowly override defaults,
including replacing headers. Inputs are not mutated. Network/parser diagnostics
omit URLs, credentials and response excerpts, while retaining safe error codes.
URL-embedded destination credentials and malformed headers are rejected.

`teenyRequest.stats` preserves pending-header concurrency statistics and warning
options; it does not count the entire download duration. `resetStats()` preserves
options and leaves in-flight requests attached to their original counter.

## Scope and evidence

This implements the current teeny-request callback/download API and actual Cloud
Storage usage. It uses **vnode-fetch on both runtimes** for Node streams, proxy
agents and consistent cancellation. Native Fetch does not supply those same
interfaces. This does not claim the complete `request` npm API or every
node-fetch 3 export; redirects follow vnode-fetch's bounded redirect behavior.
Multipart without a callback remains unsupported, as upstream.

The [conformance fixture](../../scripts/teeny-conformance/README.md) checks all
116 active upstream cases, actual Cloud Storage 8.4.0 callback/download retries
and its multipart upload path. Focused tests cover deadlines, cancellation,
immutable options, byte windows, credential stripping, TLS and proxy isolation.
See [measurements](bench/results/README.md) for request timings and limitations,
and [provenance](PROVENANCE.json) for the pinned source and Apache license.
