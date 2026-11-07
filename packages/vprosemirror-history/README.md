# vprosemirror-history

Independent undo/redo history targeting **prosemirror-history 1.5.1**, verified
against current and VentiMath's pinned **1.5.0** dependency graphs. Runtime
foundations are `vrope-sequence`, `vprosemirror-state` and `vprosemirror-transform`.

```js
import { EditorState } from "vprosemirror-state";
import { history, undo, redo, closeHistory } from "vprosemirror-history";
const state = EditorState.create({
  schema,
  plugins: [history({ depth: 100 })],
});
undo(state, dispatch);
// Start a separate undo event for this transaction:
dispatch(closeHistory(state.tr.insertText("New event")));
```

Also exports `undoNoScroll`, `redoNoScroll`, `undoDepth`, `redoDepth` and
`isHistoryTransaction`. Querying a command without `dispatch` does not mutate
state. Selections and bookmarks are restored through untracked changes; setting
`addToHistory: false` excludes a transaction from undo while retaining its effect.
Time, adjacency, composition and appended transactions determine event grouping.
Native `beforeinput` history requests respect the editor's editable state.

## Implementation

Inverse edits live in persistent event stacks. A separate shared map timeline
tracks coordinate changes, including links between changes and their inverses.
Clean undo/redo uses direct steps; untracked edits use mapped steps and bookmarks.
Unneeded prefixes and cancelled map pairs are reclaimed without changing retained
state snapshots. Records contain no map-only filler; the legacy branch-local
`compress()` hook consequently leaves an event stack unchanged. Internal state
layout differs from upstream and is not a public serialization format.

No upstream runtime is shipped. Keep one coherent model/state/transform graph in
an editor. Its browser view remains an upstream consumer until separately rebuilt.

## Compatibility and verification

All **28 unchanged upstream tests** pass on current, app, complete VPM and
VPM-history-on-app graphs on Node 24 and Bun. Five independent groups cover 4,000
seeded edits, persistent state branching, 1,000 partial undo/redo cycles, bounded
map retention, command/scroll flags, beforeinput and rebasing after history trims.
The latter reproduces incorrect text removal in upstream **1.5.0**; both VPM
graphs match **1.5.1** instead of preserving that bug. End-to-end collaborative
network sessions remain outside the verified application scope.

Depth and delay must be valid numbers. Positive integral depth and nonnegative
delay are accepted, including `Infinity`; zero/falsy values retain upstream's
100/500 defaults. Malformed truthy values are rejected rather than corrupting
history counts. `historyPreserveItems` prevents merging individual edits.

Real Tiptap 2.11.7 checks grouping, split/undo, appended transactions, depth,
redo invalidation and untracked edits across three graphs. Chrome exercises
trusted typing and undo/redo shortcuts plus editable/read-only beforeinput.
Exact six-package archives, fresh/frozen npm/Bun installs, module identity and
TS7 browser declarations are checked by the
[fixture](../../scripts/prosemirror-history-conformance/README.md).

[Benchmarks](bench/results/README.md) compare complete bundled editor graphs in
isolated processes, retaining every sample/control. They are local history
workloads, not application typing-latency guarantees. The recorded Node 24 runs
establish lower time in five of eight cases (19–49%); three remain inconclusive.
Bun 1.4.4 establishes higher time in five cases (30–41%); the other three remain
inconclusive. For example, recording 16 grouped edits takes 22.8 → 32.2 μs on Bun,
and 160 undo/redo cycles take 389 → 553 μs. These compare the complete VPM
model/state/transform/rope/history stack, so they do not isolate history's cost.
Public release, VentiMath
cutover, the browser view and full native input/IME acceptance are separate.
