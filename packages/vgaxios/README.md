# vgaxios

Google HTTP client APIs targeting `gaxios` 8.3.2, with native fetch for ordinary
requests and a VPM transport for Node agents, proxies, client certificates and
`compress: false`. Supports Node and Bun, CommonJS and native ESM, with
self-contained TypeScript declarations. Node 24 and Bun are the primary targets.

```js
const {Gaxios} = require('vgaxios');
const client = new Gaxios({timeout: 5000, maxContentLength: 1048576});
try {
  const response = await client.request({
    url: 'https://example.com/data', responseType: 'json',
    retry: true, retryConfig: {retry: 2, totalTimeout: 15000}
  });
  console.log(response.data, response.headers.get('content-type'));
} finally {
  client.destroy();
}
```

## Current API and transport

`request`, `instance`, `Gaxios`, `GaxiosError` and `GaxiosInterceptorManager`
provide adapters, interceptors, multipart uploads, proxies and response types.
Prepared options contain a `URL` and native `Headers`. HTTP responses are native
`Response` objects with `.config` and parsed `.data`. Body readers consume the
body during parsing; use `responseType: 'stream'` for streamed data.
`Gaxios.fetch()` accepts native Request objects, URLs or options, and
`Gaxios.mergeHeaders()` preserves separate Set-Cookie values. HTTP errors expose
AIP-193 details through `.cause`, with the status also available as `.status`.

The native transport adds redirect-count enforcement, credential stripping across
origins (including port changes), byte limits after decompression, and deadlines
covering headers and body consumption. It returns Node-readable `.data` for
`responseType: 'stream'`, as Google server callers expect. An explicitly supplied
custom fetch retains Web Stream data when it returns a Web Stream.

Node agents, environment/configured proxies, mTLS and `compress: false` use
`vnode-fetch` lazily. Native FormData and Web Stream uploads are converted for
that transport. This does not require a general Fetch 3 replacement. Three direct
VPM dependencies remain: `vextend`, `vnode-fetch` and `vhttps-proxy-agent`.
Stream detection is inline and multipart boundaries use `crypto.randomUUID()`.
Browser bundling is outside this server package's scope.

The integration aliases cover Gaxios 7.1.3 and 8.3.2. The old 6.x plain-object
headers/response API is not a drop-in target. Existing VPM token and metadata
callers have been verified separately, and metadata now reads native Headers.
These fixture aliases do not upgrade or deploy the application.

## Correctness guarantees

- Defaults and error configurations are copied, including Headers, URLs,
  URLSearchParams and FormData. Error redaction runs after the last retry, so
  retries retain credentials. Cookie, Set-Cookie and Proxy-Authorization are
  redacted too. Opaque agents and streams retain their identities; custom
  redactors must respect that boundary. An error response snapshots metadata and
  parsed `.data`, not a second consumable response body.
- Request/redirect limits and retry settings are validated. Falsy data and exact
  binary views retain their contents; query parameters precede fragments.
  Multipart headers are validated before lazy upload streams start.
- Attempt caps hold even with custom retry decisions. Zero delay is honored,
  backoff is cancellable, expired budgets prevent another attempt, and one-shot
  streams are not replayed. Each attempt has a fresh timeout signal while the
  caller's signal remains authoritative. Pre-aborted calls do not invoke an
  adapter. Custom adapters/fetch functions must honor the supplied signal;
  arbitrary user callbacks cannot be forcibly interrupted.
- Proxy TLS does not receive destination client certificates. Agent reuse
  distinguishes both key and certificate. `noProxy` handles wildcard/host-port
  rules without changing a RegExp's state.
- `destroy()` releases cached agents and their active connections. Caller-owned
  agents remain caller-owned. The per-client cache has no automatic eviction.

Error branding uses the upstream 8.3.2 protocol for cross-copy recognition;
the VPM package's own version remains in `package.json`.

## Verification and performance

33 focused tests include real Google Auth 10.6.1 and 11.3.2 refresh/authenticated
request flows. The upstream suite passes 133 applicable tests on Node and Bun;
three upstream-specific internals/packaging checks are excluded, with VPM
transport and archive coverage in their place. The published control passes all
136 runtime checks. The [fixture documentation](../../scripts/google-http-conformance/README.md)
records adaptations, including TypeScript 7 coverage for the upstream type test.
Existing token/metadata suites, backend HTTP/proxy integration, self-contained
public types and installed npm/Bun archives are also checked.

[Benchmarks](bench/results/README.md) compare Gaxios 8.3.2 with VPM's native
default and explicit Node-agent paths. Three fresh processes and an identical
upstream control are retained per runtime. These local measurements do not imply
production throughput gains. Node JSON GET/POST take about 22%/11% less paired
time, while multipart uploads take 8% more. Constructor snapshotting adds
0.51 microseconds on Node and 0.26 on Bun. Bun's ordinary HTTP differences are
mostly within process/control variation; its agent JSON/gzip paths take 16%/18%
less time against the pinned agent-capable upstream transport. Run `node packages/vgaxios/bench/compare.cjs` (or
`bun`) and `node packages/vgaxios/bench/summarize.cjs --verify-current`.

See [provenance](PROVENANCE.json) and [license](LICENSE).
