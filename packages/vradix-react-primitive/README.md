# vradix-react-primitive

Independently written React DOM components matching **@radix-ui/react-primitive
2.2.0**. `Primitive` and its `Root` alias expose `a`, `button`, `div`, `form`, `h2`,
`h3`, `img`, `input`, `label`, `li`, `nav`, `ol`, `p`, `select`, `span`, `svg` and
`ul`. Each forwards native props and refs. With `asChild`, it delegates to
`vradix-react-slot` instead of adding a DOM wrapper.

```jsx
import {Primitive} from 'vradix-react-primitive';

<Primitive.button type="button">Save</Primitive.button>
<Primitive.button asChild className="action"><a href="/next">Next</a></Primitive.button>
```

This is the React component layer; `vradix-primitive` is the separate event/DOM
utility package. The only runtime dependency here is `vradix-react-slot`, with
React and ReactDOM 19 as peers. Rendering preserves Radix's browser detection
marker and component display names.

`dispatchDiscreteCustomEvent(target, event)` dispatches inside ReactDOM's
`flushSync` boundary so React state updates triggered by a custom event finish
synchronously. Null targets do nothing; the function returns `undefined`, including
when event cancellation makes native dispatch return `false`. Use it for custom
events requiring synchronous delivery, not as a general replacement for native
event dispatch or while rendering a component.

## Improvements and scope

- Named Slot wrappers are created only when a tag first uses `asChild`, then
  retained. Ordinary native elements do not initialize unused wrappers.
- The component table is built in place, and the copied props record is reused
  when forwarding the ref instead of copying it again.
- ReactDOM is loaded by this module only when discrete-event dispatch is used.
  This does not claim that an application avoids ReactDOM or reduces its bundle.
- Slot and ref composition use VPM's independently implemented dependency chain,
  including stable refs and complete, once-only cleanup.

React versions before 19 are outside the tested peer contract. The app's 2.1.3
baseline is retained for ordinary contracts; current Slot 1.5.0 behavior governs
`asChild`, including its newer render-function and invalid-child handling.
Unchanged Toggle callers confirm application-facing behavior.

## Verification

[Fixtures](../../scripts/radix-react-primitive-conformance/README.md) cover all
17 tags against current and app-version controls, aliases, props, display names,
SSR, lazy initialization and dispatch errors. Original and VPM run the same
StrictMode/ref, Toggle interaction, hydration and synchronous custom-event checks.
Clean npm/Bun installs cover the exact three-package closure, both module formats,
TypeScript 7 DOM-only declarations and browser bundling on Node 24 and Bun.

[Isolated measurements](bench/results/README.md) cover module initialization with
already-loaded dependencies and React's development SSR renderer. Initialization
excludes source compilation, module resolution and cold dependency loading. These
measurements do not establish browser paint, cold-start or application speedups.
On Node 24, module initialization takes 83% less time and the slotted-button
SSR case takes 11.8% less time, beyond the identical-code control spread. The
ordinary-button direction is inconclusive. Bun's controls were too noisy to
establish any timing improvement; the full raw results are retained. Lazy Slot
creation defers work until `asChild` is used; it does not eliminate that work.

Built, not released or adopted by VentiMath. [Provenance](PROVENANCE.json) records
the exact upstream reference and independent implementation. MIT attribution is
retained; no clean-room claim is made.
