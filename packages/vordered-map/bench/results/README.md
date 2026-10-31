# Ordered-map measurements

Compare @js-sdsl/ordered-map 4.4.2 with vordered-map on Node 24 and Bun.
The shared runner retains outputs, validates them outside timing, warms each
variant for 150 ms and four full blocks, then records twelve alternating paired
rounds. Three fresh processes and one identical-upstream control per runtime;
no trimming. Raw JSON includes source hashes, runtime versions and host details.

Each operation is named by its workload size. Channelz cases execute the original
gRPC 1.14.7 methods through the same compiled module factory with the selected map.
They measure diagnostic bookkeeping, not transport throughput. Indexed position
lookup is an optional general API, not used by gRPC.

Run `node packages/vordered-map/bench/compare.cjs` or replace `node` with `bun`.
Set `OUTPUT` to save JSON; `CALIBRATION=1` uses upstream for both variants.
Run `node packages/vordered-map/bench/summarize.cjs --verify-current` to check
recorded inputs and reproduce the summary. Negative changes mean less time.

## Recorded results

Recorded October 30, 2026 (local date), Apple M1 Pro, Node 24.22.1 and Bun 1.4.0.
Each ns column is a pooled median; change is the median paired ratio. These
statistics need not equal the ratio of the two pooled medians. Ranges list the
three process medians. Control compares identical upstream code.

### Node

| Workload | Upstream ns | VPM ns | Paired change | Process medians | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| map / 16 hit and miss lookups | 1,755 | 1,732 | -0.6% | +3.8%, -2.9%, -1.9% | +0.5% |
| map / ordered insertion 1024 | 33,762 | 33,853 | +0.2% | +0.2%, +0.1%, +0.5% | -0.2% |
| map / shuffled insertion 1024 | 69,170 | 67,998 | +0.4% | -2.2%, +3.6%, -3.8% | -0.2% |
| map / update 128 existing keys | 3,376 | 3,394 | +2.1% | +3.2%, -6.4%, +7.5% | +0.2% |
| map / erase and reinsert 128 | 9,561 | 9,885 | +3.3% | +3.7%, +3.3%, +2.9% | +0.2% |
| map / iterator page of 100 | 14,997 | 13,363 | -11.2% | -11.9%, -10.5%, -10.6% | -0.9% |
| map / forEach 256 | 3,478 | 3,469 | -0.5% | -0.4%, +0.0%, -1.1% | -0.2% |
| map / generator 256 | 8,866 | 8,905 | +0.5% | -1.1%, +1.6%, +0.3% | -0.4% |
| map / indexed middle of 4096 | 16,209 | 36 | -99.8% | -99.8%, -99.8%, -99.8% | +1.8% |
| gRPC / existing child ref-unref | 199 | 190 | -5.6% | -3.9%, -9.0%, -4.7% | +5.8% |
| gRPC / register-unregister 128 children | 27,148 | 26,218 | -2.8% | -2.5%, -4.0%, +5.7% | +1.0% |
| gRPC / GetTopChannels page of 100 | 23,046 | 21,213 | -8.1% | -12.5%, -7.4%, -6.8% | -1.2% |

Raw runs: [1](node-1.json), [2](node-2.json), [3](node-3.json), [control](node-control.json).

### Bun

| Workload | Upstream ns | VPM ns | Paired change | Process medians | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| map / 16 hit and miss lookups | 1,170 | 1,168 | -6.0% | -17.0%, +1.4%, -2.6% | +3.4% |
| map / ordered insertion 1024 | 31,164 | 31,585 | +0.6% | +2.4%, -0.7%, +0.6% | +2.0% |
| map / shuffled insertion 1024 | 62,401 | 64,890 | +5.1% | +0.0%, +4.3%, +8.2% | +3.6% |
| map / update 128 existing keys | 2,784 | 2,942 | +5.6% | +1.0%, +10.7%, +4.9% | +0.3% |
| map / erase and reinsert 128 | 7,904 | 7,434 | -2.8% | +1.1%, -1.6%, -10.0% | +0.1% |
| map / iterator page of 100 | 10,157 | 5,765 | -41.6% | -41.3%, -43.6%, -40.5% | -1.3% |
| map / forEach 256 | 2,912 | 2,904 | -0.1% | +0.5%, -3.9%, +1.5% | -0.6% |
| map / generator 256 | 6,508 | 6,483 | -0.1% | -2.6%, -2.7%, +3.4% | +1.0% |
| map / indexed middle of 4096 | 13,577 | 26 | -99.8% | -99.8%, -99.8%, -99.7% | -1.0% |
| gRPC / existing child ref-unref | 152 | 137 | -6.4% | -24.8%, -4.5%, -7.6% | +10.0% |
| gRPC / register-unregister 128 children | 23,935 | 22,124 | -6.9% | -5.1%, -3.1%, -10.8% | +4.0% |
| gRPC / GetTopChannels page of 100 | 29,366 | 22,774 | -23.6% | -17.3%, -24.4%, -27.9% | +7.5% |

Raw runs: [1](bun-1.json), [2](bun-2.json), [3](bun-3.json), [control](bun-control.json).

## Interpretation

- A 100-entry iterator page takes **11% less time on Node and 42% less on Bun**.
  All three processes agree and controls are within 1.3%.
- Actual `GetTopChannels` pages take **8% less time on Node and 24% less on Bun**.
  Bun's 7.5% control bias calls for caution about the precise magnitude, but the
  three observed reductions (17–28%) exceed it. This is diagnostic listing, not
  end-to-end RPC latency.
- Indexed middle-position lookup takes about **36 ns / 26 ns**, versus
  **16.2 µs / 13.6 µs**, by replacing linear traversal with tree-rank selection.
  gRPC does not call this optional indexed API.
- There are regressions: Node's 128 erase/reinsert batch costs **3.3% more**
  (about 324 ns/batch); Bun's existing-key update batch costs **5.6% more**
  (about 158 ns/batch). Bun shuffled insertion is 5.1% slower, with a 3.6%
  identical-code control and substantial process variation. These remain in
  the results; correctness checks were retained.
- Ordinary lookup, insertion, forEach and generator differences are small or
  inconsistent. Existing-child reference-count changes are inconclusive because
  controls vary 5.8% / 10.0%. Do not claim a general map-operation speedup.

The red-black tree is retained; map sizes and complexity remain bounded as in
upstream. Measurements describe this host and these workloads, not universal
performance or a deployed application improvement.
