# vstylis

A CSS preprocessor (nesting, vendor prefixes, middleware) targeting
**stylis 4.4.0**, the latest release checked November 1, 2026: the same API,
element tree and output, written for VPM. No dependencies; an ES module for
browsers, Node.js 24+ and Bun (`require()` loads it on both).

```js
import {compile, serialize, middleware, prefixer, stringify, rulesheet} from 'vstylis';

serialize(compile('.a{color:red;&:hover{color:blue;}@media (min-width:600px){padding:0;}}'), middleware([prefixer, stringify]));
// '.a{color:red;}.a:hover{color:blue;}@media (min-width:600px){.a{padding:0;}}'
```

- `compile(css)` parses CSS with nesting (`&`, nested rules, conditional
  at-rules inside rules) into a flat list of elements (`type`, `value`,
  `props`, `children`, `root`, `parent`, `line`, `column`, `length`, `return`).
- `serialize(elements, callback)` runs a middleware over the elements;
  `middleware([...])` combines plugins; `stringify` prints CSS; `rulesheet(fn)`
  receives each top-level rule (for `insertRule`).
- `prefixer` adds vendor-prefixed declarations, `@-webkit-keyframes` and the
  vendor forms of `::placeholder` and `:read-only`/`:read-write` (each as a rule
  of its own); `prefix(declaration, nameLength)` prefixes one declaration.
- `namespace` scopes nested selectors (`:global(...)` escapes); `tokenize`
  splits a selector or value.
- The element constants (`RULESET`, `DECLARATION`, `COMMENT`, `MEDIA`, ...),
  `node`, `copy`, `lift` and `strlen` for plugins.

Declarations are bundled. Each `compile()` call reads its input through its own
cursor; stylis keeps one cursor in module state.

## Differences from stylis 4.4.0

| stylis 4.4.0 | vstylis |
| --- | --- |
| `prefixer` selects properties by a hash of the name's length and first four characters, so more than 50 properties that share a hash with a prefixed one get invented declarations: `flex-wrap:wrap` adds `-webkit-box-flex-wrap`, `-webkit-flex-wrap` and `-ms-flex-wrap`; `gap`'s older `grid-gap` adds `-ms-grid-gap`; `scroll-padding-top` adds `scroll-snap-padding-top`; `translate`, `color-scheme`, `grid-auto-flow`, `text-orientation` and others likewise; `grid-auto-rows:100px` beside `grid-row-end:3` adds `-ms-grid-row-span:-97`. | Properties are selected by name; the prefixed set is stylis's own list, with identical output for each (and `backdrop-filter`'s `-webkit-` form, which stylis wrote by the same accident and Safari before 18 needs). |
| An IE grid span pairs a start line with an end line of either axis and is always written as `-ms-grid-row-span`. | The span pairs lines of the same axis and is written for that axis. |
| `mask-composite: subtract` is looked up as "substract", and only the first layer's keyword is converted for `-webkit-mask-composite`. | Every layer's keyword is converted (`subtract` to `source-out`). |
| A declaration's property ends at its last colon: `--x: a:b` has property `--x:a` and value `b`, and `transform :a:b` keeps the space before its colon. | The property ends at the first colon. Output differs only by that space. |
| A comment at the end of the input loses its last character (`/* ope*` plus a NUL for an unterminated `/* open`). | The comment keeps its text. |
| `namespace` switches on a variable that one of its case labels assigns. JavaScriptCore (Safari, Bun) compares that label with the assigned value, so `a:not([href])` is scoped `a.scope:not.scope([href])` there; stylis fails its own namespace test under Bun. | The same scoping on every engine (V8's result, which follows the specification). |

Otherwise the element trees and output are identical: the
[conformance fixture](../../scripts/stylis-conformance/README.md) runs stylis's
113 tests and compares vstylis with stylis 4.4.0 (with the changes above
applied to its sources) over 12 stylesheets and 20,000 generated nested inputs.
[Process-isolated benchmarks](bench/results/README.md) time compile, prefixer
and stringify on Node 24 and Bun. These samples do not establish a consistent
speedup or regression beyond the control variation; no parity claim follows
from an inconclusive measurement.

| Upstream | Here |
| --- | --- |
| UMD bundle (`require`) and minified ES module bundle | Not built: the ES module sources are the package, and `require()` loads ES modules on Node.js 24 and Bun |
| `react-native` field | Not included |
| No declarations (`@types/stylis` 4.2.7 predates 4.3) | Bundled, including `siblings`, `lift` and the `@scope` constant |
