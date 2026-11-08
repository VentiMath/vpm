# Isolated measurements

Recorded with Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro; control is section-iterator 2.0.0.

Every timed implementation runs in a fresh process. Four comparison pairs balance
AB/BA order; two identical-source pairs measure control spread. All raw samples
are retained, with warmup and validation outside timing. A direction is established
only if every comparison agrees and exceeds the control spread.

| Workload | Node upstream → VPM (ns/op) | Bun upstream → VPM (ns/op) |
| --- | ---: | ---: |
| create flat ten-item iterator | 22 → 31; 43.3% higher time | 27 → 49; 78.8% higher time |
| create grouped iterator | 22 → 62; 186.1% higher time | 32 → 78; 144.7% higher time |
| flat keyboard cycle | 18 → 19; direction unestablished | 6 → 15; 137% higher time |
| grouped keyboard cycle | 22 → 28; 31.5% higher time | 15 → 24; 58.2% higher time |
| cross 200 empty sections | 69 → 28; 60.2% lower time | 79 → 34; 57.5% lower time |
| last-item checks | 13 → 12; direction unestablished | 22 → 19; direction unestablished |
| actual autosuggest key handler | 43 → 42; direction unestablished | 45 → 49; direction unestablished |

**This package is not a general performance win.** Crossing a synthetic run of
200 empty sections takes about 60% less time on Node and 58% less on Bun. Its
occupied-section index avoids the repeated scan. Small grouped cycles cost about
6 ns more on Node and 9 ns more on Bun; the Bun flat cycle costs about 9 ns more.

Construction also costs more: approximately +9 ns flat / +40 ns grouped on Node,
and +22 ns flat / +46 ns grouped on Bun. VPM validates counts and cursor shapes,
detaches the section-count array and builds its occupied-section index. Those are
deliberate correctness/storage tradeoffs; they are not hidden by the gap benchmark.

The complete unchanged react-autosuggest key handler has **no established timing
difference on either runtime**. The measured helper costs are tens of nanoseconds,
and no mounted-app or user-visible speed claim is made. If its future VPM caller
owns validated private cursor state, it can avoid repeated public-boundary checks
inside its own navigation implementation without weakening this public API.

The creation workload includes construction; traversal workloads reuse an iterator.
The caller workload executes the actual handler with synthetic controlled props,
not React DOM rendering. Source hashes cover the implementation, caller loader,
pinned upstream files, dependency lock and measurement harness.

[Node raw samples](node-isolated.json) · [Bun raw samples](bun-isolated.json)

Reproduce after installing the [fixture](../../../../scripts/section-iterator-conformance/README.md):

```sh
OUTPUT=packages/vsection-iterator/bench/results/node-isolated.json node packages/vsection-iterator/bench/compare.cjs
OUTPUT=packages/vsection-iterator/bench/results/bun-isolated.json bun packages/vsection-iterator/bench/compare.cjs
```
