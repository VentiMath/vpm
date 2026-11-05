# vradix-react-portal

Independent **@radix-ui/react-portal 1.2.0** implementation for React 19.
Places content in a chosen DOM container while preserving its React context
and event ancestry. Two direct VPM dependencies, Primitive and Use Is Hydrated,
form a five-package closure; React and ReactDOM are peers.

```jsx
import { Portal } from 'vradix-react-portal';

<Portal container={overlayContainer} asChild>
  <section aria-label="Details">Panel content</section>
</Portal>
```

## Contract and improvements

`Portal` and `Root` are aliases. They accept the usual div attributes, children,
ref, `asChild`, and an optional `Element | DocumentFragment | null` container.
Without a container, or with null, the destination is the global document's body.
Pass an explicit container for another document. A shadow root is also a valid
DocumentFragment. React owns placement, context, events, container changes and
removal; the package does not manually move or retain detached nodes.

- Fresh client roots place content on their first commit. The upstream mount
  effect schedules another state update, even with an explicit container.
- Server rendering and the first hydration pass omit portals, including those
  with explicit DOM containers. Upstream tries to render an explicit-container
  portal on the server, which React rejects. Each hydrating root has its own
  server snapshot even if another root already mounted.
- The existing independent VPM Primitive/Slot implementations handle `asChild`,
  attributes and React 19 refs. No separate mount-state implementation or new
  layout-effect dependency is needed.

The first-commit timing and explicit-container SSR behavior are intentional
changes. Changing the container remounts the portal subtree, as React does
upstream. Default placement still uses the global document; this package cannot
infer an outer tree's iframe from invisible portal output. For slots, the
[documented VPM Slot differences](../vradix-react-slot/README.md) also apply.
Portal does not provide focus trapping, modal semantics or scroll locking.

## Verification

[Paired fixtures](../../scripts/radix-portal-conformance/README.md) cover Node 24,
Bun and React 19.1/19.2: DOM-free SSR, explicit-container server rendering,
independent-root hydration, context/events, container replacement, refs,
StrictMode and detached fragments. Chrome checks first-commit placement, shadow
roots, iframe focus, hydration identity and unchanged Dropdown Menu keyboard
navigation, Escape and focus return in a custom container.

Clean npm/Bun fresh and frozen installs check the five-package closure, Node/Bun
CJS/ESM identity and TypeScript 7 DOM-only consumers in both resolution modes.
Safari, Firefox and manual screen-reader acceptance are not established.

[Isolated measurements](bench/results/README.md) retain all samples, balanced
process order, identical-code controls and source hashes. They measure 32 portals
in production React/jsdom: empty server output, unchanged client renders and
mount/removal in an explicit container. They do not measure browser frames or
application interaction latency.

In this recording, SSR takes 34.3% less time on Node and 22.9% less on Bun;
mount/removal takes 15% and 13.8% less. Unchanged renders take 13.8% less on Node.
Those directions clear the identical-code controls in every pair. Bun's unchanged
render difference is unestablished at this precision.

Built as an integration candidate; not released or adopted by VentiMath.
[Provenance](PROVENANCE.json) records the inspected baseline and independent
implementation. No upstream runtime is copied; this is not a clean-room claim.
