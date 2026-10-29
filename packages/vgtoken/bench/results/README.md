# vgtoken benchmark evidence

Compared with gtoken 7.1.0 using the shared paired runner: three fresh processes
and one identical-upstream control for each runtime. Each case warms both variants,
then retains 12 alternating rounds. Reports include all samples, runtime/CPU,
calibration state and source hashes. Results are nanoseconds per operation;
negative percentage changes mean less time.

Measurements recorded on 2026-10-29, Apple M1 Pro/macOS arm64, Node 24.22.1
and Bun 1.4.0. Changes are medians of paired ratios across all three processes.

| Case | Node upstream → VPM | Node change | Bun upstream → VPM | Bun change |
| --- | ---: | ---: | ---: | ---: |
| Construction | 289 → 79 ns | −70.8% | 125 → 58 ns | −52.7% |
| Cached token | 342 → 116 ns | −66.1% | 320 → 81 ns | −74.9% |
| Expiry check | 63 → 48 ns | −23.2% | 52 → 40 ns | −21.0% |
| Signed refresh, reused client | 251.7 → 120.1 µs | −52.4% | 177.4 → 121.8 µs | −31.3% |
| Signed refresh, new client | 252.5 → 256.1 µs | +2.2% | 176.8 → 178.0 µs | +0.4% |
| Eight concurrent forced refreshes | 2013.5 → 124.1 µs | −93.8% | 1408.0 → 125.3 µs | −91.1% |
| Local HTTP signed refresh | 460.4 → 309.1 µs | −32.1% | 325.4 → 301.4 µs | −6.1% |

Node's new-client exchange remains slightly slower: +0.7% to +3.0% across
processes, with a −0.1% identical-upstream control. It receives the new validation,
deadline and cancellation handling but cannot reuse a key. Bun's +0.4% aggregate
crossed zero between processes (−0.5% to +2.5%). Reused-client gains were consistent:
−52.0% to −52.9% on Node and −30.9% to −32.3% on Bun. HTTP gains were more variable,
especially on Bun (−2.6% to −15.1%). Controls ranged from −5.3% to +0.8% on Node
and −3.7% to +5.2% on Bun; consult raw samples before interpreting small changes.

The reused-client case caches the imported RSA key; the new-client case must
import it each time. The eight-call forced-refresh case measures an intentional
behavior change: upstream performs eight exchanges, VPM shares one. Every caller
still receives a token. HTTP measurements use a loopback server with a keep-alive
agent and each client's installed default transport. On Bun, upstream's bare
node-fetch resolves to Bun's compatibility module. No real Google endpoint or
service credentials are used in benchmarks.

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT=packages/vgtoken/bench/results/$runtime-$run.json $runtime packages/vgtoken/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT=packages/vgtoken/bench/results/$runtime-control.json $runtime packages/vgtoken/bench/compare.cjs
done
node packages/vgtoken/bench/summarize.cjs --verify-current
```
