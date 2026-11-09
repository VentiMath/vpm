# vdiff

Independent word comparison for proposed problem edits. It targets the
`diffWords` and `diffWordsWithSpace` contracts in **diff 9.0.0**, with no runtime
dependencies or copied upstream runtime. VentiMath's problem-admin `InlineDiff`
uses `diffWords` and renders its fragments as React text children.

```js
import { diffWords } from 'vdiff';

const changes = diffWords('Find the sum.', 'Find the product.');
// Each fragment has { value, count, added, removed }.
// Render value as text; added/removed select the visual treatment.
```

CommonJS exposes the same named functions. Browser, Node 24 and Bun 1.4.4 are
checked. The package is built and tested; publication and application adoption
are separate steps.

## Word comparison

`diffWords(oldText, newText, options?)` ignores whitespace when matching words,
retains punctuation tokens and returns the new spelling/spacing for common
text. `diffWordsWithSpace` includes whitespace in the comparison, so joining
all non-added fragments reconstructs the original text and joining all
non-removed fragments reconstructs the new text. The default word mode does
not promise that reconstruction property because whitespace changes are ignored.

Both support `ignoreCase`, `oneChangePerToken`, `maxEditLength`, `timeout` and
`callback`. Word mode also accepts a word-granularity `Intl.Segmenter` and the
legacy `ignoreWhitespace: false` switch to the whitespace-aware mode. ICU
segment boundaries can vary between runtimes; controls run within each runtime.
Per-token word output follows upstream's surrounding-whitespace convention:
neighboring fragments can include overlapping spaces.

An edit bound or deadline returns `undefined` when exhausted, never a partial
diff. A callback (in options or as the third argument) runs asynchronously and
receives the same result; the immediate return value is `undefined`. Callback
work cooperatively yields between edit-depth waves. Tokenization and result
assembly still run synchronously; this is not a worker-thread API or a hard
wall-clock budget. For adversarial large texts, set `maxEditLength` or `timeout`.
The edit frontier can still require quadratic work on difficult overlapping text.

Bounds are validated: `maxEditLength` is a nonnegative safe integer or
`Infinity`; `timeout` is a nonnegative number or `Infinity`. Invalid input,
callbacks and bounds throw `TypeError`. Unlike upstream's coarse timer,
`timeout: 0` deterministically allows an already-equal token sequence but no
changed search. These are intentional validation/deadline differences.

## Version and scope

The current application control is diff **8.0.2**. Twelve synthetic cases shaped
like its real caller match both versions. Two deliberate diff 9 improvements
are checked separately: multiplication/division symbols are punctuation tokens
(`a×b` → `a÷b` highlights only the operator), and a soft hyphen stays inside its
word. This is current word-API compatibility, not a complete JsDiff replacement.

Patch generation/application, character/line/array/JSON/CSS/sentence diffs and
custom `Diff` classes are not exported. No production problem records or private
application source are included in the tests.

The implementation keeps source spans and linked edit runs instead of rebuilding
text from normalized words. Large inputs with entirely disjoint token sets
have a linear path rather than an edit-distance frontier. Default tokenization
and whitespace placement are verified against unmodified public API controls.

[Conformance and consumer checks](../../scripts/diff-conformance/README.md)
cover exact fragments, Unicode, TeX, callback scheduling, bounds, Chrome and
packed installs. [Benchmarks](bench/results/README.md) compare the same word APIs
in isolated processes, including identical-source controls; results do not
establish application-level speedups.
