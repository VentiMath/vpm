# vfunctional-red-black-tree measurements

Recorded October 31, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.0, against functional-red-black-tree 1.0.1. Node 24 was
not available on this machine. Three fresh processes per runtime, 12 alternating
paired rounds per case, 150 ms warmup per variant plus four full warmup blocks.
Iterations use a 15 ms upstream pilot target capped at 100,000. Outputs are
retained and validated outside timing. One additional process per runtime
compares identical upstream implementations. No trimming.

Each variant runs freshly compiled case code, including its comparator. With
shared closures, the second implementation measured is penalized by polymorphic
call sites: two identical copies of this package measured 10-24% apart, which
first appeared here as a false 23% `get` regression. The identical-upstream
control cannot detect that effect, because it passes the same module twice.

Values are pooled median nanoseconds per operation. Changes are medians of paired
sample ratios. Negative means less time. Controls show identical-upstream drift;
on this VM they reach about ±10% on Bun, so smaller Bun differences are not
meaningful. Inputs, including the Firestore Watch change pattern (find and remove
the old entry, insert the new one, read its index), are defined in
[the benchmark](../compare.cjs).

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| build / 1,000 sequential inserts | 614,441 | 624,582 | +1.9% | +0.9%, +2.0%, +1.8% | +0.2% |
| build / 1,000 shuffled inserts | 438,291 | 422,286 | -0.8% | -0.8%, +0.4%, -1.8% | +1.7% |
| lookup / 64 get in 10,000 | 3,128 | 3,245 | +2.5% | +1.0%, +1.4%, +6.3% | +4.8% |
| lookup / 64 find().index in 10,000 | 9,428 | 9,302 | -2.4% | -3.9%, +0.9%, -0.5% | -0.8% |
| position / 64 at() in 10,000 | 12,769 | 11,660 | -10.5% | -10.8%, -14.1%, -9.5% | -0.4% |
| traverse / keys of 1,000 | 20,551 | 19,537 | -6.4% | -10.2%, -3.7%, -9.9% | -1.9% |
| traverse / forEach range 250-750 | 9,057 | 7,385 | -18.2% | -19.4%, -18.5%, -12.7% | +2.1% |
| remove / 64 persistent removals from 1,000 | 23,662 | 24,556 | +0.7% | -0.4%, +0.6%, +0.7% | -0.5% |
| Firestore Watch / 100 document changes in 1,000 | 266,021 | 257,836 | -1.4% | -1.4%, +1.0%, -4.6% | -1.2% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| build / 1,000 sequential inserts | 780,692 | 730,819 | -6.3% | -13.0%, +4.3%, -6.3% | -2.4% |
| build / 1,000 shuffled inserts | 723,874 | 679,728 | -5.6% | -5.6%, -6.4%, -5.6% | +10.2% |
| lookup / 64 get in 10,000 | 3,397 | 3,230 | +1.3% | +7.1%, -2.7%, +1.3% | -0.5% |
| lookup / 64 find().index in 10,000 | 13,328 | 13,329 | -0.1% | -0.6%, +2.0%, -0.7% | -2.5% |
| position / 64 at() in 10,000 | 12,916 | 12,237 | -3.4% | -3.9%, +0.9%, -3.2% | -1.1% |
| traverse / keys of 1,000 | 15,651 | 16,432 | +7.4% | +5.1%, +12.7%, +8.4% | +8.1% |
| traverse / forEach range 250-750 | 3,484 | 3,476 | -8.9% | -21.2%, -8.7%, -5.3% | -1.4% |
| remove / 64 persistent removals from 1,000 | 53,347 | 52,063 | -1.5% | -5.1%, -4.4%, +4.2% | +1.5% |
| Firestore Watch / 100 document changes in 1,000 | 357,662 | 324,672 | -3.5% | -7.7%, +0.1%, +5.2% | -7.5% |

`node packages/vfunctional-red-black-tree/bench/summarize.cjs --verify-current`
checks that all eight reports cover the same cases and that the recorded source
hashes match the current files.
