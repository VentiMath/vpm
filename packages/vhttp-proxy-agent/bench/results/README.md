# vhttp-proxy-agent benchmark results

Compared with **http-proxy-agent 9.1.0** on Apple M1 Pro, macOS arm64,
Node **24.22.1** and Bun **1.4.0**, October 29, 2026 (local time).
Raw reports retain all samples, runtime versions, timestamps and source hashes.
Positive percentages mean VPM takes more time.

Each runtime has three fresh comparison processes and one identical-upstream
control. Each case uses 12 alternating paired rounds, 150 ms warmup per variant,
four full-block warmups and a 15 ms upstream pilot target, capped at 100,000
operations per block. Outputs are retained and checked outside timing. Times
below are median nanoseconds across 36 samples; changes are medians of paired
ratios, so they need not equal the ratio of the aggregate times. Process changes
show each run's paired median. Controls expose variation and are not subtracted.

All retained runs use the same source and fixture hashes. Development pilots
exposed port exhaustion and duplicate cleanup listeners in the proxy fixture;
both were corrected before the retained dataset. The first Node sample was
rerun separately because its start briefly overlapped the prior pilot's final
control. Final measurements run sequentially without competing tests; no samples
are trimmed or selected by performance outcome.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| construct plain | 791 | 2,159 | +161.7% | +139.4%, +162.3%, +171.5% | -0.5% |
| construct authenticated | 1,052 | 3,028 | +213.1% | +188.7%, +189.9%, +232.5% | +0.1% |
| construct custom headers | 909 | 2,552 | +172.9% | +200.1%, +166.0%, +153.2% | +0.3% |
| prepare simple target | 1,165 | 663 | -47.6% | -45.2%, -45.9%, -50.5% | -0.1% |
| prepare complex target | 1,337 | 686 | -49.1% | -50.7%, -48.0%, -50.3% | +0.0% |
| prepare authenticated headers | 1,885 | 922 | -52.1% | -48.9%, -53.0%, -52.6% | +0.7% |
| prepare dynamic headers | 1,231 | 1,205 | -5.1% | -6.7%, -5.7%, -2.3% | +0.2% |
| HTTP proxy keep-alive GET | 237,166 | 181,884 | -21.5% | -24.3%, -20.2%, -21.1% | +2.6% |
| HTTP proxy fresh GET | 339,202 | 287,635 | -15.9% | -15.4%, -13.8%, -23.7% | -4.5% |
| TLS proxy keep-alive GET | 238,920 | 190,753 | -21.4% | -20.3%, -20.4%, -29.0% | -0.5% |
| TLS proxy fresh GET | 6,469,812 | 6,358,035 | -0.6% | -1.4%, -0.4%, +0.1% | +0.2% |
| HTTP GET with a new agent | 340,233 | 316,874 | -11.0% | -17.0%, -14.8%, -6.9% | +7.3% |
| 64KiB streamed POST, eight chunks | 508,332 | 496,899 | -7.7% | -7.1%, -6.8%, -8.8% | -2.3% |
| eight queued GETs | 1,688,826 | 1,271,102 | -21.6% | -21.6%, -18.7%, -26.4% | -2.4% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| construct plain | 642 | 1,158 | +82.1% | +97.7%, +73.3%, +99.5% | +3.4% |
| construct authenticated | 664 | 1,831 | +182.5% | +176.7%, +175.6%, +184.9% | -2.0% |
| construct custom headers | 597 | 1,658 | +179.0% | +153.6%, +186.8%, +184.2% | -1.3% |
| prepare simple target | 515 | 298 | -41.5% | -43.7%, -42.2%, -40.8% | -0.7% |
| prepare complex target | 562 | 412 | -31.3% | -30.7%, -26.2%, -38.5% | +0.2% |
| prepare authenticated headers | 1,297 | 554 | -58.6% | -58.9%, -55.7%, -58.0% | +1.7% |
| prepare dynamic headers | 609 | 672 | +10.7% | +12.6%, +8.5%, +17.8% | +1.0% |
| HTTP proxy keep-alive GET | 152,768 | 140,480 | -6.9% | -10.5%, -6.9%, -4.7% | +5.0% |
| HTTP proxy fresh GET | 268,801 | 268,746 | -2.4% | -3.7%, -1.3%, -3.2% | -0.5% |
| TLS proxy keep-alive GET | 167,720 | 153,483 | -9.9% | -11.5%, -11.6%, -7.3% | -3.1% |
| TLS proxy fresh GET | 5,649,986 | 5,643,819 | +0.3% | +0.2%, +0.3%, +0.3% | -1.1% |
| HTTP GET with a new agent | 279,033 | 284,684 | +3.3% | +3.1%, +4.1%, +3.0% | +0.5% |
| 64KiB streamed POST, eight chunks | 458,237 | 437,738 | -4.1% | -3.7%, -4.2%, -4.8% | -4.7% |
| eight queued GETs | 1,273,627 | 1,174,452 | -9.3% | -10.4%, -9.6%, -8.4% | -1.2% |

