# vfloating-ui-react

Independent React interactions targeting the **@floating-ui/react 0.27.20** APIs
used by VentiMath's Tiptap popovers, dropdown menus and tooltips. The package version
matches that baseline; it does not promise the original library's entire API.
React and React DOM 19 are peers. Positioning uses `vfloating-ui-react-dom` and
focus traversal uses `vtabbable`; both runtime dependencies are VPM implementations.

## Supported scope

- `useFloating`, root context, positioning middleware and DOM exports.
- Click, hover/rest delays, focus, Escape/outside-press dismissal and ARIA roles.
- Composed interaction props, React 19 merged refs and delay groups.
- Portals and modal/nonmodal focus management, initial/return focus and guards.
- Ordered lists, disabled items, arrow/Home/End navigation, looping and menu typeahead.

```js
import {useFloating, useClick, useDismiss, useRole, useInteractions} from 'vfloating-ui-react';

function usePopover(open, onOpenChange) {
  const floating = useFloating({open, onOpenChange});
  const props = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context),
  ]);
  return {...floating, ...props};
}
```

Mount `FloatingFocusManager` around the panel, inside `FloatingPortal` when the
panel is portaled. Attach `refs.setReference`/`setFloating`, the returned prop
getters and `floatingStyles` to their elements. The fixture contains complete
popover, tooltip and keyboard-menu examples.

This is a source-informed rewrite, with independently written runtime and public
subset declarations. It is not a copied bundle or a clean-room claim. Original
MIT tests and license are retained with hashes and provenance.

## Behavior and boundaries

Merged-ref cleanup releases every owned ref even when an earlier cleanup throws,
then rethrows the first error. Modal cleanup restores an existing `aria-hidden`
value, including `"false"`. Paired tests reproduce the original's stopped cleanup
and lost attribute. Hover timers and pending focus work are cancelled on teardown.
Click-pinned panels stay open after hover ends, and Escape prevents immediate
hover reopening until re-entry. Positioning inherits VPM's stale-measurement fixes.

The declarations intentionally omit APIs not implemented here: FloatingTree and
nested-tree event routing, safe polygons, transitions, composite widgets, virtual
or grid list navigation, client-point/inner positioning and the `utils` subpath.
Menu typeahead does not implement editable combobox inputs. Modal behavior applies
to ordinary document DOM; nested cross-shadow/iframe focus scopes and assistive
technology behavior have not been certified. No React 16–18 or Safari/Firefox
compatibility claim is made. This package is built and tested; application adoption
is a separate change.

## Verification and performance

Node 24 and Bun pass **37 unchanged upstream tests plus nine integration/control
probes**. Fixtures cover app-shaped menu navigation, disabled items, repeated-letter
typeahead, focus/portals, dismissal, tooltip delays and React 19 ref cleanup.
Packed npm/Bun installs check CJS/ESM identity, SSR, browser bundling and TypeScript 7
NodeNext/bundler consumers. Chrome checks the mounted interactions against the
original. [Commands and scope](../../scripts/floating-react-conformance/README.md).

[Benchmark results](bench/results/README.md) use production React in separate
processes, balanced execution order and identical-source controls. SSR and prop
composition measure local CPU work, not browser frame rate, complete interaction
latency or application bundle savings. All samples and inconclusive comparisons
remain in the report.

[Provenance](PROVENANCE.json) · [MIT license](LICENSE)

In this recording, SSR uses 40–58% less paired time on Node and 38–52% less on
Bun. Composed click props use 18%/42% less time on Node/Bun. Each difference is
consistent across all four pairs and exceeds the identical-source control spread;
the full process ranges remain in the report.
