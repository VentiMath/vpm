# Transition measurements

Node 24.22.1 and Bun 1.4.4; React 19.1.0, production mode. The baseline is
react-transition-group 4.4.5. Times are nanoseconds per complete operation;
negative changes mean less time.

| Operation | Node upstream → VPM | Change | Bun upstream → VPM | Change |
| --- | ---: | ---: | ---: | ---: |
| SSR 1 explicit-ref transitions | 3,411 → 2,432 | -28.5% | 2,643 → 1,983 | -24.2% |
| SSR 10 explicit-ref transitions | 14,364 → 10,513 | -26.5% | 13,100 → 9,422 | -28.8% |
| DOM disabled transition open-close cycle (jsdom) | 14,898 → 11,635 | -21.9% | 13,639 → 9,697 | -29.1% |
| DOM CSS transition open-close cycle (jsdom) | 48,555 → 37,829 | -21.1% | 39,724 → 35,710 | -10.2% |

All eight comparisons are lower in every pair beyond their identical-source
control spread. The largest control differences are 3.3% on Node and 2.0% on
Bun. Comparisons are descriptive; they are not confidence intervals.

These measure server rendering and synchronous jsdom update work. They do not
measure browser animation duration, paint speed, frame rate or user-perceived
application latency. Configured animation durations are unchanged.

The shared harness runs one implementation per fresh process, four balanced
AB/BA comparison pairs and two independent identical-source control pairs.
Iteration counts match within pairs, warmup/validation are outside timing, and
all raw samples are retained without trimming. Source hashes tie these results
to this runtime, declarations, fixtures and benchmark.

[Node raw samples](node.json) · [Bun raw samples](bun.json) ·
[Benchmark source](../compare.cjs)
