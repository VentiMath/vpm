# vreact-transition-group

Independent React 19 transitions for the MUI components used by VentiMath,
modeled on **react-transition-group 4.4.5**. The package has no runtime dependencies
other than its React peer. Native class-list operations replace `dom-helpers`.

```tsx
import { CSSTransition } from 'vreact-transition-group';
import { useRef } from 'react';

function Panel({ open }: { open: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  return <CSSTransition nodeRef={nodeRef} in={open} timeout={150}
    classNames="panel" unmountOnExit>
    <div ref={nodeRef}>Content</div>
  </CSSTransition>;
}
```

Exports: `Transition`, `CSSTransition`, `TransitionGroup`, and `config.disabled`.
The three components also have default-export subpaths, for example
`vreact-transition-group/Transition`. CJS, ESM and TypeScript declarations ship
together. Node 24 and Bun are the validation runtimes; React 19 is the peer.

## Verified contract

- Explicit `nodeRef`, function or element children, forwarded ordinary props,
  enter/exit/appear callbacks, numeric and phase-specific timeouts, end listeners,
  disabled transitions, mount-on-enter and unmount-on-exit.
- CSS base/active/done classes, appearance completion, caller-supplied class maps,
  interrupted transitions and preservation of unrelated classes.
- Keyed groups, departing child retention/order, returning keys, `childFactory`,
  group-level appearance/enter/exit settings, and optional wrappers.
- Unchanged MUI 7.2.0 Collapse, Fade, Grow, Slide, Zoom and ButtonBase ripple;
  MUI X 8.7.0 DateCalendar with normal and reduced animations. Browser checks
  include focus/DOM identity and an iframe's owner document.

Live `Transition` and `CSSTransition` require an explicit `nodeRef`; React 19
removed the legacy `findDOMNode` route. Enter callbacks receive `isAppearing`,
exit callbacks receive no node, and `addEndListener` receives the completion
callback. MUI already supplies refs and adapts these signatures for its callers.
Use a distinct ref per keyed child. `SwitchTransition`, `ReplaceTransition`,
legacy implicit refs and undocumented component-instance methods are outside
this application contract and are not exported.

## Changes

Each transition owns its pending commit callbacks and fallback timer. Reversal,
listener completion and unmount clear the timer and invalidate stale completion
callbacks. Upstream ignores stale completion but leaves fallback timers scheduled.
CSS cleanup remembers the actual nodes it modified and removes managed classes
on unmount, including a retained node in another document. No Babel helpers,
prop-types or DOM-helper package is installed by this package.

[Conformance](../../scripts/transition-group-conformance/README.md) covers
upstream comparisons, cleanup improvements, packed installations and actual MUI
callers. [Measurements](bench/results/README.md) distinguish server rendering
and simulated DOM work from browser animation latency. App adoption, full-page
acceptance and a public consumer release are separate from these package checks.
