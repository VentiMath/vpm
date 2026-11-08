# vreact-swipeable

Independent replacement for **react-swipeable 7.0.2**, the current release and
VentiMath’s app version. React 19 is its only peer; there are no other runtime
dependencies. No upstream runtime code is copied or shipped.

```jsx
import { useSwipeable } from 'vreact-swipeable';
function Panel({ close }) {
  const handlers = useSwipeable({ onSwipedRight: close });
  return <div {...handlers}>Swipe right to close</div>;
}
```

Exports `useSwipeable`, `LEFT`, `RIGHT`, `UP`, `DOWN` and the corresponding callback,
handler and event-data types. CJS and ESM provide the same hook. Node 24/Bun SSR
initialization is supported; gestures need a browser. Old React versions and a UMD
bundle are outside this package’s target.

## Behavior

Default options match upstream: touch tracking enabled, mouse tracking disabled,
10px threshold, no rotation, unlimited duration and passive touch listeners.
`delta` can specify lowercase direction thresholds; missing directions use10px.
Once a swipe passes its threshold, subsequent movement stays tracked even when it
moves back below the threshold. Dominant-axis ties select a vertical direction.
Rotation, directional/general callbacks, taps, initial positions, first-move flags,
velocities and the start/end pass-through callbacks preserve the 7.0.2 contract.

`preventScrollOnSwipe` is opt-in. It makes the move listener nonpassive and prevents
cancelable touch movement only when that direction or a general swipe callback is
handled. Other touch listeners retain the requested `touchEventOptions.passive`.
The hook does not set CSS `touch-action`; browser scrolling otherwise stays enabled.

VentiMath’s configurator and messenger use the defaults and only close for right
swipes in LTR or left swipes in RTL. Their source-audited callback/ref contracts
are represented in the browser fixture; trusted touch tests verify vertical
scrolling remains enabled. The fixture is not the complete authenticated app.

## Corrections

- `touchcancel`, a second/changed finger, target replacement, disabled tracking,
  unmount and window blur cannot finish a stale gesture.
- Only the primary mouse button starts a drag. Mouse listeners attach to the
  target’s own document, including iframes, and are
  removed before end callbacks. Unmount cleans up even during an unfinished drag.
- Expired gestures and orphan end events cannot turn into taps. Start/end
  pass-through callbacks remain tied to actual tracked start/end events; expiry
  suppresses tap/swipe completion, not an already-fired start notification.
- Mutating a callback’s event-data fields or arrays cannot corrupt tracking state.
- Callback/configuration changes become active after React commits; abandoned
  renders do not change active listener callbacks.
- A composed ref can detach/reattach the same node synchronously without losing
  its gesture. Null refs suspend callbacks immediately and detach by the next
  microtask if not reattached; hook unmount detaches synchronously.

## Evidence

28 retained upstream cases and four original snapshots pass on Node 24 and Bun.
Five listener-count assertions are adapted explicitly for the added `touchcancel`
listener; all event expectations remain intact. Twelve mounted React lifecycle
scenarios include 11 failing upstream controls and StrictMode compatibility.
Seven additional controller regression groups cover cleanup, direction, expiry,
ref handoff and scroll prevention. Chrome checks 48 gesture payload scenarios
(with six explicit expired-tap corrections), eight app direction/close contracts,
trusted touch scrolling/prevention and real mouse input.

[Conformance](../../scripts/swipeable-conformance/README.md) includes fresh/frozen
npm/Bun exact archives, CJS/ESM SSR and TypeScript 7 NodeNext/Bundler DOM consumers.
[Benchmarks](bench/results/README.md) retain isolated AB/BA samples and controls.
No release, app adoption, assistive-technology or other-browser acceptance is claimed.
