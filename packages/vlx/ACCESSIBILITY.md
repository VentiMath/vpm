# VentiLaTeX browser and accessibility verification

VentiLaTeX (VLX, pronounced “Vee Ell Ex”) is adopted by VentiMath frontend main `15a83287` using r7. The automated
checks below pass in Chrome 156.0.8078.76. They do **not** certify screen-reader
speech, every browser/assistive-technology combination, or WCAG conformance.
Application adoption and deployment are tracked separately from these package checks.

## Verified behavior

| Area | Evidence |
| --- | --- |
| Mathematical structure | Chrome exposes exactly one MathML root for each of 53 synthetic formulas, including fraction, root, script, limit and table roles. Numerator/denominator reading order is checked. |
| Duplicate and invisible content | Decorative SVGs and phantom text are excluded from the accessibility tree. TeX annotations do not create a second spoken expression in that tree. |
| Themes and sizing | Default HTML inherits its parent's color and font size. Both 200% and 400% text enlargement preserve the enlarged math. Explicit `fontSize` remains supported. |
| High contrast | Shared document CSS replaces authored formula colors as well as default ink in forced-colors mode. React/observeMath install it; static HTML uses vlx/styles.css. Normal display preserves authored colors; callers remain responsible for their contrast against ordinary theme backgrounds. |
| Reflow | At 320 CSS px, prose wraps and oversized formulas scroll inside their own bounds; they do not widen the page or shrink away the user's text enlargement. |
| Keyboard | With `observeMath`, only formulas with usable scrolling overflow enter the tab order. Tab reaches them, arrow keys scroll, and Tab leaves without a trap. Resizing or scaling the SVG to fit removes the added tab stop; hidden overflow gets none. |
| Inline alignment and clipping | Inline math shares the prose baseline; all 48 fixture outline bounds fit their SVG viewports. Light, dark, narrow and enlarged screenshots are generated for inspection. |
| Copying | With `observeMath`, mixed prose/formula selections copy each whole formula once as authored TeX. Tests use an in-memory copy event, without touching the OS clipboard. |
| Direct React output | 114 inline/display cases match r6 geometry, MathML and SVG structure in DOM and SSR. Native Chrome checks cover SVG bounds, MathML accessibility roles and oblique/forced-colors styling. Initial mounts and formula changes make zero HTML writes under Trusted Types, with no permissive policy. |
| React parent updates | Real Chrome checks preserve the same InlineMath, DisplayMath and MathText formula nodes, focus and scroll through 60 updates in each of lazy and preloaded modes, with zero HTML writes. Changed TeX and provider defaults still update. Node/Bun jsdom checks verify hydration reuses server math; Chrome verifies failed chunk loads reach the application error boundary. |
| Equation references (0.2.0) | Native SVG reference links expose an Equation N link name in Chrome. Enter focuses the corresponding HTML equation target, and editing the document renumbers the reference while keeping its target ID. Node/Bun checks cover forward references, isolated documents, hydration, StrictMode, fallback and unchanged-parent focus retention. Multirow targets focus the whole formula block. This feature ships in 0.2.0; VentiMath adoption of it is separate. |
| Lifecycle | Replacement content is observed; cleanup disconnects listeners/observers and removes only attributes VLX added, preserving caller changes. Print windows without ResizeObserver or MutationObserver still render; resize/beforeprint refreshes remain available. |

The [browser suite](../../scripts/vlx-conformance/browser.cjs) runs in an isolated
Chrome profile and is a CI gate. It uses the Chrome accessibility tree, DOM
measurements, actual keyboard events, computed system colors and screenshots.
The [recorded result](../../scripts/vlx-conformance/browser-coverage.json) identifies
the runtime and tested source hashes. It uses synthetic content, not private
application problems.

## Browser integration

React applications use the native elements from `vlx/react`. For other browser
integrations, use `RenderResult.html`. It pairs visual SVG with structured
MathML; a standalone SVG or PNG image does not provide that navigable structure.
The root entry is safe to import during server rendering. The optional DOM helper
only touches a browser when called:

```js
import { createRenderer } from 'vlx';
import { observeMath } from 'vlx/dom';

const renderer = createRenderer();
host.innerHTML = renderer.renderText(String.raw`Compute $x^2$.`).html;
const stop = observeMath(host);
// Call stop() when the host unmounts. Content replacements are observed.
```

For React 19, use the optional components. They manage observation and cleanup,
keep prose escaped, and isolate failures to one formula:

```tsx
import { InlineMath, DisplayMath, MathText, preloadMath } from 'vlx/react';

<MathText source={String.raw`Compute $x^2$.`} />
<InlineMath tex="x+1" style={{ '--vlx-scale': 1.2 }} />
<DisplayMath tex={String.raw`\frac{1}{2}`} />
```

The renderer and outline pool load on first math use. Plain prose does not fetch
them. `preloadMath()` is optional for route prefetching; `loadingFallback` changes
the loading state. `fallback` changes a failed formula's default source-text
fallback and can be a React node or `(error, source) => ReactNode`. Initial server
rendering uses Suspense's loading fallback; streaming SSR can wait for the lazy
renderer. These components do not replace app normalization, lists or figures.

Observe a container once rather
than installing observers on overlapping ancestors. A localized `scrollLabel`
option can replace the default accessible name. Browser consumers of `vlx/dom`
need TypeScript's DOM library; the root math declarations remain DOM-free.

Keep the application's existing legacy normalization, list handling, ordered
figure descriptions, error fallback, and authorization boundaries. This library
neither interprets arbitrary source HTML nor authorizes image URLs. `renderText`
throws on malformed math by default. With `{errorMode: 'source'}`, only failed
formulas become escaped source text, and diagnostics identify their spans.

Default HTML uses inherited sizing, multiplied by `--vlx-scale` (default 1).
Fitting display math is centered; `--vlx-display-margin: 0` selects left alignment.
Numeric `width`, `height` and `baseline` describe the standalone SVG at 16 px unless `fontSize` is supplied. Do not use
those default pixel values to override the browser's inherited size. Formulas
that require two-dimensional layout retain their size and local scrolling.
[WCAG's reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
distinguishes such content from ordinary prose. The accessible representation uses
[MathML structure](https://www.w3.org/TR/mathml-core/), not a flattened English
`aria-label` in place of the expression.

## Remaining acceptance

VoiceOver/Safari and NVDA/Chrome speech and mathematical navigation have **not**
been exercised. Before a production-wide renderer switch, check real reader
output for nested fractions, indexed roots, matrices, script/limit placement,
explicit equation labels and mixed prose/figures. This requires those actual
reader/browser combinations; an accessibility-tree snapshot cannot substitute
for it. WebKit and Firefox rendering are also not covered by this Chrome gate.

The [public release](https://github.com/VentiMath/vpm/releases/tag/vlx-0.2.0)
ships this browser lifecycle. Application integration and production cutover
remain separate from these verified package-level checks. A controlled application
trial can use the documented lifecycle and existing text-on-error behavior while
those final reader/browser checks are completed.

After `await preloadMath()`, React components render on their first pass without
an initial loading fallback. `MathProvider` sets shared `scrollLabel` and
`loadingFallback`; nested defaults and explicit component overrides are supported.
Fitting or hidden formulas avoid computed-style reads.
