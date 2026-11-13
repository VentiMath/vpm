# Header selection measurements

Recorded November 13, 2026 on Node 24.22.1 and Bun 1.4.4. The same operation runs
against VPM and Table core 9.3.1 / application core 8.20.5: select the page,
consume its selected record model, clear the page and consume the empty model.
Tables are created before timing. The 44-record grouped fixture has 27 leaves
under 15 collapsed groups on page one; the flat case selects 15 records.
Result validation runs outside timing and rejects incomplete descendant work.

Four isolated AB/BA comparison pairs and two identical-source control pairs
retain all samples and source hashes in [Node](node.json) and [Bun](bun.json).
These measurements concern core operations, not browser or application speed.

| Case | Node change | Bun change |
| --- | ---: | ---: |
| Table9 collapsed-group page | -28.0% | -22.1% |
| Table9 flat page | +9.4% uncertain | +16.0% uncertain |
| App8 collapsed-group page | -5.8% uncertain | +2.0% uncertain |
| App8 flat page | +37.5% uncertain | +39.8% |

Negative means less elapsed time. Collapsed-group selection takes less time than
Table 9 in every pair beyond control variation. Its comparison with the app’s
Table 8 control is inconclusive on both runtimes. Flat-page selection is about
3.1 µs slower per select/clear cycle on Bun than app Table 8; that remaining
cost is established. Node and Table 9 flat-page results are inconclusive.
No across-the-board performance gain is claimed. This recording compares the
corrected implementation with upstream, not with the earlier broken selection.

```sh
OUTPUT=packages/vtanstack-table-core/bench/selection/node.json node packages/vtanstack-table-core/bench/selection.cjs
OUTPUT=packages/vtanstack-table-core/bench/selection/bun.json bun packages/vtanstack-table-core/bench/selection.cjs
```
