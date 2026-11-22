# Bounded synchronous LRU costs

Compare lru-cache 11.5.3 with vlru-cache using four isolated AB/BA process pairs
and two identical-source controls. Node 24.22.1 and Bun 1.4.4; raw samples and
source hashes are retained alongside this report. Each case keeps its cache and
values equivalent. Churn measures 16 insertions per call; size updates count a
parent plus three children. These are cache operations, not whole build times.

| Runtime | Operation | Upstream ns | VPM ns | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Create bounded cache | 15982 | 76 | -99.5% | lower time in every pair, beyond control spread |
| Node 24 | Warm Babel-sized lookup | 57 | 60 | 6.3% | unestablished at this precision |
| Node 24 | DOM key cache churn | 3055 | 2938 | -4.8% | unestablished at this precision |
| Node 24 | Sized child-list updates | 116 | 86 | -23.1% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Create bounded cache | 1367 | 53 | -96.7% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Warm Babel-sized lookup | 48 | 44 | -9.7% | unestablished at this precision |
| Bun 1.4.4 | DOM key cache churn | 2459 | 2695 | 3.6% | unestablished at this precision |
| Bun 1.4.4 | Sized child-list updates | 86 | 70 | -19.6% | lower time in every pair, beyond control spread |

VPM's empty cache uses no preallocated entry arrays; storage grows on insertion.
That favors construction. The linked list/Map design has different lookup and
churn costs; the reported cases do not establish a universal speedup. Async
fetch/memo work is outside this implementation and this comparison.

```sh
OUTPUT=/tmp/lru-node.json node packages/vlru-cache/bench/compare.cjs
OUTPUT=/tmp/lru-bun.json bun packages/vlru-cache/bench/compare.cjs
```
