# Isolated measurements

Recorded with Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro, against react-themeable 1.1.0.

Four comparison pairs balance AB/BA order; two identical-upstream control pairs
measure environmental spread. Each implementation runs in a fresh process, with
warmup and validation outside timing. All samples and source hashes are retained.
A direction is established only when every pair agrees beyond the control spread.

| Workload | Node upstream → VPM (ns/op) | Bun upstream → VPM (ns/op) |
| --- | ---: | ---: |
| create class-theme helper | 9 → 10; direction unestablished | 10 → 6; 38.4% lower time |
| search input classes | 120 → 113; direction unestablished | 77 → 59; 23.8% lower time |
| selected suggestion classes | 118 → 108; 8.3% lower time | 96 → 59; 36.8% lower time |
| merge three inline styles | 241 → 190; 20.9% lower time | 176 → 195; 10.8% higher time |
| decorated styles | 259 → 250; direction unestablished | 195 → 157; 19.4% lower time |
| empty selections | 142 → 48; 65.9% lower time | 101 → 75; 25.2% lower time |
| actual autosuggest render tree | 9,330 → 9,026; direction unestablished | 3,332 → 3,311; direction unestablished |

**The complete autosuggest render-tree timing is unestablished on both runtimes.**
This is component `render()`/React element creation with synthetic props, not DOM
commit, layout or an authenticated application. No app-level speedup is claimed.

Several helper cases improve beyond controls, but three-style merging is mixed:
241 → 190 ns on Node (20.9% lower time), 176 → 195 ns on Bun (10.8% higher, about
19 ns extra). Native spread retains symbol/getter semantics and prevents a source
prototype key changing the result prototype, but creates intermediate shallow
objects. This small absolute cost is retained rather than obscured by aggregate
averages or speculative tuning. The application currently supplies class themes.

Upstream’s object-assign shim delegates to native Object.assign on these runtimes.
Removing that dependency is a packaging benefit, not by itself a timing explanation.
The benchmark covers factory construction, classes, styles, decorators and empty
selections. Semantic edge cases are tested separately; timings do not replace
property-copy correctness checks.

[Node raw samples](node-isolated.json) · [Bun raw samples](bun-isolated.json)

Reproduce after installing the [fixture](../../../../scripts/themeable-conformance/README.md):

```sh
OUTPUT=packages/vreact-themeable/bench/results/node-isolated.json node packages/vreact-themeable/bench/compare.cjs
OUTPUT=packages/vreact-themeable/bench/results/bun-isolated.json bun packages/vreact-themeable/bench/compare.cjs
```
