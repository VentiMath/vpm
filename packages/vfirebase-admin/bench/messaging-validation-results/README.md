# Messaging validation measurements

Recorded November 1, 2026 on Apple M1 Pro, Node 24.22.1 / Bun 1.4.0, against
firebase-admin 14.5.0. Four balanced process pairs plus two identical-source
controls use the [shared harness](../../../../scripts/bench-process.cjs), with
fixed iteration counts within pairs, warmup/validation outside timing and all
raw samples retained. Each process times only one implementation.

| Case | Node original → VPM (ns) | Bun original → VPM (ns) |
| --- | ---: | ---: |
| Application reminder payload | 311 → 467 | 242 → 148 |
| Android topic normalization | 1,071 → 1,941 | 301 → 586 |

All four directions clear the harness's control-spread check. The reminder
validation is about 51% slower on Node (+156 ns), 38% faster on Bun. Android
conversion is about 82% slower on Node (+870 ns) and 98% slower on Bun (+285 ns).
These are **remaining regressions**, not an overall speedup. The implementation
precomputes field mappings, but still validates JSON records, checks collisions,
and defers mutations until every branch validates. It does not sacrifice those
checks for a lower microbenchmark result.

The first case uses the notification/data/APNs sound shape in VentiMath's reminder
callers. Both implementations construct the same fresh input within timing. The
second includes TTL and Android field conversion. These figures exclude snapshot
copying, project discovery, network I/O and delivery; they cannot establish an
end-to-end latency change or an application regression.

Reproduce serially from the repository root:

```sh
npm --prefix scripts/firebase-admin-conformance ci --ignore-scripts --no-audit --no-fund
OUTPUT=packages/vfirebase-admin/bench/messaging-validation-results/node.json node packages/vfirebase-admin/bench/messaging-validation.cjs
OUTPUT=packages/vfirebase-admin/bench/messaging-validation-results/bun.json bun packages/vfirebase-admin/bench/messaging-validation.cjs
```

[node.json](node.json) and [bun.json](bun.json) retain runtime, source hashes,
raw samples, process order and controls. `verify(report, packageRoot)` in the
harness recomputes the summaries and verifies source hashes.
