# Lazy-property measurements

Node 24.22.1 and Bun 1.4.4; current upstream 3.0.0. One timed implementation per
fresh process, four balanced AB/BA comparison pairs, two identical-upstream
control pairs, identical iteration counts per pair, warmup and validation outside
timing. No samples are trimmed. This run's control spread is large, so **no
performance improvement or regression is established at this precision**.

| Operation | Node upstream ns | Node VPM ns | Bun upstream ns | Bun VPM ns |
| --- | ---: | ---: | ---: | ---: |
| Register unread | 259 | 255 | 54 | 54 |
| Register and first read | 341 | 482 | 94 | 83 |
| Assign before first read | 373 | 370 | 103 | 90 |
| Cached read | 8 | 8 | 1 | 1 |
| Five opener app names | 967 | 975 | 369 | 308 |

Registration creates an enumerable configurable accessor. First read or assignment
replaces it with a writable data property; the cached-read case measures normal
property access. The five-name case models `open.apps` registration and two reads.
A shared installer avoids one per-property closure, but these timings do not
justify an application startup-speed claim.

Reproduce with `OUTPUT=packages/vdefine-lazy-prop/bench/results/node24.json node
packages/vdefine-lazy-prop/bench/compare.cjs` (substitute `bun` and `bun.json`).
The [Node raw trials](results/node24.json) and [Bun raw trials](results/bun.json)
include source hashes, per-process samples, order effects and control spread.
