# vjwks-rsa 4.1.0 comparison

Compared with unmodified `jwks-rsa` **4.1.0**, with real Firebase Admin **14.5.0**
callers. Recorded October 30, 2026 on Apple M1 Pro, macOS arm64, Node 24.22.1
and Bun 1.4.0. These are package and local HTTP measurements, not production
latency promises. The [3.2.2 report](../README.md) remains historical evidence.

## Method

The [harness](../../compare.cjs) uses three fresh processes per runtime plus
one identical-upstream control. Each case warms each variant for at least 200 ms,
then four complete blocks. Twelve paired rounds alternate execution order. An
upstream pilot targets 20 ms per block, capped at 100,000 operations; both
variants use the same count. Every sample is retained without trimming.

Returned values are retained and consumed. Outputs are validated before and
after timing; PEMs are compared by SPKI bytes because Bun's native export and
upstream WebCrypto differ by a trailing newline. The eight-key fixture alternates
RSA and EC material under distinct IDs. Concurrent cases use fresh clients;
custom-fetch cases assert eight upstream fetches versus one VPM fetch. HTTP
cases use equivalent keep-alive agents and one loopback server, without internet
requests. The fallback-enabled cache case times fresh hits, not outage handling.

Firebase refresh runs the actual SDK `JwksFetcher.refresh()`, importing and
exporting all eight keys. Cached verification uses its real
`PublicKeySignatureVerifier` and stock `jsonwebtoken`, after one initial key
fetch. This isolates the JWKS substitution from VPM's other JWT packages.

Time changes are medians of 36 paired VPM/upstream ratios. Process ranges retain
the three fresh-process medians. Negative percentages mean less time. Controls
compare upstream with itself and are noise checks, not corrections to results.
Raw reports retain source/dependency hashes, runtime, CPU, counts and samples.

## Node 24

| Operation | Upstream ns | VPM ns | Paired time change | Process range | Control |
| --- | ---: | ---: | ---: | ---: | ---: |
| client creation | 11,411 | 839 | -92.6% | -92.7% to -92.5% | -2.2% |
| cached key Promise | 13,755 | 141 | -99.0% | -99.0% to -98.6% | +2.2% |
| cached key with fallback enabled | 14,416 | 133 | -99.1% | -99.1% to -99.0% | +1.5% |
| cached key callback | 16,628 | 276 | -98.4% | -98.4% to -98.3% | -0.9% |
| RSA import and PEM | 57,530 | 35,036 | -38.4% | -39.3% to -38.4% | -0.6% |
| EC import and PEM | 79,418 | 66,148 | -16.3% | -17.7% to -15.8% | -0.3% |
| eight-key import and PEM | 553,153 | 394,147 | -28.4% | -29.8% to -27.6% | +0.0% |
| repeated PEM export | 15 | 13 | -8.6% | -9.4% to -8.0% | +0.5% |
| concurrent eight-kid misses | 4,505,542 | 436,779 | -90.4% | -90.7% to -90.1% | -1.0% |
| missing-kid rejection | 61,988 | 11,846 | -81.4% | -81.9% to -81.1% | -0.2% |
| Express cached key provider | 14,263 | 263 | -98.2% | -98.2% to -98.1% | +0.4% |
| HTTP sequential key miss | 743,500 | 299,313 | -59.2% | -60.1% to -59.2% | -2.1% |
| HTTP concurrent eight-kid misses | 5,036,255 | 612,807 | -87.9% | -88.2% to -87.6% | -1.3% |
| Firebase Admin JWKS refresh | 731,131 | 563,749 | -22.3% | -23.1% to -22.2% | -1.0% |
| Firebase Admin cached signature verification | 41,840 | 41,934 | -0.1% | -0.4% to +0.4% | +0.4% |

## Bun 1.4

| Operation | Upstream ns | VPM ns | Paired time change | Process range | Control |
| --- | ---: | ---: | ---: | ---: | ---: |
| client creation | 3,550 | 432 | -87.9% | -88.3% to -87.4% | -1.2% |
| cached key Promise | 1,116 | 110 | -90.0% | -90.4% to -89.8% | +0.4% |
| cached key with fallback enabled | 1,112 | 112 | -89.9% | -90.1% to -89.6% | +0.4% |
| cached key callback | 2,020 | 251 | -87.3% | -87.7% to -86.2% | -1.3% |
| RSA import and PEM | 4,836 | 4,430 | -10.8% | -13.0% to -9.2% | +0.2% |
| EC import and PEM | 11,573 | 11,391 | -1.2% | -3.1% to -0.9% | +0.3% |
| eight-key import and PEM | 63,859 | 55,967 | -13.0% | -16.4% to -9.8% | -0.8% |
| repeated PEM export | 12 | 11 | -5.5% | -9.7% to +92.0% | +0.5% |
| concurrent eight-kid misses | 569,839 | 68,341 | -88.3% | -88.6% to -85.8% | +0.8% |
| missing-kid rejection | 9,349 | 3,729 | -59.5% | -64.2% to -59.2% | -3.2% |
| Express cached key provider | 1,321 | 306 | -77.0% | -77.9% to -74.8% | -0.9% |
| HTTP sequential key miss | 153,885 | 96,914 | -38.1% | -40.1% to -36.1% | -2.7% |
| HTTP concurrent eight-kid misses | 970,055 | 148,813 | -84.7% | -85.0% to -84.3% | -2.1% |
| Firebase Admin JWKS refresh | 151,471 | 139,242 | -8.3% | -11.3% to -7.6% | +0.8% |
| Firebase Admin cached signature verification | 23,538 | 23,436 | -0.4% | -1.2% to +1.9% | -2.3% |

## Interpretation

Node fresh RSA/EC imports take about 38%/16% less time; cached Promise lookup
about 99% less. The earlier RSA and missing-key regressions against **3.2.2**
are not present against the **4.1.0** comparison target. That is a new baseline,
not evidence that the VPM importer itself became faster in this commit.

Firebase Admin key refresh takes about **22% less time on Node** and **8% less
on Bun**. Its ordinary cached signature verification is effectively unchanged:
process ranges cross zero and changes are within the control scale. Admin keeps
its own six-hour cache, so key-refresh gains do not apply to every request.

Concurrent eight-ID HTTP misses improve about 88% on Node and 85% on Bun, helped
by one shared fetch/import. Bun EC import is nearly flat. Repeated PEM access is
only around a dozen nanoseconds, and one Bun process reverses the direction;
no practical improvement is claimed for that case. Outage fallback correctness
is verified separately; serving stale keys is not presented as a speed gain.

## Reproduce

```sh
npm --prefix scripts/jwks-conformance ci --ignore-scripts
OUTPUT=/tmp/jwks-node-1.json node packages/vjwks-rsa/bench/compare.cjs
OUTPUT=/tmp/jwks-bun-1.json bun packages/vjwks-rsa/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/jwks-control.json node packages/vjwks-rsa/bench/compare.cjs
node packages/vjwks-rsa/bench/summarize.cjs --verify-current
```

Run three measurements plus one control in fresh processes on each runtime.
The summarizer reads the eight reports in this directory and verifies their
case/source consistency; `--verify-current` also checks current source hashes.

[bun-1.json](bun-1.json), [bun-2.json](bun-2.json), [bun-3.json](bun-3.json), [bun-control.json](bun-control.json), [node-1.json](node-1.json), [node-2.json](node-2.json), [node-3.json](node-3.json), [node-control.json](node-control.json).
