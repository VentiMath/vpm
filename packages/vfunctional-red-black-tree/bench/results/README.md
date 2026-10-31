# vfunctional-red-black-tree measurements

Recorded October 31, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.0, against functional-red-black-tree 1.0.1. Node 24 was
not available on this machine. Three fresh processes per runtime, 12 alternating
paired rounds per case, 150 ms warmup per variant plus four full warmup blocks.
Iterations use a 15 ms upstream pilot target capped at 100,000. Outputs are
retained and validated outside timing. One additional process per runtime
compares identical upstream implementations. No trimming.

Each variant runs freshly compiled case code, including its comparator, and the
harness compiles a separate measurement loop per variant. The second process on
each runtime sets up VPM first; the others set up upstream first. With shared
closures, the second implementation measured is penalized by polymorphic call
sites: two identical copies of this package measured 10-24% apart, which first
appeared here as a false 23% `get` regression. The identical-upstream control
cannot detect that effect, because it passes the same module twice.

Values are pooled median nanoseconds per operation. Changes are medians of paired
sample ratios. Negative means less time. Controls show identical-upstream drift;
on this VM they reach about ±6%, so smaller differences are not established.
Inputs, including the Firestore Watch change pattern (find and remove the old
entry, insert the new one, read its index), are defined in
[the benchmark](../compare.cjs).

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| build / 1,000 sequential inserts | 499,152 | 495,332 | -0.4% | -1.9%, -0.1%, +0.1% | -3.5% |
| build / 1,000 shuffled inserts | 410,009 | 403,745 | -0.3% | -0.2%, -6.1%, +0.0% | -6.0% |
| lookup / 64 get in 10,000 | 3,487 | 3,318 | -3.0% | -1.7%, -5.7%, -1.0% | +2.8% |
| lookup / 64 find().index in 10,000 | 9,529 | 9,267 | -0.2% | +1.0%, -0.6%, -1.3% | -4.8% |
| position / 64 at() in 10,000 | 9,647 | 9,271 | -4.2% | -5.3%, -5.4%, -3.5% | -3.0% |
| traverse / keys of 1,000 | 15,488 | 14,618 | -6.4% | -5.8%, -5.9%, -12.6% | -1.6% |
| traverse / forEach range 250-750 | 4,817 | 4,510 | -7.8% | -9.7%, -6.8%, -9.5% | -0.5% |
| remove / 64 persistent removals from 1,000 | 24,615 | 26,897 | -1.3% | -0.3%, -1.5%, -1.3% | +0.3% |
| Firestore Watch / 100 document changes in 1,000 | 227,761 | 215,506 | +0.5% | -0.7%, -3.3%, +1.3% | +3.0% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| build / 1,000 sequential inserts | 1,295,851 | 1,143,254 | -4.1% | -0.2%, -6.4%, -4.6% | -4.2% |
| build / 1,000 shuffled inserts | 1,117,934 | 965,868 | -5.8% | -7.1%, -2.6%, -3.3% | +0.9% |
| lookup / 64 get in 10,000 | 2,838 | 2,853 | -0.6% | -2.1%, -1.5%, +1.9% | -2.2% |
| lookup / 64 find().index in 10,000 | 20,621 | 20,129 | +0.8% | -0.8%, +4.5%, +4.3% | +5.2% |
| position / 64 at() in 10,000 | 12,352 | 13,139 | -3.4% | -3.0%, +2.7%, -9.0% | +0.6% |
| traverse / keys of 1,000 | 14,929 | 14,632 | +3.6% | -7.4%, +4.9%, +3.6% | -1.1% |
| traverse / forEach range 250-750 | 3,499 | 3,497 | -7.7% | -10.3%, -5.1%, -7.4% | +0.4% |
| remove / 64 persistent removals from 1,000 | 71,609 | 70,796 | -1.8% | +0.5%, +0.1%, -7.3% | +1.7% |
| Firestore Watch / 100 document changes in 1,000 | 536,740 | 500,981 | -1.4% | +3.8%, -3.2%, -1.9% | +0.3% |

`node packages/vfunctional-red-black-tree/bench/summarize.cjs --verify-current`
checks that all eight reports cover the same cases and that the recorded source
hashes match the current files.
