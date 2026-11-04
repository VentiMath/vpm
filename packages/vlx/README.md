# VentiLaTeX (VLX)

**VentiLaTeX**, pronounced **“Vee Ell Ex,”** is the math typesetting system
distributed as `vlx`. It is an independent TeX parser and layout engine for VentiMath's web formulas
and problem pictures. One layout produces SVG, accessible MathML and browser
HTML; a Node entry composes complete pages and exports PNGs. There is no engine
selector or KaTeX/MathJax fallback.

**Ready for the frontend cutover trial.** In the supplied November 3 production
snapshot, all **99,184 formulas accepted by the app's KaTeX 0.16.38 baseline**
render in VLX, across 99,635 extracted expressions and 15,107 documents. The other
451 expressions were rejected by that baseline. After source repairs to
165 live statements, two current rubrics, and 94 answer/choice values, **all 99,635 formulas render**.
The corrections normalize imported macros, restore damaged TeX, and remove stored
math delimiters from bare answer/choice fields. Formula-only rendering is strict. The audit overlays only verified repairs onto the
original dump, not a new full-database snapshot or historical rubric revisions.
This verifies renderability after the caller's existing preprocessing, not visual
equivalence, all possible TeX or a completed application deployment. See the
[aggregate coverage](../../scripts/vlx-conformance/production-coverage.json) and
[browser/accessibility evidence](ACCESSIBILITY.md).

Install the public release with no dependency overrides:

```sh
bun add vlx@https://github.com/VentiMath/vpm/releases/download/vlx-0.1.0-r7/vlx-0.1.0.tgz
```

