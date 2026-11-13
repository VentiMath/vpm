# vperfect-scrollbar

Independent desktop scrollbars targeting **Perfect Scrollbar 1.5.6**, with zero
runtime dependencies. The contract follows VentiMath's `FuseScrollbars`: construct
on a positioned container, retain native scroll positions, subscribe to `ps-*`
events, and destroy on effect cleanup.

```js
import PerfectScrollbar from 'vperfect-scrollbar';
import 'vperfect-scrollbar/css/perfect-scrollbar.css';

const scrollbar = new PerfectScrollbar(container, {
  wheelPropagation: true,
  suppressScrollX: true,
});
container.scrollTop = 0;
scrollbar.update();
// On unmount:
scrollbar.destroy();
```

The constructor accepts an HTMLElement or a selector in the current document.
The container must have constrained dimensions and positioned layout (normally
`position: relative`). Existing `.ps`, `.ps__rail-x/y` and `.ps__thumb-x/y` hooks
remain available, including VentiMath's z-index and RTL overrides. Content is not
wrapped or replaced; scrolling remains ordinary `scrollTop`/`scrollLeft`.

## Desktop contract

Wheel scrolling, boundary propagation, wheel speed, both-wheel-axes mapping,
keyboard navigation, rail paging and pointer thumb dragging are supported.
Options include `handlers`, `wheelPropagation`, `wheelSpeed`, `useBothWheelAxes`,
`suppressScrollX/Y`, `scrollX/YMarginOffset`, `min/maxScrollbarLength` and
`scrollingThreshold`. Handlers are `wheel`, `keyboard`, `click-rail` and `drag-thumb`.
Defaults follow the desktop control; the full accepted surface is in the
[declarations](index.d.mts).

`update()` refreshes dimensions and direction. ResizeObserver and content changes
also schedule a single update per animation frame. Ancestor `dir` changes refresh
RTL geometry. Explicit updates still work when observers are unavailable.

Movement emits `ps-scroll-x/y`, `ps-scroll-left/right/up/down` and
`ps-x/y-reach-start/end` events on the container. Reach events fire when entering
a boundary; redundant updates do not emit duplicate movement or reach events.
`reach`, dimensions, active-axis flags and thumb/rail elements remain readable.

## Improvements and boundaries

- Fractional geometry is preserved; constrained thumbs never exceed the viewport.
  Scroll/reach reporting uses native positions and modern RTL negative offsets.
- Listeners, timers, observers and dragging belong to the container's window and
  are removed by idempotent `destroy()`. A second live owner rejects. Removing
  an instance during its own scroll callback does not restart timers or classes.
- Keyboard controls leave buttons and editable text alone. Focusable scrollbar
  roles expose orientation, value/range and their controlled element. Any generated
  container ID is removed on destruction unless the caller replaced it.
- Existing caller classes, content and inline styles survive cleanup. Invalid
  numeric settings and handler names reject before the host is modified.
- The stylesheet includes reduced-motion and forced-colors rules. This is not
  a claim of completed assistive-technology or cross-browser acceptance testing.

VentiMath disables custom scrollbars on mobile, touch-capable and native devices.
Touch/swipe inertia is deliberately outside this desktop package; requesting a
`touch` handler or `swipeEasing` rejects. IE-era positive RTL scroll modes, arbitrary
rail-border/margin themes and undocumented internal fields are not supported.
Use native scrolling on those mobile paths, as the app already does.

Generated IDs, fractional rounding, deduplicated reach events and automatic
updates differ from upstream. The supplied stylesheet preserves the caller's
hooks and geometry, rather than promising every upstream CSS customization.

## Verification

[Checks](../../scripts/perfect-scrollbar-conformance/README.md) cover Node 24 and
Bun 1.4.4, real Chrome input, React 19.3.1 StrictMode lifecycle, owner-document
portals, strict TS7 consumers, and isolated npm/Bun packed installs.
[Benchmarks](bench/results/README.md) measure JavaScript/DOM work in jsdom with
fixed layout metrics; they do not measure browser paint or frame rate.

Built for the documented caller. No public release or application adoption is
claimed by this implementation commit.

Scroll positions and reach state commit before callbacks; reentrant updates do not redispatch the same movement, and nested scrolling supersedes stale notifications.
