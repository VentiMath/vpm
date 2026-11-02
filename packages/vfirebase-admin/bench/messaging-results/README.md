# Completed Messaging runtime measurements

Recorded November 1, 2026 on Apple M1 Pro, Node 24.22.1 and Bun 1.4.0, against
firebase-admin 14.5.0. Each worker uses the actual public Messaging service with
synthetic successful/failed dispatch. No network requests, OAuth timing or FCM
delivery are measured. Inputs are reused; each implementation performs its own
normal copying, validation, discovery/cache lookup and result assembly.

The shared [process harness](../../../../scripts/bench-process.cjs) uses four
balanced AB/BA process pairs, two identical-source controls, warmup and result
validation outside timing, and untrimmed samples. Tests finish before timings
begin. Medians below are nanoseconds per complete CPU operation:

| Case | Node original → VPM | Bun original → VPM |
| --- | ---: | ---: |
| Three-recipient reminder multicast | 11,168 → 5,498 | 4,923 → 3,523 |
| 32-recipient v1 topic subscription | 11,654 → 9,740 | 10,493 → 8,632 |
| 32-recipient legacy topic subscription | 428 → 1,198 | 831 → 1,859 |

The reminder workload is lower in every comparison pair beyond control spread:
about **51% less time on Node and 28% less on Bun**. V1 topics establish about
18% less on Node; Bun's direction is unestablished because its process results
and controls vary. These findings do not establish faster network delivery.

**Legacy topic CPU time remains higher:** about 180% on Node (+770 ns) and
122% on Bun (+1,028 ns). VPM captures tokens, rejects inherited/sparse entries and
checks response cardinality/shape; the original shares the caller's array and
accepts incomplete results. Removing intermediate success objects reduced the
allocation cost, but these guarantees still have a measured cost. Empty legacy
envelopes continue to report zero outcomes for compatibility.

Reproduce serially after installing the pinned Firebase Admin fixture:

```sh
OUTPUT=packages/vfirebase-admin/bench/messaging-results/node.json node packages/vfirebase-admin/bench/messaging.cjs
OUTPUT=packages/vfirebase-admin/bench/messaging-results/bun.json bun packages/vfirebase-admin/bench/messaging.cjs
```

[node.json](node.json) and [bun.json](bun.json) contain source hashes, every raw
sample, process order and controls. `verify(report, packageRoot)` recomputes the
summaries and verifies source hashes. Earlier validation/send recordings are
historical; they predate this complete runtime.
