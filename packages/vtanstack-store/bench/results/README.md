# Store measurements

Recorded November 8, 2026 on Node 24.22.1 and Bun 1.4.0 against Store 0.11.2;
the caller case uses unchanged Table 9.3.1. Four isolated AB/BA process pairs,
two identical-source control pairs, matched iterations, warmup and result
validation outside timing. Every sample and source hash is retained.

| Case                         | Node upstream → VPM (ns) | Paired change | Bun upstream → VPM (ns) | Paired change |
| ---------------------------- | -----------------------: | ------------: | ----------------------: | ------------: |
| Table9 sort 100 rows         |              8457 → 8435 |         -0.7% |             4772 → 4781 |            0% |
| Create store and read        |                  54 → 66 |           -2% |                 82 → 50 |        -39.1% |
| Cached computed read         |                    5 → 6 |           22% |                   4 → 5 |         11.3% |
| Subscribed diamond update    |                126 → 171 |           35% |               105 → 122 |         15.3% |
| Batched 16-column selection  |               759 → 1038 |         34.9% |               672 → 773 |         15.1% |
| Shallow table state equality |                278 → 118 |        -57.8% |                 48 → 28 |        -41.6% |

The unchanged Table sorting case has no established time difference on either
runtime. Shallow state comparison is faster on both; store creation is faster
on Bun but unestablished on Node. Node creation has substantial process/control
variation, so neither the ratio of aggregate medians nor one run is a speed claim.

There are remaining microbenchmark regressions: the 16-column batch is about
35% slower on Node and 15% on Bun; Bun's subscribed diamond is about 15% slower.
Bun's cached read also measures higher, by less than a nanosecond before rounding.
Node cached/diamond differences are unestablished against the control spread.
The design reuses stable dependency arrays, listener snapshots and notification
queues; changed branches alone allocate new dependency lists. This removed much
of the initial allocation cost while retaining exception recovery and complete
reentrant delivery. The remaining regressions are reported, not hidden by the
roughly even Table result.

These are JavaScript state operations and a 100-row sorting caller, excluding
browser layout, React rendering and module startup. They establish no production
latency or frame-rate improvement; app adoption has not happened.

```sh
bun scripts/store-conformance/build.cjs
OUTPUT=packages/vtanstack-store/bench/results/node.json node packages/vtanstack-store/bench/compare.cjs
OUTPUT=packages/vtanstack-store/bench/results/bun.json bun packages/vtanstack-store/bench/compare.cjs
```

[Node raw report](node.json) · [Bun raw report](bun.json)
