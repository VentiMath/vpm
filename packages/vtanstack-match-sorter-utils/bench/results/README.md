# Ranking measurements

Recorded November 8, 2026 on Node 24.22.1 and Bun 1.4.0 against
`@tanstack/match-sorter-utils` 9.2.6. Each implementation runs in separate
processes, with four alternating AB/BA pairs and two identical-source control
pairs. Results are observed; ranks are validated outside timed blocks. Raw
reports include source hashes, all process samples and control spread.

| Case | Node upstream → VPM (ns) | Paired change | Bun upstream → VPM (ns) | Paired change |
| --- | ---: | ---: | ---: | ---: |
| ASCII exact | 118 → 52 | -56.8% | 143 → 38 | -73.5% |
| ASCII table filter | 533 → 240 | -55.3% | 605 → 210 | -64.1% |
| Loose subsequence | 655 → 370 | -43.5% | 731 → 314 | -57.0% |
| Accented name | 377 → 334 | -11.3% | 326 → 286 | -9.8% |
| Row with multiple accessors | 1082 → 651 | -39.5% | 1150 → 676 | -34.6% |

ASCII exact, acronym/table filtering and loose subsequences take less time in
every pair on both runtimes, beyond the identical-source control spread.
Accented-name and multi-accessor medians are lower, but their control noise or
pair variation does not establish an improvement at this precision. No remaining
regression is established by these runs. These are warmed ranking operations,
not application latency or cold module-load measurements.

Accent normalization reuses only single-character folds from bounded Unicode
ranges. No query strings, full names or table records are cached. The first use
of a character still pays for native normalization; these steady-state results
do not measure that first use.

Reproduce from the repository root after installing the conformance fixture:

```sh
OUTPUT=packages/vtanstack-match-sorter-utils/bench/results/node.json node packages/vtanstack-match-sorter-utils/bench/compare.cjs
OUTPUT=packages/vtanstack-match-sorter-utils/bench/results/bun.json bun packages/vtanstack-match-sorter-utils/bench/compare.cjs
```

[Node raw report](node.json) · [Bun raw report](bun.json)
