# HTTPS proxy benchmark report

Measured on Apple M1 Pro (darwin arm64), October 29, 2026.
Baseline: `https-proxy-agent` 7.0.6, including its installed agent-base/debug tree.
VPM includes `vagent-base`, `vdebug` and `vms`.

Three fresh processes per runtime, 12 alternating paired rounds each, plus one
identical-upstream control process. Each variant warms for at least 200 ms plus
four full blocks; the upstream pilot targets 20 ms per block. Results are retained
and validated outside timing. Every raw report records versions, source hashes,
samples, iteration counts, hardware and methodology. Nothing is trimmed.

Times below are aggregate medians in nanoseconds per operation. Changes are
medians of paired ratios, so they need not equal the ratio of the displayed times.
The range spans the three process-level paired medians. Negative means less time.

## Node 24.22.1

| Case | Upstream ns | VPM ns | Paired change | Process range | Same-upstream control |
| --- | ---: | ---: | ---: | ---: | ---: |
| construct plain agent | 727 | 1,866 | 128.2% | 118.9% to 150.4% | -1.5% |
| construct authenticated agent | 1,125 | 2,744 | 122.2% | 111.2% to 156.4% | 0.9% |
| construct custom headers | 960 | 2,937 | 188.4% | 166.9% to 209.5% | 0.3% |
| short CONNECT headers | 1,018 | 1,481 | 44.9% | 29.7% to 46.1% | -0.7% |
| 16KiB CONNECT headers | 3,184 | 12,734 | 308.3% | 301.5% to 309.3% | 9.7% |
| 16KiB headers in 256-byte chunks | 91,015 | 53,896 | -40.0% | -41.7% to -39.3% | 3.7% |
| short headers in one-byte chunks | 36,451 | 4,161 | -88.8% | -89.1% to -88.4% | -0.1% |
| HTTP via HTTP proxy, keep-alive | 144,858 | 143,404 | -0.8% | -2.9% to 0.6% | 8.5% |
| HTTP via HTTP proxy, fresh tunnel | 392,968 | 386,451 | -1.4% | -2.3% to 1.5% | -0.6% |
| HTTP via HTTPS proxy, fresh tunnel | 6,218,741 | 6,153,354 | -1.3% | -2.1% to -0.8% | 0.3% |
| HTTPS via HTTP proxy, keep-alive | 208,838 | 192,537 | -6.3% | -11.1% to -2.1% | -3.0% |
| HTTPS via HTTP proxy, fresh tunnel | 6,950,766 | 7,233,042 | 0.8% | -1.9% to 13.6% | 2.7% |
| HTTPS via HTTPS proxy, fresh tunnel | 11,980,625 | 11,695,448 | -3.2% | -4.2% to 3.2% | -2.0% |
| eight queued HTTP requests | 1,902,660 | 1,660,602 | -6.8% | -15.5% to -2.3% | -0.5% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Process range | Same-upstream control |
| --- | ---: | ---: | ---: | ---: | ---: |
| construct plain agent | 488 | 914 | 86.7% | 84.4% to 87.0% | 0.6% |
| construct authenticated agent | 609 | 1,705 | 187.5% | 182.5% to 196.6% | 3.4% |
| construct custom headers | 543 | 1,537 | 180.4% | 168.4% to 185.5% | 2.1% |
| short CONNECT headers | 1,139 | 869 | -25.5% | -28.7% to -21.4% | 6.0% |
| 16KiB CONNECT headers | 7,402 | 14,458 | 97.5% | 81.5% to 109.1% | 2.4% |
| 16KiB headers in 256-byte chunks | 105,195 | 43,206 | -59.2% | -60.4% to -56.8% | -8.7% |
| short headers in one-byte chunks | 27,639 | 4,105 | -85.1% | -85.2% to -85.0% | 6.5% |
| HTTP via HTTP proxy, keep-alive | 119,543 | 119,198 | -1.9% | -5.8% to 5.9% | -0.8% |
| HTTP via HTTP proxy, fresh tunnel | 410,303 | 446,395 | 5.7% | 4.6% to 20.8% | 0.7% |
| HTTP via HTTPS proxy, fresh tunnel | 5,649,453 | 5,782,010 | 2.5% | 1.6% to 3.4% | -0.4% |
| HTTPS via HTTP proxy, keep-alive | 135,836 | 135,402 | 1.0% | -7.7% to 4.6% | -4.3% |
| HTTPS via HTTP proxy, fresh tunnel | 5,757,854 | 5,931,328 | 2.1% | 0.5% to 4.1% | 6.0% |
| HTTPS via HTTPS proxy, fresh tunnel | 11,120,125 | 10,826,830 | 0.4% | -4.1% to 2.1% | 2.3% |
| eight queued HTTP requests | 859,052 | 888,066 | 2.6% | -2.8% to 4.3% | 18.0% |

## Interpretation and limits

Fragmentation is the clear gain: 16 KiB headers in 256-byte reads take about
40% less time on Node and 59% less on Bun; byte-fragmented short headers take
89%/85% less. VPM avoids repeated prefix allocation and recursive parser reads.

Strict validation costs time on complete large fields: the single-chunk 16 KiB
case adds about 9.6 µs on Node and 7.1 µs on Bun. The printable-ASCII path retains
checks for every possible byte, including terminal control characters. Short
parsing adds 0.46 µs on Node and saves about 0.27 µs on Bun. Construction adds
about 1.1–2.0 µs on Node and 0.4–1.1 µs on Bun for validated, isolated configuration
and the VPM base lifecycle. Reusing an agent amortizes construction.

Node HTTPS keep-alive takes 6.3% less paired time and queued batches 6.8% less,
with substantial process spread. Other Node transport differences are small or
variable. Bun retains a 5.7% fresh HTTP tunnel regression (4.6–20.8% process range)
and 2.5% for HTTP through a fresh HTTPS proxy. Several same-upstream controls move
materially, including Node HTTP keep-alive at +8.5% and Bun queued batches at +18%;
these rows cannot support precise small-effect claims. No broad end-to-end
speedup is claimed.

Parser cases feed a prebuilt sequence through an EventEmitter socket double,
so each read preserves the chosen fragmentation and excludes network timing.
Transport cases use real loopback HTTP/HTTPS proxies and destinations, reading
the complete response body. Fresh cases disable keep-alive; the eight-request
batch shares a warm connection with maxSockets=1. Test certificate verification
is disabled equally for benchmark peers only. Local connections do not model
Internet latency, proxy load, bandwidth or production concurrency.

## Reproduce

From the repository root, after installing workspace and consumer fixtures:

```sh
OUTPUT=/tmp/proxy-node.json node packages/vhttps-proxy-agent/bench/compare.cjs
OUTPUT=/tmp/proxy-bun.json bun packages/vhttps-proxy-agent/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/proxy-control.json node packages/vhttps-proxy-agent/bench/compare.cjs
node packages/vhttps-proxy-agent/bench/summarize.cjs --verify-current
```

Run three independent measurement processes and one control on each runtime.
The summarizer verifies all eight checked-in reports against their recorded
source hashes and sample counts.
