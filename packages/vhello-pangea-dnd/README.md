# vhello-pangea-dnd

Independent **@hello-pangea/dnd 18.0.1** API implementation for VentiMath's
Scrumboard: horizontal columns, vertical cards of different heights, reordering
and transfers between lists. React/ReactDOM 19 are peers. There are **zero runtime
dependencies**: the board owns a small external store instead of a Redux and
React Redux layer, and the runtime needs no Babel helpers.

```jsx
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

<DragDropContext onDragEnd={saveOrder}>
  <Droppable droppableId="cards" type="card">
    {provided => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {cards.map((card, index) => (
          <Draggable key={card.id} draggableId={card.id} index={index}>
            {item => (
              <div ref={item.innerRef} {...item.draggableProps} {...item.dragHandleProps}>
                {card.title}
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

Keep the existing import name by installing the VPM archive under
`@hello-pangea/dnd`. See [installation](../../docs/INSTALLATION.md). The consumer
owns data changes: `onDragEnd` receives the original source and destination,
index, draggable ID, list type, movement mode, reason and `combine: null`.
Canceled and outside drops have no destination. Reorder data synchronously in
that callback, then persist it as needed.

## Implemented scope

- `DragDropContext`, `Droppable`, `Draggable`, render-prop children, refs, native
  handle/draggable/droppable props and the snapshots used by the app.
- Horizontal/vertical lists, empty lists, variable item dimensions, nested
  columns/card lists distinguished by type, duplicate handles on a column and
  header, live disabled items/targets and cross-list transfers.
- Mouse movement after a five-pixel lift threshold; touch long-press at 120 ms.
  Touch movement before lift remains native scrolling. Dragging blocks the next
  click so a drop does not also activate a card. Interactive descendants such as
  edit buttons do not start a drag by default; an explicit handle remains useful.
- Space lifts/drops, arrows move within/across lists, Escape/Tab cancel. Focus is
  restored to the moved handle after the consumer reorders. Handles reference
  shared instructions, and an assertive live region reports lift/move/drop.
  Responders can override announcements with `provided.announce`.
- Clipped targets, nested scroll-container and page auto-scrolling, keyboard
  scroll-into-view, owner-document/window event handling, and cleanup of pending
  gestures, listeners and frames on cancellation/unmount.
- SSR/hydration with React IDs, StrictMode, controlled application rerenders,
  lifecycle responders and `autoScrollerOptions.disabled`.

Refs register geometry directly. VentiMath currently omits `droppableProps` on
its list containers; that markup is explicitly tested and works here. Consumers
should still spread these props for inspection and upstream compatibility.

## Deliberate differences and boundaries

CSS `gap` is included in displacement: the paired 8-pixel-gap fixture keeps the
next card in place on lift, whereas upstream moves it by 8 pixels. Source-slot
hit-testing also preserves the current order when grabbing the center of a card.
Registry lookup does not interpolate application IDs into selectors. List
eligibility is checked again when a pointer drop finishes.

This is the app-used list API, **not the whole upstream library**. Virtual lists,
combining, custom sensor APIs, cloning and unclipped-target overrides are not
implemented; supplying those active options throws. Fine-grained auto-scroll
configuration is unsupported apart from `disabled`. The exported declarations
cover the implemented surface rather than promising these extra features.

Movement previews are immediate, with no sibling spring or drop animation;
`isDropAnimating` is always false. There is no animation delay before the end
callback. Layout assumes ordinary untransformed rectangular list containers;
scaled/rotated ancestors, virtualized/reparented drags and live item resizing
during a drag are not established. Items should retain stable IDs through a
drag. VentiMath's existing nested buttons remain interactive, so use a visible
non-button drag area or a dedicated handle for pointer dragging.

## Evidence

[Paired conformance checks](../../scripts/dnd-conformance/README.md) compare the
pinned upstream with VPM on Node 24, Bun, React 19.1/19.2 and native Chrome. Exact
archive installs check aliases without overrides, frozen locks, CJS/ESM identity,
SSR/hydration and TypeScript 7 using the app's nested-column/card type shape.
Browser tests use real keyboard, mouse and touch input and assert results, focus,
preview spacing, scrolling, disabled behavior, cancellation and teardown.
Safari, Firefox and manual screen-reader acceptance have not been established.

[Balanced isolated benchmarks](bench/results/README.md) measure 32-card SSR,
unchanged renders and data reorders, with raw samples, source hashes and
identical-code controls. They do not measure drag smoothness or application
latency. The omission of upstream animation and unused APIs is explicit above.

In the production-bundle recording, unchanged 32-card renders take 79.5% less
time on Node and 78.6% less on Bun; data reorders take 56.6% and 61.4% less.
SSR medians take 73.5%/73.8% less. All directions clear the recorded controls,
but Bun SSR has a large 70.5% identical-code spread, so its precise ratio is
particularly uncertain. The report preserves that noise and every sample.

[Provenance](PROVENANCE.json) records inspected reference files and app scope.
The runtime is independently written; no upstream runtime is copied. This is
not a clean-room claim. Release availability and app adoption are separate.
