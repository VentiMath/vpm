# vreact-popper

Independent **React Popper 2.3.0 navigation contract** for React 19.3, built over VPM Floating's existing positioning foundation.

```jsx
import { Manager, Reference, Popper } from 'vreact-popper';
<Manager>
  <Reference>{({ ref }) => <button ref={ref}>Contests</button>}</Reference>
  <Popper placement="bottom-start">
    {({ ref, style, placement }) =>
      <div ref={ref} style={style} data-placement={placement}>Menu</div>}
  </Popper>
</Manager>;
```

## Application contract

The audited callers are the horizontal navigation's group and collapse components. They use render props, root portals, conditional menu children and explicit placements that switch with the app's direction. All twelve explicit side/alignment placements, absolute/fixed positioning, inner refs, virtual references, asynchronous `update`, arrows, offsets, flipping and clipping options are included. Standard modifier options are declared explicitly.

This package does not implement the general `usePopper` hook, custom Popper modifier callbacks, automatic placement or synchronous `forceUpdate`. These APIs have no audited app caller. Custom callbacks and unsupported modifier names fail explicitly. Other MUI callers of `@popperjs/core` remain separate work; removing that package from the entire app is not implied.

VPM Floating owns geometry, scrolling and resize observation. Stable refs/state preserve menu DOM, keyboard focus and selection on parent renders. Only the newest active measurement may publish; observers and React 19 callback refs clean up on unmount. Reference/floating size changes trigger positioning without requiring a window resize.

React 19.3 StrictMode also receives an explicit regression check: the unchanged control leaves the first menu at `(0, 0)`, while this wrapper positions it against its reference. The normal upstream geometry remains the comparison baseline.

Two measured geometry differences are intentional: in a scaled clipping container, the control leaves the bottom of the menu outside the visible boundary. VPM flips it above the anchor and keeps the entire menu visible. The browser fixture asserts both the control failure and the corrected bounds. With a non-overlay scrollbar and an anchor at the right edge, the control also tethers the menu a few pixels into the scrollbar; VPM keeps its right edge inside the scrollport while the arrow remains attached to the anchor. The fixture fixes scrollbar dimensions so this case is exercised on macOS and Linux. These are separate from the matching ordinary placement matrix.

The complete runtime closure is VPM's Floating DOM/core/utils plus `vreact-fast-compare`; React is the peer. There is no upstream Popper engine or warning helper in this closure. This is source completion for the documented navigation contract, not a published release or app adoption.

[Conformance](../../scripts/react-popper-conformance/README.md), [isolated benchmarks](bench/results/README.md) and [provenance](PROVENANCE.json) describe verification and limits. The benchmark measures React server-render/setup work, not browser layout or navigation frame rate.
