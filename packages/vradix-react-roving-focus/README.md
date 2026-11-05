# vradix-react-roving-focus

Independent **@radix-ui/react-roving-focus 1.2.1** implementation for React 19.
It gives a group one keyboard entry point and moves focus among its items with
arrow keys, Home/End and PageUp/PageDown. Eleven direct VPM dependencies form a
14-package closure; React and ReactDOM are peers.

```jsx
import * as RovingFocus from 'vradix-react-roving-focus';

<RovingFocus.Root orientation="horizontal" loop>
  <RovingFocus.Item asChild tabStopId="first">
    <button>First</button>
  </RovingFocus.Item>
  <RovingFocus.Item asChild tabStopId="second">
    <button>Second</button>
  </RovingFocus.Item>
</RovingFocus.Root>
```

## Contract and improvements

`Root`/`RovingFocusGroup`, `Item`/`RovingFocusGroupItem` and
`createRovingFocusGroupScope` preserve the current caller's public surface:
controlled/default tab-stop IDs, change callbacks, cancellable entry focus,
active/focusable items, render-prop children, orientation, inherited direction,
looping, refs and `asChild`. Shift+Tab exits the group. Pointer entry does not
redirect focus to another item. Modified arrow keys are left to the caller.

- Deferred navigation belongs to its group. It is canceled on unmount and a
  newer navigation supersedes pending work. A delayed key event cannot steal
  focus after the user has focused another element.
- The timer reads the current collection and focusable flags when it runs.
  A target disabled during the event's update is skipped. It uses VPM
  Collection's linear DOM-order read, including synchronous reordering.
- Focus checks use each element's owner document, and entry events use its
  window. Inside an iframe, navigation stops at the first focused candidate;
  upstream can continue to the last candidate because it checks the outer
  document instead.
- A nonfocusable item remains out of the tab sequence even when it is the
  controlled current item. Upstream still gives that item `tabIndex=0`.
- Replacing a slotted root moves the entry listener to the new element.
  Upstream can retain the old root's listener, losing entry cancellation.

The delayed-navigation, nonfocusable-current and replaced-root behavior above
are intentional differences, with paired upstream controls. Collection items
outside the current root are excluded by VPM Collection. Portal the whole group
to retain its items. This package manages focus; callers still supply semantic
roles, accessible names, selection behavior and disabled DOM attributes.

## Verification

[Paired fixtures](../../scripts/radix-roving-conformance/README.md) cover Node 24,
Bun, React 19.1/19.2, DOM-free SSR and hydration without node replacement.
Native Chrome verifies all four orientation/direction combinations, actual
Tab/Shift+Tab traversal, looping, cancellation, controlled updates, nested scopes,
iframes, root replacement and an unchanged current Dropdown Menu caller.

Clean npm/Bun fresh and frozen archive installs check the entire closure,
CJS/ESM identity and TypeScript 7 DOM-only consumers in both resolution modes.
Safari, Firefox and manual screen-reader acceptance are not established.

[Balanced isolated measurements](bench/results/README.md) retain process samples,
identical-code controls and source hashes. They measure 16-item server renders,
unchanged renders and controlled tab-stop changes in React/jsdom; they do not
measure browser paint or application interaction latency.

In this recording, server renders take 52.9% less time on Node and 23.2% less on
Bun; unchanged renders take 51.1% and 37.3% less; controlled changes take 49%
and 38% less. Every direction exceeds the identical-code control spread in
every process pair. These compare the complete VPM and upstream closures.

Built as an integration candidate, not released or adopted by VentiMath.
[Provenance](PROVENANCE.json) records the inspected reference and independent
implementation. No upstream runtime is copied; this is not a clean-room claim.
