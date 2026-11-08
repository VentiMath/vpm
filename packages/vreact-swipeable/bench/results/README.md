# Isolated measurements

Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro; control is react-swipeable 7.0.2.
Fresh isolated workers run four balanced AB/BA pairs plus two identical-source
control pairs. Warmup and validation are outside timing; twelve raw rounds,
calibration and source hashes are retained. Direction is established only when
all comparison pairs agree beyond their controls.

| Workload | Node upstream → VPM (ns/op) | Bun upstream → VPM (ns/op) |
| --- | ---: | ---: |
| ten-move touch gesture | 1,338 → 860; 34.7% lower time | 1,596 → 537; 66.3% lower time |
| rotated directional touch gesture | 1,810 → 1,596; 12.5% lower time | 2,385 → 1,491; 37.2% lower time |
| mouse drag and cleanup | 1,783 → 1,851; 3.5% higher time | 2,014 → 1,184; 42.6% lower time |
| hook callback rerender with unchanged listeners | 382 → 138; 63.6% lower time | 345 → 125; 63.8% lower time |
| actual React server hook initialization | 1,683 → 1,269; 24.6% lower time | 1,476 → 1,093; 26.3% lower time |

The final ten-move touch workload takes 34.7% less paired time on Node and 66.3%
less on Bun. Rotated gestures, callback-only rerenders and real React server
initialization also improve beyond controls on both. Bun mouse tracking improves.

**Node mouse tracking costs 3.5% more paired time**, with a median increase of 68ns
per complete ten-move gesture (1,783 → 1,851ns). The measured path includes the
additional window-blur listener and reliable cleanup. Those correctness safeguards
remain enabled. This is a small processing regression, not an application or
browser input-latency measurement; no tuning claim hides it.

Bun touch controls were noisy (up to 34.4%); the final comparison directions still
exceed their corresponding controls in every pair. All samples are retained.
These final reports were rerun after the same-event ref-detachment guard changed
the runtime; the earlier source revision is not mixed into the results. Paired
percentages can differ from ratios of overall medians.

Gesture and rerender workloads invoke each public hook through the same deterministic
hook/host harness, with callback delivery and synthetic event listener dispatch.
The gesture workloads include start, ten moves and completion; the mouse case
includes document-listener attachment/removal. They isolate package operations;
they do not time React DOM scheduling, browser event dispatch or scrolling. The
last workload is actual production React 19.1 server rendering, separately labeled.
Setup and library loading are outside timing.

The implementation keeps scalar gesture state private and emits callback snapshots,
rather than repeatedly replacing the whole controller state. Listener configuration
is checked after commit; unchanged flags do not reattach listeners. Cancellation,
iframe ownership and private internal state remain enabled during these measurements.
No app latency, touch-device responsiveness or browser rendering speedup is claimed.

[Node raw samples](node-isolated.json) · [Bun raw samples](bun-isolated.json)

After installing the [fixture](../../../../scripts/swipeable-conformance/README.md):

```sh
OUTPUT=packages/vreact-swipeable/bench/results/node-isolated.json node packages/vreact-swipeable/bench/compare.cjs
OUTPUT=packages/vreact-swipeable/bench/results/bun-isolated.json bun packages/vreact-swipeable/bench/compare.cjs
```
