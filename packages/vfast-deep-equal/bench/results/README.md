# vfast-deep-equal measurements

Recorded October 30, 2026 on Apple M1 Pro / macOS arm64 with Node 24.22.1 and
Bun 1.4.0, against fast-deep-equal 3.1.3. Three fresh processes per runtime,
12 alternating paired rounds per case, 150 ms warmup per variant plus four full
warmup blocks. Iterations use a 15 ms upstream pilot target capped at 100,000.
Outputs are retained and validated outside timing. One additional process per
runtime compares identical upstream implementations. No trimming; no other test
suites ran during these measurements.

Values are pooled median nanoseconds per operation. Changes are medians of paired
sample ratios, so they need not match the ratio of the displayed medians. Negative
means less time. Controls show identical-upstream drift. Map and Set cases use the
upstream ES6 entry point; the React case uses its React entry point; remaining
cases use the default comparator. Inputs and seven actual Firestore 9.4.0 SDK
comparison paths are defined in [the benchmark](../compare.cjs).

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Per-process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| primitive / equal | 8 | 8 | -0.1% | -0.4%, +0.9%, -0.5% | +0.0% |
| record / small equal | 122 | 105 | -13.8% | -13.9%, -11.3%, -14.1% | -0.2% |
| record / changed value | 73 | 58 | -20.9% | -21.0%, -20.0%, -21.0% | -0.6% |
| record / missing key | 33 | 34 | +2.1% | +2.2%, +1.5%, +2.6% | -2.1% |
| record / nested 64 fields | 15,413 | 14,426 | -6.2% | -7.2%, -5.4%, -5.2% | -0.1% |
| array / 32 records | 2,813 | 2,581 | -7.9% | -7.3%, -8.9%, -7.4% | -0.1% |
| Buffer / equal 1KiB | 326 | 113 | -65.2% | -65.1%, -65.6%, -65.2% | +0.2% |
| Map / nested 32 entries | 4,533 | 5,432 | +19.5% | +19.1%, +20.0%, +19.5% | -0.6% |
| Set / 32 primitives | 434 | 354 | -18.0% | -19.1%, -18.6%, -17.9% | +0.1% |
| React / equal element | 191 | 180 | -5.6% | -5.7%, -5.4%, -5.9% | +0.5% |
| Firestore / equal document | 1,240 | 1,156 | -7.4% | -7.7%, -7.4%, -6.7% | +0.3% |
| Firestore / changed document | 1,104 | 1,027 | -6.7% | -7.7%, -6.3%, -6.7% | -0.1% |
| Firestore / equal query | 1,345 | 1,245 | -7.7% | -8.1%, -6.4%, -7.8% | -0.3% |
| Firestore / changed filter | 213 | 206 | -3.6% | -3.0%, -5.5%, -3.1% | +0.6% |
| Firestore / arrayUnion | 126 | 115 | -9.3% | -9.9%, -7.7%, -11.1% | +0.1% |
| Firestore / arrayRemove | 119 | 114 | -3.7% | -5.1%, -2.9%, -3.9% | -0.1% |
| Firestore / aggregate query | 1,791 | 1,621 | -9.4% | -9.3%, -9.7%, -8.8% | -0.4% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| primitive / equal | 10 | 10 | +2.4% | +2.5%, +2.5%, +1.1% | -0.1% |
| record / small equal | 51 | 44 | -14.4% | -15.1%, -15.4%, -9.4% | +0.1% |
| record / changed value | 38 | 35 | -9.6% | -9.3%, -8.8%, -10.0% | +0.6% |
| record / missing key | 29 | 30 | +3.7% | +4.7%, +3.4%, +2.0% | +0.9% |
| record / nested 64 fields | 4,806 | 4,624 | -3.4% | -3.1%, -1.4%, -4.8% | -0.3% |
| array / 32 records | 1,260 | 1,192 | -6.2% | -5.0%, -6.0%, -6.2% | +0.3% |
| Buffer / equal 1KiB | 437 | 53 | -87.8% | -87.8%, -87.9%, -87.6% | -2.1% |
| Map / nested 32 entries | 3,026 | 2,612 | -12.5% | -2.5%, -11.8%, -14.7% | +0.2% |
| Set / 32 primitives | 304 | 241 | -20.2% | -20.0%, -20.0%, -20.3% | +1.9% |
| React / equal element | 86 | 55 | -34.6% | -41.1%, -34.6%, -33.6% | -1.2% |
| Firestore / equal document | 658 | 711 | +8.5% | +7.1%, +9.0%, +7.6% | +0.8% |
| Firestore / changed document | 614 | 668 | +9.0% | +8.3%, +9.1%, +9.4% | +0.7% |
| Firestore / equal query | 687 | 865 | +25.2% | +67.8%, +14.7%, +79.3% | +0.2% |
| Firestore / changed filter | 135 | 151 | +11.8% | +17.8%, +11.8%, +1.5% | -0.3% |
| Firestore / arrayUnion | 84 | 84 | +1.0% | +2.0%, +1.7%, -1.3% | -0.5% |
| Firestore / arrayRemove | 82 | 88 | +7.0% | +9.5%, +7.0%, +4.9% | +0.2% |
| Firestore / aggregate query | 914 | 996 | +10.1% | +10.2%, +10.8%, +7.7% | -0.5% |

## Interpretation and limits

The byte comparator fixes real false positives and avoids UTF-8 allocations.
The 1 KiB Buffer case takes **65% less time on Node and 88% less on Bun**.
Small equal records improve 14% on each runtime. The seven measured Firestore
comparisons take **4–9% less time on Node**. On Bun, array-union equality is
approximately level, while other callers remain **7–25% slower** in pooled
results. The query case is especially unstable: per-process changes range from
**+15% to +79%**. These are retained regressions, not equivalent control noise.
The nested Map case is **20% slower on Node** (4.53 → 5.43 µs), but 13% faster
on Bun. Missing-key rejection adds about 1 ns on either runtime.

These results measure equality CPU time, not Firestore network requests. Ordinary
records, containers and SDK callers must be considered separately; a faster
standalone helper does not establish faster application requests. In particular,
remaining positive changes in the caller table are regressions, not hidden by the
buffer improvement. Percentages on operations lasting only tens of nanoseconds
should also be read alongside their absolute times and control drift.

The [first complete paired run](before-caller-tuning/) exposed Bun caller
regressions and is retained with its original hashes. Subsequent tuning moved
uncommon type handling out of the ordinary recursion path. The tables above use
the final code, with fresh samples and controls; the earlier hashes deliberately
do not match today's implementation. The intermediate exploratory timing runs
were diagnostics, not substituted for samples in either complete report.

Every raw report records runtime, CPU, all samples and source hashes. The hashes
cover the comparator, generator, benchmark, caller loader, shared timing harness
and locked upstream/Firestore fixtures. Upstream cannot correctly compare all of
the fixed inputs: differing invalid UTF-8 bytes return a wrong answer and ES6
DataView comparison hangs. Those are covered by regression tests, not presented
as meaningful speed ratios.

```sh
for runtime in node bun; do
  for sample in 1 2 3; do
    OUTPUT="packages/vfast-deep-equal/bench/results/$runtime-$sample.json" "$runtime" packages/vfast-deep-equal/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT="packages/vfast-deep-equal/bench/results/$runtime-control.json" "$runtime" packages/vfast-deep-equal/bench/compare.cjs
done
node packages/vfast-deep-equal/bench/summarize.cjs --verify-current
```
