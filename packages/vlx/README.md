# VLX — VentiMath typesetting

VLX is an independent TeX parser and layout engine for VentiMath's web formulas
and problem pictures. One layout produces SVG, accessible MathML and browser
HTML; a Node entry composes complete pages and exports PNGs. There is no engine
selector or KaTeX/MathJax fallback.

**Ready for an application integration trial; production cutover is pending.** VLX now renders every math span
and complete statement in the audited local corpus, and passes the application's
unchanged problem-picture tests. That is a measured scope, not a claim of complete
TeX compatibility or a production cutover. Browser visual/accessibility-tree checks
now pass; actual screen-reader/browser acceptance remains open. See
[browser integration and accessibility evidence](ACCESSIBILITY.md).

Install the public release with no dependency overrides:

```sh
bun add vlx@https://github.com/VentiMath/vpm/releases/download/vlx-0.1.0/vlx-0.1.0.tgz
```

The release pins its VPM dependency to a sibling archive. See the
[installation and verification recipe](../../docs/INSTALLATION.md#vlx-math-rendering).
Version 0.1.0 identifies this original API, not upstream engine compatibility.

```js
import { createRenderer } from 'vlx';
const renderer = createRenderer();
const content = renderer.renderText(String.raw`Find $x$ if \(x^2=9\).`);
const expression = renderer.renderMath(String.raw`\binom{n}{2}+f''(x)`, {
  display: true, fontSize: 24,
});
// content.html; expression.html, .svg, .mathml, .width, .height, .baseline
```

HTML inherits the surrounding color and font size unless `fontSize` is supplied.
Standalone SVG defaults to 16 px and black ink. Use `observeMath(host)` from
`vlx/dom` after mounting HTML for keyboard scrolling of oversized expressions and
copying selected formulas as TeX; call its cleanup function on unmount.

The browser entry has no executable upstream engine dependency. The package's
one VPM dependency, `vpngjs`, validates figures in the separate Node page entry;
it is not loaded by browser math. Node 24 and Bun are supported.

```js
import { renderProblemSvg, renderProblemPng } from 'vlx/problem';
const problem = {
  statement: String.raw`Find $x$ when $3x+2=17$.`,
  options: { A: '3', B: '4', C: '5', D: '6' },
};
const page = renderProblemSvg(problem); // {svg, width, height}
const bytes = renderProblemPng(problem); // Buffer, typed as Uint8Array
```

PNG methods require an explicitly installed `@resvg/resvg-js` 2.6.2 optional
peer. It rasterizes VLX's SVG and performs no TeX parsing or layout. SVG page
export needs no native rasterizer. `vlx/png` also exports asynchronous
`renderPng(renderer, tex, {scale: 2, background: 'white'})` for a single expression.

## Supported scope

- `$…$`, `$$…$$`, `\(…\)` and `\[…\]`, brace-aware closing delimiters,
  escaped currency, comments and source spans. Unclosed math is reported by
  `parse()` and rejected by rendering. Prose is escaped, never interpreted as HTML.
- Fractions and infix `\over`, indexed roots, scripts and primes, binomials,
  common Greek/math symbols, named operators, integrals and display limits.
- Math font variants, nested styled text with inline math, phantom boxes, scoped
  colors, arrows, hats, bars, arcs, braces, enclosures and explicit dimensions.
- Matrices, arrays, aligned/gathered equations, cases, solid/dashed rules and
  spanning cells. Explicit equation tags are supported; automatic numbering and
  cross-expression references are not.
- Leading bounded `\newcommand` definitions with braced arguments, scoped to one
  expression. Built-in redefinitions, recursive expansion and unsupported commands
  fail explicitly.
- Per-renderer bounded LRU caching with immutable results and `clearCache()`.

The page entry handles paragraphs, soft newlines, two-space hard breaks, outlined
prose, inline and display math, ordered text/image parts, a main figure, and
alphabetically ordered text/picture choices. Touching word/math/punctuation
fragments stay together when lines wrap. Figures preserve aspect ratio and fit
within the 960 px page's 36 px margins; text is 28 px. A stored figure's `width`
is measured against a 16 px source page. Figure choices replace their text
placeholder; `includesChoiceLabel: true` suppresses a duplicate label.

`statementParts`, when supplied, replaces `statement`; adjacent text parts are
joined before parsing. Figures must be supplied as PNG bytes, not URLs. CRC,
format, byte, dimension and pixel validation precede embedding. Page input,
item counts, image totals, SVG size and raster pixels are bounded. Unknown TeX
or corrupt images cause an error rather than a missing formula or diagram.

`renderMath()` and page methods are synchronous. `parseMath()` is an experimental
inspection API. `VlxError` distinguishes syntax, glyph and resource-limit failures.
Existing caller normalization of legacy prose commands/lists remains caller work;
`renderText()` segments prose and math and is not a LaTeX document compiler.

## Evidence

- All **8,470 math spans** and **1,275 full statements** in 89 local ingestion files
  render after the application's existing normalization. The corpus includes
  olympiad and university contest material. It is a local snapshot, not a complete
  inventory of production data. Only aggregate counts and hashes are committed in
  the [coverage record](../../scripts/vlx-conformance/app-coverage.json).
- All **28 unchanged application problem-picture tests** pass through VLX on Bun,
  including paragraph/image geometry, rules, choices and corruption rejection.
  Private tests are loaded from Git into a temporary directory, never copied here.
- [Public tests](test/contracts.test.cjs), [page checks](test/problem.test.cjs) and
  [30 synthetic notation cases](../../scripts/vlx-conformance/corpus.cjs) run on
  Node 24 and Bun. MathJax 4.1.3 supplies semantic/visual controls and KaTeX 0.19.1
  supplies capability/performance controls. Token comparison normalizes equivalent
  font characters, double primes and invisible operator markers; it is not a proof
  of full accessibility or visual equivalence.
- Clean npm/Bun archives exercise CJS/ESM, TypeScript 7 without ambient DOM/Node
  types, browser bundling, sibling VPM dependencies and optional PNG rasterization.
  [Benchmarks](bench/results/README.md) keep all balanced process pairs, source
  hashes and identical-source controls.

Local whole-page comparisons against the app renderer measured 45.6% and 26.8%
less time on Node for synthetic prose/choices and array/figure PNGs respectively.
Bun measured 24.5% less time for the array/figure case; its prose/choices direction
was unestablished because of control noise. The [coverage record](../../scripts/vlx-conformance/app-coverage.json)
contains the summary and source hash; the [local benchmark runner](../../scripts/vlx-conformance/bench-app.cjs)
reproduces these checks without copying application code into VPM. These are
steady-state local workloads, not deployed latency guarantees.

The font data is an **875 KB subset of New Computer Modern metrics/outlines**,
including the needed math variants and Latin prose characters. It comes from
`@mathjax/mathjax-newcm-font` 4.1.3 and retains its [license and attribution](font/NOTICE).
[Extraction](../../scripts/vlx-conformance/build-font.cjs) is reproducible; no
upstream parser, layout or loader implementation ships. See [provenance](PROVENANCE.json).

Typography remains original: spacing, accents, radicals, scripts and delimiter
sizing differ from the reference engines and need broader visual acceptance.
Chrome exposes the expected structured math, and theme, zoom, reflow and keyboard
checks pass. Actual VoiceOver/NVDA behavior, other browser engines and interactive
equation exploration still need validation.
Arbitrary TeX packages, advanced macro programming, automatic equation references
and every Unicode glyph are outside this verified scope. The public release is
available for integration; VentiMath adoption remains unverified, and the atlas
keeps those engine families in progress.
