# vradix-react-dismissable-layer

Independent **@radix-ui/react-dismissable-layer 1.2.1** implementation for React
19. Coordinates outside pointer/focus interactions, Escape and modal pointer
blocking for menus and overlays. Two direct VPM dependencies, Primitive and
Compose Refs, form a four-package closure. React and ReactDOM are peers.

```jsx
import { DismissableLayer } from 'vradix-react-dismissable-layer';

<DismissableLayer onDismiss={close} onInteractOutside={event => {
  if (unsavedChanges) event.preventDefault();
}}>
  <Editor />
</DismissableLayer>
```

## Contract

`DismissableLayer`/`Root` accept div attributes, `asChild`, React 19 refs,
`disableOutsidePointerEvents`, `deferPointerDownOutside`, `onEscapeKeyDown`,
`onPointerDownOutside`, `onFocusOutside`, `onInteractOutside` and `onDismiss`.
`DismissableLayerBranch`/`Branch` register additional inside regions.
`useDismissableLayerSurface()` returns a ref for a region whose stopped click
may still finish a deferred dismissal.

Outside callbacks receive nonbubbling, cancelable CustomEvents on the original
event target, with the native event in `detail.originalEvent`. The specific
pointer/focus callback runs before `onInteractOutside`; cancellation prevents
`onDismiss`. Pointer notifications use ReactDOM's discrete flush. Escape belongs
to the highest layer in the document and passes the native KeyboardEvent.

Primary pointer dismissal is immediate by default. With
`deferPointerDownOutside`, it waits for a click and suppresses intervening focus
notifications. Stopping later events in that interaction cancels dismissal,
except on a registered surface. Secondary pointers remain immediate. Opening
pointer events cannot dismiss a newly mounted layer. React portal descendants
and branches count as inside.

Modal layers set the owning body's pointer events to `none`; the highest
blocking layer and layers above it remain interactive. User inline styles can
override the layer's derived pointer style, matching upstream. This component
does not trap focus or scroll; use Focus Scope and the caller's scroll policy.

## Improvements over the baseline

- Layer order, listeners, event constructors, body locks and timers belong to
  each document. Iframe layers cannot take Escape ownership from the main page.
  Native nodes are checked without cross-realm `instanceof` assumptions.
- Inside tracking belongs to the current event. Stopping an inside pointerdown
  no longer swallows the next outside pointerdown.
- Logical React nesting preserves child ownership even if child effects run
  first. Toggling a lower modal does not move it above a higher modal.
- Branches follow replaced `asChild` elements. Branch/surface registrations are
  counted, and composed paths recognize registered regions in open shadows.
- `pointercancel` releases a deferred gesture. Timers belong to their gesture
  and are canceled on completion, replacement and unmount; an older click cannot
  complete a newer gesture or call an unmounted layer.
- Body restoration preserves inline priority and leaves later external style
  changes intact. An identical external assignment is indistinguishable from
  the owned value. Composing text retains its Escape key.

These differences are intentional. The runtime was written independently;
[provenance](PROVENANCE.json) records the upstream baseline and source hashes.

## Validation and measurements

[Conformance fixtures](../../scripts/radix-dismissable-conformance/README.md)
compare upstream and VPM on React 19.1.0 and 19.2.4. Tests cover SSR/hydration,
callbacks/cancellation, deferred gestures, nesting, branches/surfaces, slots,
ref cleanup and StrictMode. Native Chrome checks include actual pointer hit
testing, mouse and Escape input, iframes, shadows and unchanged Dropdown Menu
2.2.1 callers. Four-package archive consumers verify fresh/frozen npm and Bun
installs, Node/Bun CJS/ESM SSR and TypeScript 7 DOM-only types.

[Benchmarks](bench/results/README.md) use production bundles in isolated
processes, balanced comparison order and identical-code controls. They measure
SSR, unchanged renders and immediate pointer/Escape dispatch through eight
mounted layers in jsdom. In the recorded runs, SSR took 74.2% less time on Node
and 53.5% less on Bun; unchanged renders took 65.8% and 51.3% less. Pointer and
Escape differences were inconclusive against the process/control spread. These
measurements exclude real browser layout, deferred timer latency and application
workload. Raw samples and source hashes are retained.

The target is Node 24 and Bun for tooling, and React 19 in browsers. This package
is built and tested but not yet released or adopted by VentiMath. Shadow containment covers exposed composed paths; closed shadow
internals remain opaque.
