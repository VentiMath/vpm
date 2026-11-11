# Countdown operations

Node 24.22.1 and Bun 1.4.4, Moment 2.31.0, America/Los_Angeles, 2026-11-11.
The process-isolated harness alternates order over four pairs and records two
upstream/upstream controls. Each case validates outputs outside its timed region.
These are small CPU operations, not a perceptible page-speed claim.

| Case | Node upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| Parse local end date | 2,120 → 593 | 1,289 → 304 |
| Default fifteen-day deadline | 714 → 291 | 335 → 41 |
| Countdown tick and four fields | 1,265 → 326 | 646 → 176 |
| Duration and three component fields | 247 → 97 | 135 → 10 |

Every case took less time in every pair, beyond its control spread. The actual
countdown tick took 74% less time on Node and 73% less on Bun. This implementation
supports only the caller's date/duration operations; it does not carry Moment's
formatting, locales or broad parsing. The harness observes returned values, but
its fixed inputs and isolated loops are not a whole-application benchmark.

[Node report](node-isolated.json) and [Bun report](bun-isolated.json) include
samples, controls, source hashes and runtime details. Reproduce from the repo:

```sh
TZ=America/Los_Angeles OUTPUT=packages/vmoment/bench/results/node-isolated.json node packages/vmoment/bench/run.cjs
TZ=America/Los_Angeles OUTPUT=packages/vmoment/bench/results/bun-isolated.json bun packages/vmoment/bench/run.cjs
```
