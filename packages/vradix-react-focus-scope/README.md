# vradix-react-focus-scope

Independent **@radix-ui/react-focus-scope 1.3.1** implementation for React 19.
Controls autofocus, keyboard loops, focus containment and restoration for
interactive overlays. Three direct VPM dependencies form a five-package closure:
Primitive, Compose Refs and Tabbable. React and ReactDOM are peers.

```jsx
import { FocusScope } from 'vradix-react-focus-scope';

<FocusScope trapped loop onMountAutoFocus={event => {
  event.preventDefault();
  preferredInput.current?.focus();
}}>
  <input ref={preferredInput} aria-label="Name" />
  <button>Save</button>
</FocusScope>
```

## Contract and improvements

`FocusScope`/`Root` support div attributes, `asChild`, React 19 refs, `loop`,
`trapped`, `branches`, `onMountAutoFocus` and `onUnmountAutoFocus`. Autofocus
events are cancelable and do not bubble. Mount autofocus skips links, then falls
back to the scope itself. Restoration is deferred until after unmount. Trapping
and looping apply to the active scope; modified Tab keys are left to callers.

- Active scopes, focus listeners and mutation recovery belong to each document.
  A scope in an iframe does not pause the parent document's scope. Events,
  observers, focus reads and timers use the owning window.
- Logical React nesting determines ownership even when portalled children mount
  before parent effects. Inactive scopes cannot reclaim focus after a DOM
  removal. Removing the active focused node recovers to a live candidate.
- Default deferred restoration yields to a newer scope or a later focus choice.
  StrictMode effect replay cancels stale cleanup and preserves the original
  return target. Caller-provided autofocus callbacks can still choose focus.
- `onKeyDown` is called and can cancel internal Tab handling. Upstream overwrites
  this prop. A slotted child's prevented event is honored too.
- [VPM Tabbable](../vtabbable/README.md) supplies live sequential order and focus
  eligibility: positive tab indices, inert ancestors, disabled fieldsets, radio
  groups, visibility and open shadow roots. Upstream's narrower candidate walk
  can choose incorrect Tab boundaries. Ordinary zero-index DOM order uses a
  boundary scan with full validation of the surviving edges. Positive indices,
  slots and open shadow roots use the full ordering path. No candidate cache can
  become stale after DOM or attribute changes. Closed shadows are not traversed.

The branch API is included: `FocusScopeBranchProvider`,
`useFocusScopeBranchRegistry` and `useFocusScopeBranch`. A nullish provider is
transparent. Registrations are reference-counted: two owners of one branch
require two matching removals. Upstream's first removal drops both owners.
Branches in the same document allow focus outside the DOM subtree; they are not
added to the scope's Tab-loop sequence, matching the public contract.

These ownership, restoration, key-handler, candidate and registry changes are
intentional differences. Slots inherit the documented VPM Slot behavior.
This component supplies focus behavior, not dialog roles, accessible names,
background inertness or scroll locking. Callers supply those semantics.

## Verification

[Paired fixtures](../../scripts/radix-focus-scope-conformance/README.md) cover
Node 24, Bun, React 19.1/19.2, SSR/hydration identity, autofocus cancellation,
updated callbacks, trap/loop boundaries, nested scopes, branches, refs and cleanup.
Chrome compares upstream and VPM with real Tab/Shift+Tab input, iframe traps,
independent documents, positive tab indices, inert controls, mutation recovery,
newer focus ownership and unchanged modal/nonmodal Dropdown Menu callers.
VPM checks simultaneous nested portals, open shadow roots and StrictMode cleanup.

Clean npm/Bun fresh and frozen installs verify the five-package closure,
CJS/ESM SSR and TypeScript 7 DOM-only consumers in both resolution modes.
Safari, Firefox and manual screen-reader acceptance are not established.

[Balanced isolated measurements](bench/results/README.md) retain all process
samples, identical-code controls and source hashes. Production React/jsdom
workloads measure SSR, unchanged renders and Tab-loop handling with identical
visible-box models; CSS resolution/layout are excluded. These are not browser
frame or application latency measurements.

In this recording, SSR takes 35.7% less time on Node and 12.4% less on Bun;
unchanged renders take 25.8% and 14.5% less. Those directions clear the controls
in every pair. Tab-loop medians are 7.2% higher on Node and 6.9% higher on Bun,
but those differences are unestablished at this precision. Median process times
are about 120 → 128 microseconds on Node and 45 → 48 microseconds on Bun for the
32-control fixture; no browser-latency conclusion follows from this model.

Built as an integration candidate; not released or adopted by VentiMath.
[Provenance](PROVENANCE.json) identifies the reference and independent runtime.
No upstream runtime is copied; this is not a clean-room claim.
