# vprosemirror-commands

Independent editing commands targeting **prosemirror-commands 1.7.2**, compared
with the current release and VentiMath's 1.7.1. The runtime is written for VPM;
upstream runtime files are not included.

```js
import {
  chainCommands,
  newlineInCode,
  splitBlock,
} from "vprosemirror-commands";

const enter = chainCommands(newlineInCode, splitBlock);
const available = enter(view.state); // Query without dispatching.
enter(view.state, view.dispatch, view);
```

## Scope and compatibility

Exports cover deletion, splitting, joining, lifting, wrapping, block types,
selection movement, mark toggling, command composition, automatic joining and
PC/Mac base keymaps. Mark options include whitespace, mixed selections and inline
atom content. Commands accept an optional view for directional textblock-boundary
checks; the browser view itself is a separate package.

The runtime dependencies are `vprosemirror-model` 1.25.12,
`vprosemirror-transform` 1.12.5 and `vprosemirror-state` 1.4.4. An editor must use one
coherent graph for these classes, including imports inside the view and plugins.
Installing the VPM packages alongside unmodified upstream class instances is not
a migration. State's optional `prosemirror-view` peer supplies view types for
TypeScript consumers; commands do not import that runtime.

The 1.7.2 split behavior resolves the editable position after selection deletion,
including deletion that removes a list wrapper. The accompanying transform fix
preserves a following list item's paragraph when deleting from a code block to
that paragraph's start. No application-level performance or security guarantee is
implied by replacing these commands.

## Verification

All **134 unchanged upstream tests** pass on Node 24 and Bun 1.4.4. Six original
contract groups add 500 deterministic command sequences, cross-list deletion,
isolating boundaries, atom selection, view direction, mark options, capability
checks, command chaining and metadata-sensitive automatic joining.

Thirteen real Tiptap 2.11.7 snapshots match current and app dependency controls in
JSON, HTML and selection. They include history plus application-shaped link,
blurred-selection and trailing-node plugins. Fresh and frozen npm/Bun installs,
CJS/ESM identity, TypeScript 7 declarations and Chrome use the packed VPM closure.
See the [fixture](../../scripts/prosemirror-commands-conformance/README.md).

[Benchmarks](bench/results/README.md) use separate processes, balanced order and
identical-source controls. They measure command operations with their complete
model/transform/state dependencies, not this package in isolation or end-to-end
editor latency. All samples and inconclusive cases are retained.

In the final recordings, seven of eight Node cases show lower time beyond the
control spread; range marking is inconclusive. Bun cursor marks, cross-list
splitting and Enter capability checks are faster. Ordinary Bun splitting remains
29% slower (823 → 1,063 ns) and joining 23% slower (611 → 759 ns); its other cases
are inconclusive. The validated direct deletion step removes the initial
cross-list slowdown without changing the document or selection results.

This is source-package completion. Public release, VentiMath adoption, native
keyboard/IME acceptance and collaborative editing remain separate work.
