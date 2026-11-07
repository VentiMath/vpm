# vprosemirror-state

Independent editor state, transactions, selections and plugins targeting
`prosemirror-state` **1.4.4**, the version used by VentiMath and the current release
checked on 2026-11-06. Runtime code is written for VPM; upstream runtime files are
not included.

```js
import { EditorState, TextSelection } from 'vprosemirror-state';

let state = EditorState.create({ schema });
state = state.apply(state.tr.insertText('Hello'));
state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 6)));
```

The state holds a persistent document, selection and plugin fields. Transactions
apply edits through `vprosemirror-transform`; selection bookmarks map through those
edits for history. Plugins can filter transactions, append follow-up transactions,
serialize their fields and supply props to a separate editor view.

## Scope and compatibility

Explicit-position text insertion preserves an existing selection unless the
inserted text ends at that selection’s mapped end, matching upstream.

Text, node and all-document selections, selection search and JSON, stored marks,
transaction metadata, plugin keys, reconfiguration and ordered append/filter hooks
are implemented. Public declarations retain typed plugin props and view callbacks.
The optional `prosemirror-view` peer supplies those **types**; it is never imported
by this package's runtime. TypeScript browser consumers must provide that peer
until a VPM view replacement exists.

The two runtime dependencies are `vprosemirror-model` 1.25.12 and
`vprosemirror-transform` 1.12.5. Tiptap integrations must resolve every model, state
and transform import to one coherent graph, including imports inside plugins and
the view. The conformance fixture demonstrates those aliases. Installing this
package alongside separate upstream class instances is not an editor migration.

Verified scope includes VentiMath's Tiptap 2.11.7 commands, history, link selection,
blurred-selection decorations, trailing-paragraph plugin state and view lifecycle.
The browser view implementation, complete app adoption, IME and collaborative
transport acceptance remain separate. No consumer release is claimed here.

## Differences from upstream

- Serialized selection positions must be nonnegative safe integers.
- A `Map` backs selection registration; inherited object names do not resolve to
  selection constructors. Transaction metadata uses a null-prototype object.
- Plugin props bind own properties only. Inherited prop definitions are ignored.
- Configuration records field and append-hook lists once, so ordinary transactions
  do not allocate append bookkeeping when no append hooks exist.

These changes do not claim to make arbitrary plugins or document input safe.
Application validation still belongs at the application's input boundary.

## Verification

All **35 unchanged upstream tests** pass on Node 24 and Bun 1.4.4. Eight original
contract groups cover 3,000 deterministic editor operations, exhaustive selection
boundaries in a nested document, bookmark mapping, multirange edits, multi-plugin
appending/filtering, partial plugin state, JSON, reconfiguration and invalid input.

The controls compare state 1.4.4 with current model/transform 1.25.12/1.12.5 and
VentiMath's pinned 1.25.4/1.11.0. Real Tiptap callers run in Node, Bun and Chrome.
Packed npm/Bun installs, CJS/ESM identity and TypeScript 7 declarations are checked.
See the [conformance fixture](../../scripts/prosemirror-state-conformance/README.md)
and [measurements](bench/results/README.md) for reproduction and limits.

The timings compare the full VPM model/transform/state graph with the current
upstream graph. They do not isolate this state package from its dependencies or
measure end-to-end editor latency. The report retains noisy or inconclusive cases
rather than treating every lower median as an established improvement.
