# vgaxios benchmark results

Gaxios 8.3.2 versus VPM, on Node 24.22.1 and Bun 1.4.0, Apple Silicon/macOS.
Three fresh processes per runtime, 12 alternating paired rounds per process,
and one identical-upstream control. Lower operation time is better. Changes
are medians of paired ratios, not ratios of pooled medians. Every sample,
source hash and runtime detail is retained; no samples are trimmed.

Default HTTP cases use native fetch in VPM and the unmodified upstream default
(node-fetch 3 on Node, native fetch on Bun). Node-agent cases pass a keep-alive
http.Agent to both implementations and explicitly select the published
node-fetch 3.3.2 source for upstream. This is necessary because upstream's Bun
default ignores Node agents. VPM selects its agent-capable vnode-fetch transport.

Node native-default JSON GET, gzip GET, JSON POST and HTTP-error medians take
22.5%, 10.7%, 11.0% and 14.4% less paired time. Multipart uploads take 8.1% more.
Node adapter-only preparation adds about 0.37–0.46 microseconds. Constructor
snapshotting costs 79 → 589 ns on Node and 52 → 315 ns on Bun; upstream retains
the supplied defaults by reference.

Bun's ordinary HTTP differences vary across processes and mostly overlap control
variation, so no broad default-transport speedup is claimed. Its agent-capable
JSON and gzip paths take 15.9% and 17.6% less paired time. Node's agent rows also
improve, but the JSON control varies by 10.2%, limiting the strength of that result.
These are local operation measurements, not production throughput claims.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| client construction | 79 | 589 | 645.9% | 656.4%, 654.7%, 636.8% | 0.3% |
| adapter GET | 3682 | 4137 | 12.9% | 7.2%, 12.4%, 13.9% | -0.4% |
| adapter POST | 4462 | 4831 | 8.8% | 9.0%, 7.1%, 8.8% | -0.5% |
| HTTP /json | 162397 | 126627 | -22.5% | -22.4%, -26.8%, -18.8% | -1.5% |
| HTTP /gzip | 206405 | 186371 | -10.7% | -5.4%, -11.2%, -10.6% | 2.2% |
| Node agent /json | 147741 | 137545 | -7.1% | -8.6%, -9.1%, -5.1% | 10.2% |
| Node agent /gzip | 191771 | 176622 | -6.9% | -3.1%, -6.1%, -11.9% | -4.4% |
| HTTP JSON POST | 188879 | 166279 | -11.0% | -12.1%, -8.8%, -11.9% | 0.3% |
| HTTP multipart upload | 219820 | 242011 | 8.1% | 5.8%, 7.0%, 15.8% | -2.6% |
| HTTP 503 error | 164507 | 141433 | -14.4% | -13.1%, -12.8%, -19.7% | 0.8% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| client construction | 52 | 315 | 500.5% | 530.3%, 498.3%, 459.0% | -1.1% |
| adapter GET | 2479 | 2440 | -1.4% | 0.3%, -2.1%, -2.0% | -4.1% |
| adapter POST | 2953 | 2925 | -0.7% | 2.2%, -9.2%, 2.7% | 2.4% |
| HTTP /json | 79082 | 78194 | -0.6% | 1.7%, -7.2%, 0.4% | -4.1% |
| HTTP /gzip | 79598 | 79196 | -2.2% | 0.6%, -6.7%, -1.0% | 0.7% |
| Node agent /json | 133805 | 111435 | -15.9% | -15.2%, -16.3%, -15.5% | 2.0% |
| Node agent /gzip | 198116 | 165375 | -17.6% | -17.7%, -19.2%, -15.6% | -2.1% |
| HTTP JSON POST | 86375 | 86227 | 0.8% | -6.3%, 4.1%, 1.5% | -3.0% |
| HTTP multipart upload | 293143 | 294674 | -0.9% | 9.1%, -2.6%, -0.9% | 4.9% |
| HTTP 503 error | 91433 | 95217 | 3.1% | 6.8%, 4.7%, -10.1% | 1.1% |

Reproduce with `node packages/vgaxios/bench/compare.cjs` or `bun`, using
`OUTPUT` to save a report and `CALIBRATION=1` for the upstream control. Verify
all eight files with `node packages/vgaxios/bench/summarize.cjs --verify-current`.
