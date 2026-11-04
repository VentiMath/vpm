# vradix-react-arrow

An independently written SVG arrow component matching **@radix-ui/react-arrow
1.1.17**, for Popper, menus and popovers. `Arrow` and `Root` are the same component.

```jsx
import { Arrow } from 'vradix-react-arrow';

<Arrow width={18} height={8} fill="currentColor" aria-hidden />
<Arrow asChild><svg viewBox="0 0 20 10"><path d="M0 0L20 0L10 10Z" /></svg></Arrow>
```

The default arrow points downward. Its caller handles positioning and rotation.
Width defaults to 10 and height to 5; numeric and SVG string dimensions pass
through. Native rendering fixes `viewBox="0 0 30 10"` and
`preserveAspectRatio="none"`, and renders the standard triangle. As upstream
does, it ignores ordinary children; use `asChild` for custom geometry.

`asChild` uses VPM's existing Slot behavior: one child, no extra DOM wrapper,
composed refs and events, merged classes/styles, and child prop precedence.
SVG attributes, ARIA attributes, styles and event handlers pass through. The
component does not assign a role, accessible name or `aria-hidden` automatically;
the caller decides whether its arrow is decorative. Refs point at the SVG.

## Implementation and scope

- The default triangle is one shared immutable React element. React still mounts
  a distinct polygon DOM node for each arrow, while repeated default renders
  avoid allocating another polygon element.
- One copied prop record carries the dimension defaults, fixed geometry and ref.
- The only direct runtime dependency is `vradix-react-primitive`; its Slot/ref
  closure is independently implemented in VPM. React and ReactDOM 19 are peers.

This small compatibility component deliberately retains upstream geometry and
override behavior. It makes no new positioning or accessibility guarantees.
The source was written independently with the published API and behavior as
references; this is not a clean-room claim. [Provenance](PROVENANCE.json) pins
the upstream source used for comparisons; MIT attribution is retained.

## Verification

[Contract and consumer fixtures](../../scripts/radix-arrow-conformance/README.md)
compare upstream and VPM on React 19.1 and 19.2, Node 24 and Bun. They cover SSR,
SVG dimensions/props, custom slots, callback ref cleanup, StrictMode, focus and
DOM identity, hydration and the unchanged Popper 1.4.0 caller. Clean package
installs check CJS/ESM, TypeScript 7 DOM-only consumers, browser bundles and native
Chrome SVG geometry/positioning in all four directions, both LTR and RTL.

[Balanced isolated benchmarks](bench/results/README.md) measure production React
SSR and jsdom updates against upstream. They exclude browser layout and paint;
they do not establish an application speedup. None of the four case directions
clears the identical-code control spread on either runtime in this recording.
Node medians are lower; Bun's resized-arrow median is 9.5% higher. These are
inconclusive measurements, not a demonstrated speedup or slowdown.

Built as an integration candidate. This package has not been released or adopted
by VentiMath yet.
