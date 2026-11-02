# vtabbable

DOM focus eligibility and keyboard tab order, independently implemented against
**tabbable 6.5.1**. Version 6.5.1 identifies this compatibility baseline; it does
not imply identical behavior in the corrected cases below. No runtime dependencies.

```js
import {tabbable, isFocusable} from 'vtabbable';
const stops = tabbable(dialog);
if (isFocusable(trigger)) trigger.focus();
```

## API and deliberate differences

Exports `tabbable`, `focusable`, `isTabbable`, `isFocusable` and `getTabIndex`.
Supports positive tab-index ordering, disabled fieldsets, details/summary,
radio groups, slots and optional shadow-root traversal. Display checks are
`full` (default), `full-native`, `legacy-full`, `non-zero-area` and `none`.
`none` bypasses layout checks; it still excludes disabled, inert and
visibility-hidden elements. `includeContainer` also considers the root element.
Pass `getShadowRoot: true` for open shadows, or a callback for known closed roots.
The callback may return `true` for an undisclosed root, matching upstream's fallback.

- Radio names are compared as data, so quoted names work without `CSS.escape`.
  Radio groups use their actual form owner, including radios outside the form.
  Checked-radio lookup is shared only within one traversal; later mutations
  are visible on the next call.
- Inert inheritance follows the composed tree, including assigned slots and
  shadow hosts. Attribute presence makes an element inert, including `inert="false"`.
- Nested disabled fieldsets honor each first legend's exemption independently.
- DOM globals are not captured at import. A server import can subsequently
  operate on a document created later; cross-realm elements use their owning window.

This library identifies focus candidates; it does not implement a focus trap,
keyboard event routing or every browser's native sequential navigation policy.

## Evidence and performance

Node 24 and Bun pass ten unchanged upstream unit assertions, six additional
controls (including Floating UI 0.27.20's actual focus manager) and an SSR/module
check. Chrome covers 1,080 fixture comparisons and six focused cases, including
native focus checks for corrected inert and nested-legend behavior. The fixture
runner explicitly records the original inert-shadow exclusions; it does not
silently change the expected lists. Packed npm/Bun consumers verify CJS, ESM,
browser bundling and TypeScript 7 declarations.

[Measurements](bench/results/README.md) use separate processes, balanced order
and identical-source controls. DOM timings use jsdom 26.1.0 with a fixed visible-style provider and
`displayCheck: 'none'`; they measure traversal and ordering, excluding CSS
resolution, layout and rendering. The original jsdom style-engine workload
stalled on Bun for both implementations; both runtimes now use the same explicit
model. Actual style behavior remains covered by the Chrome tests.
In the visible-style model, the 120-radio case takes 84% less paired time on Node
and 88% less on Bun. The small four-control form is inconclusive on both runtimes.
Shadow traversal, button predicates and explicit tab-index lookup also improve
in this model. All comparisons remain in the report.
Safari, Firefox and the complete upstream Cypress suite are not certified here.

[Fixture commands](../../scripts/tabbable-conformance/README.md) and
[provenance](PROVENANCE.json) identify the exact baseline. Public declarations,
original tests and fixtures retain upstream MIT attribution. The runtime is
independently written with source review; this is not a clean-room claim.

## Installation

Available in the public [Floating UI release](../../docs/INSTALLATION.md#floating-ui).
The React entry installs all six VPM packages from pinned release URLs. Package
versions identify upstream API baselines; application adoption is separate.
