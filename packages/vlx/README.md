# VLX — VentiMath typesetting

VLX is an independent TeX parser and mathematical layout engine. One layout
produces browser SVG with accessible MathML, standalone SVG, and optional PNG.
There is no KaTeX/MathJax engine selection or fallback.

**This is an initial engine, not yet ready to replace VentiMath's complete math
rendering system.** It implements the bounded expression scope below. Unsupported
notation throws an explicit error rather than silently changing engines or
showing a partial formula. The app still uses its existing renderers.

```js
import { createRenderer } from 'vlx';
const renderer = createRenderer();
const problem = renderer.renderText(String.raw`Find $x$ if \(x^2=9\).`);
const expression = renderer.renderMath(String.raw`\frac{3}{7}+\sqrt{19}`, {
  display: true,
  fontSize: 24,
});
// problem.html; expression.html, .svg, .mathml, .width, .height, .baseline
```

The math engine has no runtime package dependencies and works in a browser,
Node 24 or Bun. `vlx/png` additionally uses the explicitly installed native
`@resvg/resvg-js` 2.6.2 rasterizer. It rasterizes VLX's SVG; it does not parse TeX
or lay out formulas.

```js
import { renderPng } from 'vlx/png';
const image = await renderPng(renderer, String.raw`\sqrt{x^2+1}`, {
  scale: 2, background: 'white',
});
// image.data is Uint8Array; background may also be 'transparent'.
```

## Current scope

- Source-preserving prose segmentation: `$…$`, `$$…$$`, `\(…\)` and `\[…\]`,
  escaped dollars, brace-aware closers, comments and source spans. Escape currency
  dollars. `parse()` reports unclosed delimiters; rendering rejects them.
- Arithmetic, selected Greek letters and common operators; fractions, indexed
  roots, superscripts/subscripts, display sums/products and integrals.
- Scalable paired delimiters; matrices, aligned equations, cases and arrays with
  `l/c/r` columns, solid/dashed rules and vertical boundaries.
- Plain `\text`/`\mbox`, upright/italic/bold math, five common blackboard sets,
  named/hex colors with explicit braced bodies, boxes, circles, bars and arcs.
- Leading `\newcommand` definitions with zero to nine **braced** arguments.
  Definitions are local to one expression; built-in redefinitions are rejected.
- A bounded per-renderer LRU. Results are immutable, failures are not cached, and
  cache keys include display mode and font size. `clearCache()` releases entries.

`renderMath()` is synchronous and returns all three text formats from one parse
and layout. PNG export is asynchronous. `parseMath()` exposes the initial syntax
tree for inspection; its node schema is experimental. `VlxError` identifies
unsupported syntax/glyphs and resource limits. Input, syntax depth, node count,
macro expansion, layout bounds, cache size and PNG pixel count are bounded.

The initial font data is a **237 KB subset of New Computer Modern metrics and
outlines** extracted from `@mathjax/mathjax-newcm-font` 4.1.3. It is data, not a
copied parser or renderer. [Font attribution and license](font/NOTICE),
[provenance](PROVENANCE.json) and the [reproducible extraction](../../scripts/vlx-conformance/build-font.cjs)
identify it explicitly. No KaTeX or MathJax executable code is shipped.

## Evidence and remaining work

[Tests](test/contracts.test.cjs) and the [comparison corpus](../../scripts/vlx-conformance/corpus.cjs)
cover 13 synthetic application-style examples. Current MathJax 4.1.3 is a semantic
and visual control; KaTeX 0.19.1 is a capability and performance control. The suite
checks exact token boundaries, macro isolation, malformed input, accessible
MathML, visible raster ink and array rules. Clean archives install without either
engine, compile with TypeScript 7 without DOM/Node ambient types, bundle for the
browser, and run on Node/Bun. [Benchmarks](bench/results/README.md) retain balanced
isolated-process measurements and identical-source controls.

Layout spacing, accent shapes, scripts and delimiter sizing are original and
still need broader typographic review. No pixel-identical upstream claim is made.
Missing work includes full problem-page composition with prose, figures and answer
choices; line breaking; a complete application corpus; broader glyph/TeX coverage;
advanced macros and text formatting; literal prime shorthand (explicit superscript
`\prime` works); equation references/numbering; and browser
screen-reader acceptance. Raw MathML is included, but speech, interactive equation
exploration and assistive-technology compatibility are not yet certified.

This package is neither released nor adopted. KaTeX and MathJax remain reference
fixtures, and their package families remain unfinished in the progress atlas.
