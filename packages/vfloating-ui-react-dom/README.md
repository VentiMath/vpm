# vfloating-ui-react-dom

React positioning hooks for floating elements, independently implemented against
**@floating-ui/react-dom 2.1.9**. Geometry and automatic updates use
`vfloating-ui-dom`, `vfloating-ui-core` and `vfloating-ui-utils`.

```tsx
import {useFloating, offset, flip, shift, autoUpdate} from 'vfloating-ui-react-dom';

function Popover() {
  const {refs, floatingStyles} = useFloating({
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({padding: 4})],
    whileElementsMounted: autoUpdate,
  });
  return <>
    <button ref={refs.setReference}>Anchor</button>
    <div ref={refs.setFloating} style={floatingStyles}>Content</div>
  </>;
}
```

## API and differences

The hook returns coordinates, placement, strategy, middleware data,
`isPositioned`, `update()`, callback/mutable refs, resolved elements and
`floatingStyles`. It accepts external elements, virtual references, custom
platforms, open state, transform or layout styles and subscription cleanup.
Styles round coordinates to the owning window's pixel ratio.

All nine reactive middleware factories accept an optional dependency list;
`arrow` accepts an element or a React ref. DOM positioning, overflow detection,
ancestor lookup, `platform` and `autoUpdate` remain available as exports.
Pass captured values explicitly, for example `offset(() => gap, [gap])`.
Like upstream, function source comparison alone cannot detect changed closures.

Changes from the baseline:

- Only the latest pending measurement can publish. Older results cannot overwrite
  newer coordinates after another update, placement change or reference switch.
- Closing invalidates pending work; reopening retained elements requests a fresh
  position. Unmounting invalidates outstanding measurements.
- Middleware comparison handles cyclic plain records and preserves DOM object
  identity. It does not schedule state changes during render.

React and React DOM **19** are peers; the fixtures use **19.1.0**, as VentiMath
currently does. Node.js 24+ and Bun support server imports and rendering. React
16–18 compatibility is outside this package's support contract. Higher-level
focus, click, dismiss, hover and keyboard-navigation helpers belong to
`@floating-ui/react`; they are not implemented by this package. Its current
0.27.20 popover caller is exercised with this replacement underneath it.

## Verification and performance

Node 24 and Bun pass 15 unchanged upstream runtime tests and ten VPM probes,
including paired controls reproducing stale-result failures in the original.
Three additional package tests check exports, middleware and cyclic comparison.
Chrome compares 72 mounted app-shaped positioning cases and subscription cleanup.
Packed npm/Bun installs, both module systems, server rendering, browser bundling
and TypeScript 7 consumers are checked.

The original type fixture retains its assertions. Both implementations report
one identical obsolete `@ts-expect-error`: TypeScript 7's DOM library now accepts
string assignment to `HTMLElement.style`. All other expectations hold; separate
app-shaped CJS/ESM consumers compile without errors in NodeNext and bundler modes.

[Measurements](bench/results/README.md) use separate processes and same-source
controls for middleware creation, controlled-platform mounted updates and server
rendering, using production React builds. They do not measure browser layout, frame rate or application latency.
The current Bun recording takes 9.6% more time for mounted updates (3.93 versus
3.63 µs) and 57.7% more for a three-middleware chain (150 versus 95 ns). All Node
directions and both Bun server-rendering directions are inconclusive against
the process controls; no speedup is established.

See the [conformance fixture](../../scripts/floating-react-dom-conformance/README.md)
and [provenance](PROVENANCE.json). Runtime code is an independent, source-informed
implementation; public declarations and original tests retain MIT attribution.
