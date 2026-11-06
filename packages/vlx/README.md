# VentiLaTeX (VLX)

**VentiLaTeX**, pronounced **“Vee Ell Ex,”** is the math typesetting system
distributed as `vlx`. It is an independent TeX parser and layout engine for VentiMath's web formulas
and problem pictures. One layout produces SVG, accessible MathML and browser
HTML; a Node entry composes complete pages and exports PNGs. There is no engine
selector or KaTeX/MathJax fallback.

**Adopted in VentiMath frontend source.** Application main `15a83287` pins r7
and imports the shared `vlx/react` components. Deployed-version verification is
separate; see the [adoption record](../../docs/ADOPTION.md).

In the supplied November 3 production
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
bun add vlx@https://github.com/VentiMath/vpm/releases/download/vlx-0.2.2/vlx-0.2.2.tgz
```

The release pins its VPM dependency to a sibling archive. See the
[installation and verification recipe](../../docs/INSTALLATION.md#vlx-math-rendering).
Versions identify this original API, not upstream engine compatibility.
**0.2.2** adds the Unicode fractions, ordinals, accents and custom operator
symbols needed by the problem-picture corpus. It preserves fullwidth punctuation
and hides unused soft hyphens without silently dropping unknown characters.
**0.2.1** fixed indexed-root degree placement in all outputs. Problem pictures
now use display sizing for standalone paragraph formulas, bold choice labels,
and ordinary paragraph spacing for break-only math. It retains the document-scoped
equation references introduced in **0.2.0**. The install above selects
that API; VentiMath's verified frontend source still pins r7 until its dependency
and lockfile are updated. Release availability and application adoption are separate.

The release retains r7's native React SVG and MathML rendering. It uses
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

The React entry loads the renderer and glyph pool on first math use; `MathText`
skips that load for plain prose. Once `preloadMath()` resolves, rendering is synchronous on the
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

## Automatic equation references (0.2.0)

Render one complete reference scope with `renderDocument`, or with
`createRenderer().renderDocument`. Definitions may follow their references:

```js
import { renderDocument } from 'vlx';
const source = String.raw`See \eqref{area}.
\begin{equation}A=\pi r^2\label{area}\end{equation}`;
const result = renderDocument(source, { idPrefix: 'lesson-area' });
// result.html, .equations, .references, .nextNumber, .diagnostics
```

React uses the same parser/layout and native SVG/MathML elements:

```tsx
import { MathDocument } from 'vlx/react';
<MathDocument source={source} startNumber={1} />
```

`MathDocument` generates an SSR-stable ID prefix with React's `useId`. The string
API defaults to `vlx`; supply different `idPrefix` values when inserting multiple
documents into one page. Separately rendered/hydrated React roots need distinct
React `identifierPrefix` settings or explicit document prefixes. Prefixes start with an ASCII letter and contain at most
128 ASCII letters, digits, underscores or hyphens. Label-derived targets survive
renumbering; unchanged React renders retain their DOM and focus.

- `numbering: 'ams'` (default) numbers unstarred `equation`, `align` and `gather`
  environments. `align` and `gather` number each row. Starred forms do not get
  automatic numbers. These top-level environments work directly in prose.
- `'all'` also numbers ordinary display math; `'none'` keeps only explicit tags.
  `startNumber` defaults to 1. Numbers are local to this call/component, not shared
  with other documents or the expression cache.
- `\label{area}`, `\ref{area}` and `\eqref{area}` work across formulas in the same
  source. References work in prose or math; `eqref` adds parentheses. Keys contain
  1–128 ASCII letters, digits or `_ : . / -`, with no whitespace and starting with
  a letter, digit or underscore. Multiple labels may identify the same equation.
- `\tag{A}` displays `(A)`; `\tag*{A}` displays `A`. Explicit tags do not advance
  the automatic counter. `\notag`/`\nonumber` suppress a row's automatic number.
  A label needs either a number or a tag; duplicate/missing labels are errors.
- String rendering throws on errors by default. `{errorMode: 'source'}` preserves
  the affected formula as escaped source, retains valid siblings and reports
  diagnostics. Invalid definitions do not consume numbers. React has the same
  per-formula source fallback, with the existing `fallback` customization.

References are keyboard-operable links with accessible names and visible focus.
They target the containing equation block; a reference to an `align`/`gather` row
currently focuses that whole block. Import `vlx/styles.css` for static HTML; React
installs the shared rules. Chrome keyboard and accessibility-tree checks pass;
actual screen-reader speech and other browser engines still need acceptance.

This is a bounded document feature, not a general LaTeX compiler: at most 1,024
numbered/tagged equations, 4,096 references, 32 labels per equation and a counter
up to 1,000,000. Custom tags support text, symbols, font styles and scripts, not
arbitrary nested math. Cross-document references, arbitrary TeX counters and
`subequations` are outside this API. The problem-picture entry has not been
migrated to document numbering. Existing `renderMath`/`renderText` and React
formula/text components keep their previous behavior.

The [equation tests](test/equations.test.cjs) compare numbering/tag rules with
MathJax 4.1.3. [Process-isolated benchmarks](bench/equation-results/README.md)
compare full document rendering and check the existing formula/text paths.

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
  spanning cells. Explicit tags work in formula rendering; the new document API
  adds automatic numbering and references within one source.
- Leading bounded `\newcommand` definitions with braced arguments, scoped to one
  expression. Built-in redefinitions, recursive expansion and unsupported commands
  fail explicitly.
- Per-renderer bounded LRU caching with immutable results and `clearCache()`.

The page entry handles paragraphs, soft newlines, two-space hard breaks, outlined
prose, inline and display math, ordered text/image parts, a main figure, and
alphabetically ordered text/picture choices with bold labels. A formula alone in
a paragraph uses display style unless its TeX explicitly selects another style.
Break-only math such as `$\\$` advances paragraph flow, retaining repeated breaks
and explicit extra spacing. Touching word/math/punctuation
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
- The 0.2.1 picture checks reproduce all four reported defects on 0.2.0 and pass
  after the fixes. The saved November 3 full-problem corpus still renders
  **20,835 of 20,835** records with 0.2.2 after 28 glyph failures were fixed and
  four statement-only source repairs were separately applied and verified.
  Broken delimiters and corrupt control characters still fail; the package does
  not guess their intended meaning. Figures in this check are synthetic placeholders with
  recorded widths, so this is not visual acceptance of every production picture.
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

The [0.2.2 Unicode benchmark](bench/unicode-results/README.md) checks the existing
formula and prose/choice paths against 0.2.1. Missing-glyph failures are not
counted as faster renders.

The [0.2.1 picture benchmark](bench/picture-results/README.md) compares unchanged
inputs against 0.2.0 in isolated Node 24 and Bun processes. No measured direction
is established beyond controls: corrected full-picture PNG medians are +4.9%
on Node and +1.1% on Bun, with appreciable process variation. Corrected output
has deliberately different geometry; this is not a throughput claim.

Historical r3 whole-page comparisons against the app renderer measured 45.6% and 26.8%
less time on Node for synthetic prose/choices and array/figure PNGs respectively.
Bun measured 24.5% less time for the array/figure case; its prose/choices direction
was unestablished because of control noise. The [coverage record](../../scripts/vlx-conformance/app-coverage.json)
contains the summary and source hash; the [local benchmark runner](../../scripts/vlx-conformance/bench-app.cjs)
reproduces these checks without copying application code into VPM. These are
steady-state local workloads, not deployed latency guarantees.

The font data is an **823 KB subset of New Computer Modern metrics/outlines**,
including the needed math variants and Latin prose characters. It comes from
`@mathjax/mathjax-newcm-font` 4.1.3 and retains its [license and attribution](font/NOTICE).
Identical outlines share one path pool (822,689 bytes total, up 38,346 bytes
from 0.2.1 for the new glyphs and still below the 896,594 bytes in r2). The React dynamic entry keeps that data out of
the initial application chunk when the bundler supports code splitting.
[Extraction](../../scripts/vlx-conformance/build-font.cjs) is reproducible; no
upstream parser, layout or loader implementation ships. See [provenance](PROVENANCE.json).

Typography remains original: spacing, accents, radicals, scripts and delimiter
sizing differ from the reference engines and need broader visual acceptance.
Chrome exposes the expected structured math, and theme, zoom, reflow and keyboard
checks pass. Actual VoiceOver/NVDA behavior, other browser engines and interactive
equation exploration still need validation.
Arbitrary TeX packages, advanced macro programming, cross-document references
and every Unicode glyph are outside this verified scope. VentiMath frontend source
uses r7; release 0.2.2 is available for its next dependency update. The Discord
problem-image migration and 0.2.0 adoption exist on an unmerged application branch;
main still uses MathJax for that caller. Browser and assistive-technology acceptance remains open, as recorded
in [ACCESSIBILITY.md](ACCESSIBILITY.md), without labeling the implementation
or frontend adoption unfinished.
