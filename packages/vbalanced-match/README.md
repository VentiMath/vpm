# vbalanced-match

Independent balanced-delimiter matching, targeting balanced-match 5.0.0.
VentiMath uses this leaf through brace-expansion and minimatch in its file and
build tooling. There are no runtime dependencies.

```js
import { balanced, range } from 'vbalanced-match';
balanced('{', '}', 'pre{in{nested}}post');
// { start: 3, end: 14, pre: 'pre', body: 'in{nested}', post: 'post' }
range('{', '}', '{{{a}b}'); // [1, 6]
```

`balanced` accepts string or RegExp delimiters. `range` accepts strings.
Indices use UTF-16 offsets. Completed outer pairs take precedence; when an
outer prefix never closes, the leftmost completed inner pair is returned.
Overlapping tokens and equal delimiters follow the upstream contract. The
iterative scan retains unmatched opening positions without recursive calls.

Named CJS/ESM exports match the current API. A callable CommonJS export and
an ESM default are also provided for existing callers of the older package.
Cross-realm regular expressions work. Deliberate differences: empty delimiters
(including empty regex matches) return `undefined`; invalid input types throw
`TypeError`. Existing brace-expansion callers use nonempty braces.

Node 24 and Bun are supported. Verification compares 16,400 delimiter/input
combinations against each of versions 1.0.2, 4.0.4 and 5.0.0, exercises
100,000-level nesting, and runs unchanged brace-expansion 2/5 and minimatch 10
callers. Fresh archives and CJS/ESM TypeScript consumers are checked separately.
See [benchmarks](bench/results/README.md) for measurements and controls.

This package is built in VPM; a consumer release and application adoption are
separate from implementation. Upstream is used only as a test control.