The release pins its VPM dependency to a sibling archive. See the
[installation and verification recipe](../../docs/INSTALLATION.md#vlx-math-rendering).
Version 0.1.0 identifies this original API, not upstream engine compatibility.

Release revision **r7** renders native React SVG and MathML elements. It uses
no `dangerouslySetInnerHTML`, HTML parser or markup insertion in the React path.
The same parser and layout rules emit structured nodes for React and escaped
strings for the HTML, SVG, MathML and image APIs. Unchanged and changed formulas
retain their outer DOM node; lazy loading, strict bare-TeX input, per-formula
fallbacks and provider defaults remain supported. Existing release assets are
unchanged.

An **npm registry mirror is planned** for VentiLaTeX. It will distribute the same
implementation and versioned API, with the same licenses and provenance. GitHub
Release archives are the current distribution channel; npm publication is future
work. The package name and import paths remain `vlx` and `vlx/*`.

```js
import { createRenderer } from 'vlx';
const renderer = createRenderer();
const content = renderer.renderText(String.raw`Find $x$ if \(x^2=9\).`);
const expression = renderer.renderMath(String.raw`\binom{n}{2}+f''(x)`, {
  display: true, fontSize: 24,
});
// content.html; expression.html, .svg, .mathml, .width, .height, .baseline
```

React 19 applications can use the optional entry directly:

```tsx
import { InlineMath, DisplayMath, MathText } from 'vlx/react';

<InlineMath tex="x^2" />
<DisplayMath tex={String.raw`\cfrac{1}{2+\cfrac{1}{3}}`} />
<MathText source={String.raw`Find $x$; unsupported $\unknown$ stays as text.`} />
```

The React entry loads the renderer and glyph pool on first math use; plain prose
does not load them. Once `preloadMath()` resolves, rendering is synchronous on the
first pass, including server rendering. `loadingFallback`
customizes the loading state; `fallback` accepts a React node or `(error, source)`
callback for a failed formula. Defaults preserve source as text. Lifecycle and
copy/scroll observers are mounted and cleaned up by the components. React is an
optional peer, not a dependency of the core entry.

The React adapter uses normal element reconciliation, with a bounded cache of
rendered expressions. Initial mounts and updates work under Trusted Types
without a permissive HTML policy. Prose and fallbacks remain React text/nodes;
caller-provided HTML is not an input API. See the [r6/r7 measurements](bench/results/react-r7.md)
for initial mounts, changed formulas, unchanged parent updates and string output.
Changed-formula and unchanged-paper updates improve in the Chrome measurements;
uncached string generation remains slower than r6. Initial browser mounts do
not show an established direction across controls.
The shared stylesheet supplies oblique MathML styling and forced system colors;
React installs it automatically. Static SSR pages import `vlx/styles.css` once.

```tsx
import { MathProvider } from 'vlx/react';
<MathProvider scrollLabel="Scrollable formula" loadingFallback={null}>
  <InlineMath tex="x^2" />
</MathProvider>
```

Nested providers inherit omitted settings; explicit component props take precedence.

HTML inherits the surrounding color and font size unless `fontSize` is supplied.
Set `--vlx-scale` on a parent or the React `style` prop to scale that size. Display
math is centered when it fits; `--vlx-display-margin: 0` requests left alignment.
Standalone SVG defaults to 16 px and black ink. Use `observeMath(host)` from
`vlx/dom` after mounting HTML for keyboard scrolling of oversized expressions and
copying selected formulas as TeX; call its cleanup function on unmount.
React and `observeMath` install the small forced-colors stylesheet once per document.
For static HTML without either lifecycle, import `vlx/styles.css` once in the page,
or call `installMathStyles(document)` from `vlx/dom`. No per-formula style tag ships.

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
  `parse()`. Rendering throws by default; `renderText(source, {errorMode: 'source'})`
  preserves a failed formula as escaped source and renders its valid siblings,
  with diagnostics and source spans. Prose is escaped, never interpreted as HTML.
- Fractions and infix `\over`, indexed roots, scripts and primes, binomials,
  common Greek/math symbols, named operators, integrals and display limits.
- Congruence, similarity, divisibility and slanted inequalities, including
  `\cong`, `\sim`, `\simeq`, `\mid`, `\nmid`, `\leqslant`, `\geqslant`,
  `\nsim`, `\ncong` and `\nparallel`. `\not` accepts a single symbol (optionally
  braced), using a dedicated negated glyph when available and a diagonal strike
  otherwise. Negating an arbitrary compound expression remains unsupported.
- Explicit inline/display line breaks, atom-class wrappers such as `\mathbin`,
  continued fractions (`\cfrac`), infix `\choose`, operator annotations,
  delimiter aliases, circled text, cancellation, rules and the production-used
  Latin, currency and mathematical glyphs. Line breaks are honored in both modes;
  KaTeX ignores top-level breaks in display mode.
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

`renderMath()`, `InlineMath` and `DisplayMath` require **bare TeX**, such as
`10^{100^{100}}`. Outer `$…$`, `$$…$$`, `\(…\)` and `\[…\]` wrappers are errors.
Fix stored answer/choice values at ingestion; the renderer does not strip their
delimiters or repair malformed syntax. `renderText()` and `MathText` are the prose
entries and intentionally recognize delimited math.

`\textsl` uses sheared roman outlines; `\o`/`\O` mean the letters ø/Ø, never the
empty-set symbol. Array column specs accept `@{}` and bounded, nonnegative
`@{\hspace{dimension}}` inserts. Row-leading `\vspace{dimension}` adds space
after that row. General inserted math, negative skips and arbitrary TeX spacing
programs are not supported. Literal non-whitespace control characters are errors.

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
  [53 synthetic notation cases](../../scripts/vlx-conformance/README.md) run on
  Node 24 and Bun. MathJax 4.1.3 supplies semantic/visual controls and KaTeX 0.19.1
  supplies capability/performance controls. Token comparison normalizes equivalent
  font characters, double primes and invisible operator markers; it is not a proof
  of full accessibility or visual equivalence.
- Clean npm/Bun archives exercise CJS/ESM, TypeScript 7 without ambient DOM/Node
  types, browser bundling, sibling VPM dependencies and optional PNG rasterization.
  [Benchmarks](bench/results/README.md) keep all balanced process pairs, source
  hashes and identical-source controls.

Historical r3 whole-page comparisons against the app renderer measured 45.6% and 26.8%
less time on Node for synthetic prose/choices and array/figure PNGs respectively.
Bun measured 24.5% less time for the array/figure case; its prose/choices direction
was unestablished because of control noise. The [coverage record](../../scripts/vlx-conformance/app-coverage.json)
contains the summary and source hash; the [local benchmark runner](../../scripts/vlx-conformance/bench-app.cjs)
reproduces these checks without copying application code into VPM. These are
steady-state local workloads, not deployed latency guarantees.

The font data is a **784 KB subset of New Computer Modern metrics/outlines**,
including the needed math variants and Latin prose characters. It comes from
`@mathjax/mathjax-newcm-font` 4.1.3 and retains its [license and attribution](font/NOTICE).
Identical outlines share one path pool (784,343 bytes total, down from 896,594
in r2 despite broader coverage). The React dynamic entry keeps that data out of
the initial application chunk when the bundler supports code splitting.
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
