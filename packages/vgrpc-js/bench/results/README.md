# gRPC measurements

Compare @grpc/grpc-js 1.14.7 with vgrpc-js on Node 24 and Bun. The shared runner
retains outputs and validates them outside timing, warms each variant for 150 ms
and four full blocks, then records twelve alternating paired rounds. Three fresh
processes and one identical-upstream control per runtime; no trimming. Raw JSON
records source hashes, runtime versions and host details.

Decoder cases reuse a decoder and copy emitted buffers. Metadata cases use six
representative Google RPC headers, including one binary value. RPC cases use
actual local HTTP/2 servers and clients, with the selected transport on both
ends. Both variants use the same VPM-generated protobuf service definition and
channel diagnostics are disabled. These measure local calls, not cloud latency.

Run `node packages/vgrpc-js/bench/compare.cjs`, or use `bun` instead. Set `OUTPUT`
to save JSON; `CALIBRATION=1` compares upstream with itself. Run
`node packages/vgrpc-js/bench/summarize.cjs --verify-current` to check recorded
source hashes and reproduce the summary. Negative changes mean less time.

## Recorded results

Recorded October 30, 2026 (local date), Apple M1 Pro, Node 24.22.1 and Bun 1.4.0.
Times are pooled median nanoseconds. Change is the median paired ratio and need
not equal the ratio of the pooled times. Process columns show each fresh
process's median; controls compare identical upstream code.

### Node

| Workload | Upstream ns | VPM ns | Paired change | Process medians | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| decode / complete 128B | 377 | 116 | -69.3% | -69.0%, -69.5%, -69.3% | -0.5% |
| decode / complete 16KiB | 1,490 | 1,069 | -28.2% | -27.6%, -26.9%, -28.7% | +1.3% |
| decode / coalesced 16 x 128B | 5,673 | 1,507 | -73.4% | -73.8%, -73.1%, -73.4% | -0.0% |
| decode / fragmented 16KiB | 2,768 | 2,875 | +4.7% | +3.0%, +7.4%, +3.7% | -3.9% |
| metadata / parse six headers | 936 | 1,028 | +10.1% | +11.9%, +6.0%, +10.0% | +0.7% |
| metadata / outgoing six headers | 244 | 248 | +1.9% | +1.6%, +2.4%, +0.9% | +0.5% |
| metadata / clone six headers | 341 | 369 | +7.8% | +7.9%, +5.4%, +8.3% | -0.1% |
| construct / service client class | 2,937 | 2,914 | -0.4% | -0.8%, -0.7%, +1.0% | -2.2% |
| RPC / unary echo | 166,119 | 160,729 | -4.8% | -10.1%, -3.6%, -5.9% | -1.2% |
| RPC / server stream of 16 | 282,763 | 278,629 | -1.2% | +2.6%, -12.7%, +3.7% | +3.0% |

Raw runs: [1](node-1.json), [2](node-2.json), [3](node-3.json), [control](node-control.json).

### Bun

| Workload | Upstream ns | VPM ns | Paired change | Process medians | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| decode / complete 128B | 226 | 91 | -56.6% | -42.8%, -63.8%, -68.3% | -0.1% |
| decode / complete 16KiB | 975 | 905 | -7.7% | -9.2%, -6.9%, -8.5% | -0.5% |
| decode / coalesced 16 x 128B | 2,743 | 1,152 | -57.6% | -59.0%, -56.9%, -55.0% | -2.4% |
| decode / fragmented 16KiB | 2,335 | 2,039 | -12.8% | -14.0%, -11.9%, -13.2% | -1.8% |
| metadata / parse six headers | 778 | 836 | +7.6% | +9.3%, +6.9%, +4.8% | -0.5% |
| metadata / outgoing six headers | 133 | 136 | -0.2% | -3.3%, +24.1%, -3.1% | +5.0% |
| metadata / clone six headers | 401 | 389 | -4.3% | -3.5%, -7.1%, -1.7% | +1.0% |
| construct / service client class | 1,394 | 1,380 | -0.5% | +2.2%, +1.5%, -3.6% | -1.1% |
| RPC / unary echo | 107,653 | 105,977 | -1.3% | +0.4%, +0.1%, -1.4% | +0.3% |
| RPC / server stream of 16 | 159,037 | 158,546 | -0.6% | +2.1%, +0.8%, -6.4% | +6.6% |

Raw runs: [1](bun-1.json), [2](bun-2.json), [3](bun-3.json), [control](bun-control.json).

## Interpretation

- Complete 128-byte frames take **69% less time on Node and 57% less on Bun**.
  Sixteen coalesced frames take **73% / 58% less**. Complete 16 KiB frames take
  **28% / 8% less**. Every process agrees; these reductions exceed the controls.
- Fragmented 16 KiB frames take **13% less time on Bun**. Node records a **4.7%
  increase** (about 107 ns), with a 3.9% control bias that limits the estimate.
  Immediate release of completed-message chunks is retained in both cases.
- Metadata parsing costs **10% more on Node and 8% more on Bun** (about 92 / 58 ns
  for six headers). Node metadata cloning costs **8% more**, about 28 ns; Bun's
  clone takes 4% less. The shared clone mapper and text-header normalization
  adjustment reduce some earlier costs but do not eliminate these regressions.
- Outgoing metadata costs **1.9% more on Node**, about 4 ns. Bun outgoing metadata
  and client-class construction are inconsistent or within their controls.
- Local unary calls take **4.8% less time on Node**; all three processes improve
  by 3.6–10.1%, against a 1.2% control bias. Bun unary and both streaming results
  are small or inconsistent. Do not claim a general RPC or cloud-latency gain.

These are transport/metadata workloads on one host. They do not establish a
throughput improvement in a deployed application. Correctness fixes and slower
cases are retained and reported alongside the faster cases.
