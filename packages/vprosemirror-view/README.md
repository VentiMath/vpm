# vprosemirror-view

**Internal milestone: decoration models only.** This private workspace package
is not a replacement for `prosemirror-view` yet. It has no root export and no
`EditorView`. Do not repin an application or publish it as a complete view package.

The explicit `vprosemirror-view/decorations` entry implements `Decoration`,
`DecorationSet` and the child `DecorationSource` contract independently, targeting
View **1.42.9** and checking VentiMath's **1.41.6** baseline.

```js
const { Decoration, DecorationSet } = require('vprosemirror-view/decorations');
const highlight = Decoration.inline(2, 8, { class: 'selection' });
const decorations = DecorationSet.create(doc, [highlight]);
const next = decorations.map(transaction.mapping, transaction.doc);
```

Inline, node and widget descriptors preserve attributes/specs, boundary affinity,
widget keys and removal callbacks. Sets support create/find/add/remove/map, child
projection and persistent snapshots. They retain branches untouched by every mapping step and map affected ranges
through the complete supplied mapping before repartitioning. Additions merge
only their affected branches; narrow queries skip irrelevant child ranges. Input arrays are not consumed, unlike upstream;
returned arrays cannot mutate the set's private indexing. Specs and DOM factories
remain caller-owned references, as upstream expects.

Widgets are descriptors in this milestone. Their factories, event handlers and
teardown hooks are retained, not mounted or invoked by a view. The optional
upstream peer supplies only the `EditorView` type for widget factory callbacks;
this package's runtime imports no upstream view. Public types use VPM documents
and mappings. Full editor plugin/type integration is part of the later view work.

## Verification

The unchanged 47-test decoration suites from both reference versions pass on
Node 24 and Bun, including structural mapping, compound changes and subtree
identity. Seven additional groups cover 2,000 seeded supplied-mapping cases,
inclusive edges, widget equality, exact removal callbacks, child layers and
persistent updates. The documentation Tiptap editor's Selection contract passes
12 selection/focus/editability combinations against current/app/VPM models;
the actual app file is also checked locally without changing it.

[Conformance details](../../scripts/prosemirror-view-conformance/README.md) and
[measurements](bench/results/README.md) record the scope and controls. Packed-file,
module and TS7 checks are internal verification, not a public release.

Bulk creation, mapping and removal still cost more than upstream in the recorded
100-decoration cases; the mapping case is about 10× slower (8–9 μs). The
app-shaped highlight construction and range queries are faster. These are
model measurements, not an application performance claim.

## Remaining work

Next: a read-only document/decorations DOM renderer that preserves unaffected DOM
nodes on updates, checked against the documentation editor's schema. This does
not yet imply browser editing support. `EditorView`, DOM selection, input and
mutation handling, IME/composition, clipboard, accessibility and application
adoption remain separate milestones.

The transform [deep-deletion reproduction](../../scripts/prosemirror-schema-list-conformance/deep-deletion-followup.json)
(selection 3..42) remains a full editing acceptance gap. Decoration models consume
supplied documents/mappings; they do not decide that deletion's ancestor structure.