## Interpretation and remaining costs

Node request preparation takes **48–52% less time** for simple, complex and
authenticated cases; dynamic headers improve about 5%. HTTP/TLS keep-alive
requests and queued batches take about **21–22% less paired time**, with all
three processes improving. Fresh HTTP requests improve 16%. Requests including
a new agent improve 11%, with a noisier +7.3% control; streamed 64 KiB uploads
improve 8%. Fresh TLS handshakes show no clear change.

Bun simple, complex and authenticated preparation improves **31–59%**.
TLS-proxy keep-alive requests improve about **10%**, and queued batches 9%.
Plain keep-alive improves 7%, but its 5% control cautions against a precise speedup
claim. Fresh HTTP improves 2%, a small effect. Uploads improve 4%, about the same
size as their control variation; fresh TLS handshakes are effectively unchanged.

Construction remains slower: plain setup adds about **1.4 microseconds on Node**
and **0.5 on Bun**; authenticated/custom-header setup adds **1.6–2.0 / 1.1–1.2
microseconds**. Validation, detached configuration and private lifecycle state
are retained. Basic credentials are prepared once during construction, so the
cost moves out of repeated request preparation. Bun dynamic header preparation
adds about **63 ns** (+11%), including per-request validation and snapshots.
Bun complete GETs that construct a new agent are **3.3% slower** (about 5.7 µs),
positive in all three runs versus a +0.5% control. This remains a measured
regression, relevant because teeny-request currently constructs proxy agents per
request. These are local measurements, not an application throughput forecast.

## Workloads

Construction includes each implementation's own agent/debug dependencies.
Preparation uses small request doubles with the actual `setRequestProps()` API;
these isolate request-target and header work, not network throughput. Simple and
complex targets have no credentials; the authenticated case has Basic credentials
and one custom field; the dynamic case has a fresh header-provider result.

Complete requests traverse real loopback HTTP or TLS proxies to a local HTTP
origin. The fixture reuses its proxy-to-origin connection equally for both sides,
strips hop-by-hop Connection headers and tracks each socket once. Client-to-proxy
fresh cases disable keep-alive; the per-request-agent case includes construction
and destruction. Queued batches issue eight GETs with `maxSockets: 1`. POSTs
send eight chunks totaling 64 KiB and check exact bytes. TLS fixture verification
is disabled equally for benchmark certificates; verification and CA trust have
separate correctness tests. No cloud service is contacted. The benchmark reports
raw elapsed time, without normalizing away validation or lifecycle costs.

## Reproduce

```sh
npm --prefix scripts/http-proxy-conformance ci --ignore-scripts
OUTPUT=packages/vhttp-proxy-agent/bench/results/node-1.json node packages/vhttp-proxy-agent/bench/compare.cjs
OUTPUT=packages/vhttp-proxy-agent/bench/results/bun-1.json bun packages/vhttp-proxy-agent/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vhttp-proxy-agent/bench/results/node-control.json node packages/vhttp-proxy-agent/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vhttp-proxy-agent/bench/results/bun-control.json bun packages/vhttp-proxy-agent/bench/compare.cjs
node packages/vhttp-proxy-agent/bench/summarize.cjs --verify-current
```

Repeat comparison runs in fresh processes with suffixes `-2` and `-3`, sequentially.
Source changes require new measurements; raw reports are never relabeled.
