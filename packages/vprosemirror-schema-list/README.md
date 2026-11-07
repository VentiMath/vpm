# vprosemirror-schema-list

Independent list schemas and editing commands targeting **prosemirror-schema-list
1.6.0**, with VentiMath's **1.5.1** checked separately. Browser callers pin the
app's StarterKit/task extensions **2.11.7**, core **2.27.2** and PM **2.11.7**.
Runtime dependencies are the VPM model, state and transform packages.

```js
import { wrapInList, sinkListItem, liftListItem } from "vprosemirror-schema-list";
wrapInList(schema.nodes.bullet_list)(state, dispatch);
sinkListItem(schema.nodes.list_item)(state, dispatch);
liftListItem(schema.nodes.list_item)(state, dispatch);
```

The public API also includes `orderedList`, `bulletList`, `listItem`,
`addListNodes`, `wrapRangeInList`, `splitListItem` and `splitListItemKeepMarks`.
Lists support custom starting numbers and schema-defined attributes. The split,
lift and sink commands accept a type or a readonly array of item types, including
mixed task/list items. A split retains the item's type; `splitListItemKeepMarks`
retains active marks. Item attributes supplied for a new empty item follow the
upstream end-of-textblock behavior.

## Implementation and differences

This runtime was written independently. It plans edits from schema-valid ranges,
nests items with gap-preserving steps and combines compatible item shells for a
single lift. Stricter schemas retain per-item lifting from right to left.
Empty nested items are promoted through a minimal structural replacement.
Unchanged document nodes remain persistent; steps support inversion and mapped
selections. `wrapRangeInList` appends to the transaction supplied by its caller.

The 1.6.0 mixed-item API and lists that may begin with lists are supported. The
older 1.5.1 implementation lacks those features and crashes on the latter case.
Query-only lift checks validate the planned edit: VPM returns `false` when a
schema constraint prevents lifting, where upstream can return `true` and then
return `false` when given a dispatch function. No transaction is dispatched on
failure. Undocumented runtime internals are not compatibility contracts.

## Verification and scope

All **38 unchanged current upstream tests** pass on current upstream, full VPM,
VPM lists on current foundations and VPM lists on app foundations on Node 24 and
Bun 1.4.4. App 1.5.1 is retained as a negative control for its eight pre-1.6.0
differences. Six independent groups include **6,000 seeded edits**, schema
attributes, marks, query-only calls, mapping, inversion and range wrapping.
Actual Tiptap list/task-list commands and trusted keyboard events are checked in
Chrome. Exact archives, clean npm/Bun installs, CJS/ESM and TS7 are verified by the
[conformance fixture](../../scripts/prosemirror-schema-list-conformance/README.md).

**Full editor adoption is still separate.** A synthetic cross-list text replacement
exposed an existing VPM transform fitting discrepancy. The fixture preserves its
[reproduction](../../scripts/prosemirror-schema-list-conformance/diagnose-transform.cjs).
The 4,000 isolated caller edits include arbitrary text selections; the 2,000
full-VPM list edits use text replacements within one textblock while list commands
still span blocks. This distinguishes verified list behavior from unverified
whole-editor parity. Resolve the transform discrepancy before an editor release.

[Isolated benchmarks](bench/results/README.md) retain every pair and control.
List-only cases use identical upstream foundations to isolate this implementation;
explicit full-stack cases measure all VPM foundations together. They are local
workloads, not application responsiveness guarantees. Lifting 12 items takes
about 25% less time on both engines. Empty nested splits remain slower: 5.0 →
8.2 μs on Node and 2.6 → 4.1 μs on Bun. Sink feasibility checks cost 81 → 321 ns
and 49 → 192 ns respectively. Node sinking also costs 16% more. Other list-only
directions remain inconclusive under the control criterion. Full-stack wrapping
takes 21% less time on Node but 57% more on Bun; full-stack lifting is inconclusive
on Node and 26% higher on Bun. No universal speedup, release or app cutover is
implied by this package being implemented.
