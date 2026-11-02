# vreact-remove-scroll-bar

Independently written body scrollbar removal and layout compensation matching
**react-remove-scroll-bar 2.3.8**, for React 19 and modern browsers. Uses
[vreact-style-singleton](../vreact-style-singleton), with no tslib dependency.

```jsx
import {RemoveScrollBar, zeroRightClassName} from 'vreact-remove-scroll-bar';
// Mount while the overlay is open. Cleanup restores scrolling after the last lock.
<RemoveScrollBar />;
// Apply zeroRightClassName to fixed elements that must track the removed scrollbar.
```

The component accepts `gapMode="margin"` (default) or `"padding"`, `noRelative`
and `noImportant`. `getGapWidth(mode?)` returns integer `left`, `top`, `right`
offsets and the nonnegative scrollbar `gap`, preserving upstream's measurement
formula. Styles are shared until the last component unmounts; the first active
instance owns the CSS. Concurrent instances with differing options therefore do
not have independent styles. Existing inline body styles are left intact.

The root also exports `zeroRightClassName`, `fullWidthClassName`,
`noScrollbarsClassName` and `removedBarSizeVariable`. The same four names are
available from `vreact-remove-scroll-bar/constants`, which imports neither React
nor the stylesheet runtime. CSP nonces come from vget-nonce through the singleton.

SSR emits no markup or stylesheet; hydration applies the lock. CSS generation
is memoized across unchanged renders. Cleanup captures the original body element,
so replacing the body cannot decrement another element's lock. Negative counts
are treated as zero, and server-side measurements return independent zero objects.
These are intentional differences from upstream. Private `dist/*` imports and
older React releases are outside the supported public API.

This hides the body scrollbar; it does not implement focus trapping, wheel/touch
event interception, or the complete react-remove-scroll component.
[Checks](../../scripts/scrollbar-conformance/README.md) include that unchanged
caller, all CSS option combinations, nested locks and clean packed consumers.
[Measurements](bench/results/README.md) are bounded operation tests, not application
latency or browser rendering claims. Built, not released or adopted.
[Provenance](PROVENANCE.json).
