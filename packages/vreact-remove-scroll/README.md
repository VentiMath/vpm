# vreact-remove-scroll

An independent React 19 implementation of the public **react-remove-scroll 2.7.2**
scroll-isolation API, built on VPM's scrollbar, stylesheet, callback-ref and
sidecar packages. No tslib or upstream scroll-lock runtime is used.

```jsx
import {RemoveScroll} from 'vreact-remove-scroll';
<RemoveScroll enabled={open} allowPinchZoom>
  <section style={{overflowY: 'auto', maxHeight: '80vh'}}>Content</section>
</RemoveScroll>;
```

The last mounted active lock controls wheel/touch isolation. Scrollable descendants
can move until their boundary; nested scrolling regions, horizontal/RTL scrolling,
shards and React portals are supported. Body scrollbar compensation uses
[vreact-remove-scroll-bar](../vreact-remove-scroll-bar). This is scroll isolation,
not a focus trap or an accessibility-complete modal.

`enabled` and `removeScrollBar` default to true. Other options are `noIsolation`,
`noRelative`, `inert`, `allowPinchZoom`, `gapMode`, `shards`, `as` and `forwardProps`.
`inert` uses pointer-event CSS on the body and allowed nodes, matching the upstream
option rather than the HTML inert attribute. Portaled content needs an explicit
shard when pointer isolation is enabled. `RemoveScroll.classNames.fullWidth` and
`.zeroRight` expose the scrollbar compensation classes.

The `UI` subpath exports `RemoveScroll` with a required `sideCar` prop; `sidecar`
has a default export usable directly or through `vuse-sidecar.sidecar()` for lazy
loading. SSR renders only the host/children and applies no locks. Public root,
UI and sidecar APIs are supported; private `dist/*` imports and older React
versions are not claimed.

The event controller shares one listener set per owner document and stores event
identity weakly, without per-event timers. This fixes stale decisions when equal
wheel deltas arrive before an old queue entry expires. Touch direction tracks
successive positions, allowing reversal at an edge. Forwarded child refs and
capture handlers are composed instead of overwritten. Open shadow roots use the
composed event path; `overflow:clip` is not treated as scrollable. Testing covers
modern DOM behavior, not every browser/mobile gesture implementation.

[Checks](../../scripts/scroll-conformance/README.md) compare original and VPM
behavior, deliberate repairs, packed npm/Bun installs and TS7 consumers.
[Measurements](bench/results/README.md) describe SSR and synthetic event dispatch;
they are not browser frame-rate claims. Built, not released or adopted.
[Provenance](PROVENANCE.json).
