# vgrpc-js

An independently written gRPC client for the **@grpc/grpc-js 1.14.7** APIs used
through Google GAX and Firestore, on Node 24 and Bun. Public client imports use
native HTTP/2, TLS, DNS and streams. They do not load the retained upstream client,
retry or resolver implementation. The package version matches its comparison target.

**The application client is complete for the verified scope below.** Server,
Channelz service and experimental compatibility exports still retain upstream
code and load on demand. The internal `build/src` entry points retain that legacy
compatibility runtime. [Provenance](PROVENANCE.json) distinguishes every boundary;
this is not a claim of an independent implementation of all grpc-js features.

```js
const { Metadata, credentials, loadPackageDefinition } = require('vgrpc-js');
const { loadSync } = require('vgrpc-proto-loader');
const api = loadPackageDefinition(loadSync('./service.proto'));
const metadata = new Metadata();
metadata.set('authorization', 'Bearer example');
// Construct your generated service client with credentials.createSsl().
```

CommonJS and native ES module imports expose the same API. Public client types
cover the implemented options and compile with TypeScript 7 without ambient Node,
Undici or DOM types. `vgrpc-proto-loader` is the sole external runtime dependency;
its transitive dependencies are VPM packages. Release archives must pin that
closure to published assets as described in [installation](../../docs/INSTALLATION.md).

## Client scope

- Unary, client-streaming, server-streaming and bidirectional calls; generated
  service constructors, method aliases, metadata, trailers and status events.
- Verified TLS and logical server identity, custom trust roots and metadata call
  credentials. Google Auth header records, WHATWG Headers and callback adapters.
- Deadlines, cancellation, readiness watches and orderly channel shutdown.
- Per-channel connections, native hostname resolution, IP and Unix socket targets,
  GOAWAY draining, reconnect backoff and optional keepalive pings.
- Service-config method selection, wait-for-ready, timeouts and message limits;
  bounded retry buffers, configured retryable statuses, server pushback and
  transparent retries for refused streams. Response headers commit a call and
  prevent automatic replay. Higher-level Google API retries remain GAX's job.
- Identity, gzip and deflate messages, owned frame buffers and receive limits
  enforced both before buffering and after decompression.

The client uses native address selection and per-channel connections. It does
not implement round-robin/xDS/custom DNS resolvers, DNS TXT service discovery,
HTTP CONNECT proxy configuration or proxy environment variables, shared subchannel
pools, client Channelz registration, custom interceptors/channel factories,
hedging, parent-call propagation, retry throttling or per-write NoCompress flags.
Explicit custom factories/interceptors, parent calls, non-pick-first service
configs, hedging, retry throttling and CONNECT channel options are rejected.
Other upstream-only tuning options are not a compatibility promise. These
features are not used by the verified GAX/Firestore paths.

## Corrections preserved and added

Metadata conversions preserve own `__proto__` properties and comma-combined
binary values; package namespaces never mutate inherited Object members.
The independent frame decoder owns partial input immediately, grows storage
geometrically and rejects oversized headers without reserving their payload.

Credential composition runs generators concurrently, merges in declared order
and compares the full plan. Authentication callback errors win even when metadata
is also supplied. Modern Google Auth `Headers` preserve authorization; invalid
headers reject the credential promise instead of leaving a request unsettled.

An extra unary response fails promptly with UNIMPLEMENTED instead of waiting for
the deadline. A lost HTTP/2 connection reports UNAVAILABLE, preserving the
no-replay rule after response headers; the paired original reports INTERNAL for
that particular local failure. Peer stream cancellation still reports CANCELLED.

## Verification and measurements

[The conformance fixture](../../scripts/grpc-conformance/README.md) separates the
new public client from retained internal compatibility tests:

- 42 public-client checks pass on Node 24 and Bun, with original controls,
  including TLS rejection, deadlines, reset streams, replay rules and limits.
- Real GAX 6.14.0 and Firestore 9.4.0 produce identical results for 23 workflows
  and identical decoded logs for 25 requests, including writes, queries,
  transactions, bulk writes and Watch. Additional Watch tests verify reconnects
  with resume tokens. The combined Firebase Admin 14.5.0 caller also matches
  17 public results, 17 Auth/Storage/FCM requests and 25 Firestore RPCs on both
  runtimes, with FCM and gRPC routed to separate local peers. Twelve
  interoperability calls cover all four RPC modes
  and verified TLS with call credentials.
- 1,504 frame/metadata comparisons and the existing unit tests remain passing.
  The retained internal/server suite passes 499 cases on Node; Bun passes 497
  with two identical upstream runtime failures and nine original skips.
- Clean npm/Bun archive consumers exercise CJS and ESM on both runtimes and
  compile the scoped public types with TypeScript 7.

All services in these checks are local fixtures; live cloud deployment and app
adoption are separate. [Client benchmarks](bench/client-results/README.md) use
fresh processes, balanced order and identical-source controls. Historical
[transport recordings](bench/results/README.md) do not establish current gains.
The independent [frame decoder](bench/decoder-results/README.md) and
[Channelz registry](bench/channelz-results/README.md) have separate measurements.

The numeric Channelz registry is an independent AVL implementation with bounded
ordered pages and no `vordered-map` dependency. Its diagnostic service runtime
remains upstream-derived and is not needed by the public application client.
