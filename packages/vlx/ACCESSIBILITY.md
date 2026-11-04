# Browser and accessibility verification

VLX's browser output is ready for an application integration trial. The automated
checks below pass in Chrome 156.0.8078.76. They do **not** certify screen-reader
speech, every browser/assistive-technology combination, or WCAG conformance.
VentiMath has not switched its renderers yet.

## Verified behavior

| Area | Evidence |
| --- | --- |
| Mathematical structure | Chrome exposes exactly one MathML root for each of 30 synthetic formulas, including fraction, root, script, limit and table roles. Numerator/denominator reading order is checked. |
| Duplicate and invisible content | Decorative SVGs and phantom text are excluded from the accessibility tree. TeX annotations do not create a second spoken expression in that tree. |
| Themes and sizing | Default HTML inherits its parent's color and font size. Both 200% and 400% text enlargement preserve the enlarged math. Explicit `fontSize` remains supported. |
| High contrast | System forced colors replace authored formula colors as well as default ink. Normal display preserves authored colors; callers remain responsible for their contrast against ordinary theme backgrounds. |
| Reflow | At 320 CSS px, prose wraps and oversized formulas scroll inside their own bounds; they do not widen the page or shrink away the user's text enlargement. |
| Keyboard | With `observeMath`, only overflowing formulas enter the tab order. Tab reaches them, arrow keys scroll, and Tab leaves without a trap. Resizing back to fit removes the added tab stop. |
| Inline alignment and clipping | Inline math shares the prose baseline; all 30 fixture outline bounds fit their SVG viewports. Light, dark, narrow and enlarged screenshots are generated for inspection. |
| Copying | With `observeMath`, mixed prose/formula selections copy each whole formula once as authored TeX. Tests use an in-memory copy event, without touching the OS clipboard. |
| Lifecycle | Replacement content is observed; cleanup disconnects listeners/observers and removes only attributes VLX added, preserving caller changes. |

The [browser suite](../../scripts/vlx-conformance/browser.cjs) runs in an isolated
Chrome profile and is a CI gate. It uses the Chrome accessibility tree, DOM
measurements, actual keyboard events, computed system colors and screenshots.
The [recorded result](../../scripts/vlx-conformance/browser-coverage.json) identifies
the runtime and tested source hashes. It uses synthetic content, not private
application problems.

## Browser integration

Use `RenderResult.html` for browser math. It pairs visual SVG with structured
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

In React, render the generated HTML in the host and call `observeMath(ref.current)`
in an effect that returns its cleanup function. Observe a container once rather
than installing observers on overlapping ancestors. A localized `scrollLabel`
option can replace the default accessible name. Browser consumers of `vlx/dom`
need TypeScript's DOM library; the root math declarations remain DOM-free.

Keep the application's existing legacy normalization, list handling, ordered
figure descriptions, error fallback, and authorization boundaries. This library
neither interprets arbitrary source HTML nor authorizes image URLs. `renderText`
rejects malformed math; callers that display source on errors should render that
fallback as text, never as untrusted HTML.

Default HTML uses inherited sizing; numeric `width`, `height` and `baseline`
describe the standalone SVG at 16 px unless `fontSize` is supplied. Do not use
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

Application integration, public release packaging and production cutover remain
separate from these verified package-level checks. A controlled application trial
can now use the documented browser lifecycle and existing error fallback while
those final reader/browser checks are completed.
