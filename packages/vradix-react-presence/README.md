# vradix-react-presence

Independent **@radix-ui/react-presence 1.1.11** implementation for React 19.
Keeps an element mounted while its CSS exit animations finish. One runtime
dependency, `vradix-react-use-layout-effect`; React and ReactDOM are peers.

```jsx
import { Presence } from 'vradix-react-presence';

<Presence present={open}>
  <div data-state={open ? 'open' : 'closed'}>Panel</div>
</Presence>
```

## Contract and improvements

`Presence` and its `Root` alias accept `present` and one ref-capable React element.
When `present` changes to false, a changed CSS animation name starts the exit.
With no animation, the same animation name, or `display: none`, removal is
immediate. CSS transitions alone do not retain the element. A function child
always stays mounted and receives `{ present }`, including the retained exit
period. On reopening it receives true immediately.

- In modern browsers, native CSS animation identities govern completion.
  Every finite animation on the element must finish or be canceled. Upstream
  removes the element after the first matching completion.
- Descendant and pseudo-element animations cannot finish their parent's exit.
  Pending completions cannot remove a reopened or replaced element. If CSS
  replaces an animation during exit, its replacement finishes before removal.
- Infinite decorative animations, zero-duration animations without a positive
  delay, and names with no actual keyframes do not prevent removal. Finite paused
  animations retain the element until they finish or are canceled.
- Without `getAnimations`, an event fallback counts exact, decoded animation
  names, including CSS escapes and duplicates. Upstream substring matching can
  mistake a shorter name for the active exit. The fallback cannot distinguish
  old events with identical names or detect missing keyframes.
- Changed child refs receive cleanup and the new element, including React 19
  callback-ref cleanup. Upstream can retain the old ref. Computed styles belong
  to the element's window. Temporary fill styles are restored during cleanup
  without a timer that can outlive its element.

These completion/ref changes are intentional differences. An exit animation
must be applied synchronously with `present=false`. This helper does not choose
animations, manage focus, or supply accessible names; those belong to callers.

## Verification

[Paired fixtures](../../scripts/radix-presence-conformance/README.md) check
React 19.1 and 19.2 on Node 24 and Bun: SSR, hydration identity, exact animation
names, multiple exits, pseudo/descendant events, refs, native promises, reopening
and forced mounting. Chrome checks real CSS animations, cancellation, StrictMode,
replaced children, an iframe and unchanged Dropdown Menu opening/Escape/focus
return. Clean npm/Bun fresh and frozen installs verify the two-package closure,
CJS/ESM identity and TypeScript 7 DOM-only consumers.

[Measurements](bench/results/README.md) use separate production processes,
balanced order, identical-code controls and source hashes. Cases measure 32-child
server renders, unchanged renders and mounting/removal without animations in
React/jsdom. They do not establish browser frame or application latency gains.
In this recording, SSR takes 69.2% less time on Node and 43.7% less on Bun;
unchanged renders take 60.8% and 37.7% less. Those directions clear the controls
in every process pair. Mount/removal has no established difference. Bun's SSR
control spread reaches 36.4%, so its precise percentage is especially uncertain.

Safari, Firefox and manual screen-reader acceptance are not established.

Built as an integration candidate; not released or adopted by VentiMath.
[Provenance](PROVENANCE.json) records the reference inspected and independent
implementation. No upstream runtime is copied; this is not a clean-room claim.
