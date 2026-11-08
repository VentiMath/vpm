# vprosemirror-view

**Private internal milestones, not a complete `prosemirror-view` replacement.**
The package has explicit decoration and read-only rendering entries, no root
export and no `EditorView`. Do not repin an application or publish it as a full
view package. References are View **1.42.9** and VentiMath's **1.41.6** baseline.

## Decoration model

`vprosemirror-view/decorations` independently implements `Decoration`,
`DecorationSet` and child decoration sources: inline/node/widget descriptors,
create/find/add/remove/map, persistent snapshots, boundary affinity, keys and
removal callbacks. It retains branches untouched by every mapping step and maps
affected ranges through the complete mapping before repartitioning. Input arrays
are retained unchanged; specs and widget factories remain caller-owned references.

The two unchanged 47-test suites, seven original groups with 2,000 seeded mapping
cases, and the actual documentation editor's Selection contract are checked on
Node 24 and Bun. [Decoration measurements](bench/results/README.md) remain mixed:
highlight creation and narrow queries are faster, but bulk creation/mapping/removal
are slower. Mapping 100 spans still takes roughly 8–9 μs versus 1 μs upstream.

## Read-only DOM renderer

```js
const { Decoration, DecorationSet } = require('vprosemirror-view/decorations');
const { ReadOnlyRenderer } = require('vprosemirror-view/readonly');
const decorations = DecorationSet.create(doc, [
  Decoration.inline(2, 8, { class: 'selection' }),
]);
const renderer = new ReadOnlyRenderer(element, { doc, decorations });
renderer.update(nextDoc, nextDecorations);
const point = renderer.domAtPos(3, 1);
const position = renderer.posAtDOM(point.node, point.offset);
const node = renderer.nodeDOM(0);
const caret = renderer.coordsAtPos(3);
renderer.destroy();
```

This independent renderer uses the schema's DOM recipes and creates DOM nodes
directly. It covers the documentation editor's paragraphs/headings, text/marks,
ordinary and task lists, quotes, code, rules, hard breaks and images. Inline/node
attributes and wrappers compose with marks and widgets. Reconciliation preserves
unchanged model nodes, and equivalent updates make no DOM writes. Widget keys
preserve their nodes; position callbacks follow shifted ancestors and become
undefined after removal. Cleanup runs once per mounted widget.

`domAtPos`, `posAtDOM` and `nodeDOM` use those retained records, with bounds cached
per successful update and binary search across siblings. Document positions
and text offsets count UTF-16 code units, including boundaries within surrogate
pairs. Default forward lookup prefers shallow boundaries; its `side` argument
can prefer preceding/following text. Reverse lookup handles static schema markup,
mark/decoration wrappers and widget content; positive `bias` chooses the far edge
inside an opaque leaf. `nodeDOM` returns the underlying schema node or text node
at a rendered boundary, not its decoration wrapper. Out-of-range DOM offsets,
foreign DOM, nodes detached from this renderer and queries after destruction are rejected. Queries do not
write DOM or alter focus.

`coordsAtPos` reads a fresh caret rectangle from the mount document's viewport.
It follows wrapping, marks, breaks, images, scrolling and reflow without caching
layout. Inline positions return a vertical caret; boundaries between block nodes
return a horizontal edge. The optional side chooses the adjacent content and
matches the current/app controls. Iframe coordinates stay in that iframe's
viewport. A browser layout engine is required; JSDOM is rejected rather than
reported as a zero-size measurement. Native Chrome checks cover 19 scenarios,
including resizing and updates, with more than 15,000 rectangle comparisons.
Geometry queries preserve DOM, focus and existing selection. Safari/Firefox and
vertical writing modes remain unverified.

Boundaries and deliberate behavior:

- The root is always noneditable. Task checkboxes from static schema markup are
  disabled; caller-owned checkbox widgets retain their own behavior. Upstream's
  schema-only read-only view leaves those static task controls enabled.
- Widget factories receive the optional `widgetHost` and a position callback.
  No `EditorView` host is synthesized. A factory requiring view methods needs a
  caller-supplied host; its input/selection behavior is not implemented here.
- The owner document comes from the mount, including iframe mounts. The renderer
  owns only its root. Schema changes are rejected. Rendering exceptions destroy
  the partial renderer rather than leave partially updated content mounted.
- Schema DOM recipes are supported; custom node views, including the React
  ImageUploadNode component, are not mounted. Arbitrary node-view lifecycle and
  full Tiptap application integration are separate work.

Fourteen structural snapshots and 120 update snapshots match current and app
controls in Chrome, except the named disabled-task-control policy. Native checks
also cover layout, identity, widget focus/position/cleanup, iframe ownership and
noneditable input. Twenty-one additional lookup fixtures and 24 update snapshots
compare every valid document and DOM offset against current/app controls, with
round trips for all three forward sides. Ten original DOM groups and the earlier model checks pass
on Node/Bun. Exact archives, clean installs, CJS/ESM and TS7 are verified.
[Conformance details](../../scripts/prosemirror-view-conformance/README.md) explain
these controls; [renderer measurements](bench/results/readonly.md) explain their
limited performance scope.

## Remaining work

The package remains unfinished and cannot replace VentiMath's Tiptap editor.
The read-only rendering and lookup foundation is verified. Coordinate hit testing
(`posAtCoords`), custom component lifecycle, focus and native selection handling,
and editing behavior still need implementation. Coordinate hit testing is the
next bounded engineering step; it does not by itself make the editor usable.

Full `EditorView`, custom node views, DOM selection/input/mutation handling,
IME/composition, clipboard, accessibility and adoption remain unverified.
The transform [deep-deletion reproduction](../../scripts/prosemirror-schema-list-conformance/deep-deletion-followup.json)
(3..42), bulk decoration costs and the recorded Bun create/destroy overhead
(about 50 μs for 32 paragraphs) remain full editing acceptance gaps. This
read-only milestone neither repairs nor hides them.
