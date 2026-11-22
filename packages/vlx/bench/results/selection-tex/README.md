# Partial TeX copying, VLX 0.3.2 versus 0.3.1

Node 24.22.1 and Bun 1.4.4; four isolated AB/BA comparison pairs and two
identical-source control pairs. Raw samples and source hashes are adjacent.

| Case | Node old → new | Bun old → new |
| --- | ---: | ---: |
| Uncached fraction | 32.2 → 34.2 µs | 35.6 → 37.2 µs |
| Uncached ruled array | 46.0 → 59.0 µs | 46.8 → 55.0 µs |
| Cached fraction | 215 → 212 ns | 119 → 121 ns |

The extra web structure costs work on an uncached render. The Bun array case
is slower in every pair beyond control spread (paired median +16.1%). The
other differences are not established at this precision. Node controls were
particularly noisy, including a 70.8% array control spread; the observed Node
array increase must not be read as a reliable percentage.

The cache path has no established change. Copy reconstruction runs on a copy
event, not on parent renders. These timings measure string rendering, not
clipboard latency, React rendering or application performance. Original SVG,
PNG geometry and MathML are unchanged. A web-only semantic tree lets partial
copy retain exponents, fractions and matrix boundaries without loading the
parser or font table in the DOM helper.

```sh
OUTPUT=/tmp/selection-tex-node.json node scripts/vlx-conformance/bench-selection-tex.cjs /path/to/vlx-0.3.1
OUTPUT=/tmp/selection-tex-bun.json bun scripts/vlx-conformance/bench-selection-tex.cjs /path/to/vlx-0.3.1
```
