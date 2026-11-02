# Public client measurements

Recorded November 2, 2026 against @grpc/grpc-js 1.14.7 on Node 24.22.1 and Bun 1.4.0.
The timed operation is a complete warm local HTTP/2 RPC, including serialization,
framing, callbacks/stream consumption and a native HTTP/2 fixture server.
There is no cloud latency, TLS handshake, cold import or Firestore application work
in these timings. The server is identical for both implementations.

Each case uses four fresh-process comparison pairs and two identical-upstream
control pairs, balanced AB/BA order, equal iterations within a pair, warmup and
validation outside timing. Raw samples and hashes of the measured source are
retained without trimming. These controls identify noise; they do not establish
a fixed correction factor. A negative change means less time.

| Runtime / case | Upstream µs | VPM µs | Median paired change | Largest control difference | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| [Bun: warm unary 128B](bun-0.json) | 84.01 | 73.61 | -10% | 1.8% | unestablished at this precision |
| [Bun: warm unary 16KiB](bun-1.json) | 96.50 | 95.32 | -2.6% | 2% | unestablished at this precision |
| [Bun: server stream 32 x 128B](bun-2.json) | 129.89 | 93.59 | -28.3% | 5.6% | lower time in every pair, beyond control spread |
| [Node: warm unary 128B](node-0.json) | 135.17 | 131.66 | -1.8% | 14.3% | unestablished at this precision |
| [Node: warm unary 16KiB](node-1.json) | 164.88 | 145.90 | -12.1% | 9.7% | unestablished at this precision |
| [Node: server stream 32 x 128B](node-2.json) | 173.06 | 139.76 | -18.2% | 4.4% | unestablished at this precision |

The Bun streaming case takes 28.3% less time, consistently beyond its controls.
All five other rows are inconclusive; no Node speedup or regression is established.
The client avoids redundant empty-credential metadata work and an unnecessary
event-loop turn after valid trailers, while keeping the reset-settlement path.

Inconclusive rows are not speedup or regression claims. The objective of this
change is the independently implemented, verified application client; these
measurements do not imply faster production Firestore requests.

Reproduce with `node packages/vgrpc-js/bench/client.cjs` and
`bun packages/vgrpc-js/bench/client.cjs`, one runtime at a time.
