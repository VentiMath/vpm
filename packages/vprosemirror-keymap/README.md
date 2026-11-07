# vprosemirror-keymap

Independent shortcut bindings and keymap plugins targeting
**prosemirror-keymap 1.2.3**, the current and VentiMath-installed version. Runtime
dependencies are `vw3c-keyname` 2.2.8 and `vprosemirror-state` 1.4.4.

```js
import { keymap } from "vprosemirror-keymap";

const shortcuts = keymap({
  "Mod-b": toggleBold,
  Enter: insertParagraph,
});
// Include shortcuts in EditorState's plugins array.
```

`keydownHandler(bindings)` also returns a handler for an existing view or plugin.
Commands receive the current state, dispatch function and view. Returning `true`
handles a key; returning `false` permits the next binding fallback or plugin.

## Implementation and compatibility

Bindings compile into key/modifier lookup tables. Dispatch computes a modifier
mask rather than repeatedly constructing modified key-name strings. Aliases,
modifier order, literal dash/Space keys, duplicate-binding precedence, Apple
`Mod`, shifted literal characters, non-US modifier fallbacks and Windows AltGraph
behavior match the published 1.2.3 runtime. Bindings are snapshotted at construction.

Only **own enumerable** binding definitions are registered; upstream also includes
inherited definitions. Prototype-like names remain usable as explicit own keys.
No upstream runtime source is shipped. The helper does not replace the editor
view, prevent default itself or implement native keyboard layouts/IME.

All editor imports must resolve one coherent model/state/transform graph. State's
optional `prosemirror-view` peer supplies TypeScript view declarations; this
package does not import the view runtime. Browser consumers use DOM declarations.

## Verification

Six independent contract groups include 15,552 alias/modifier comparisons and
2,592 fallback-order/platform comparisons, real plugin/state dispatch, plugin
precedence, binding snapshots, own properties and invalid modifiers. Chrome
checks current, app and VPM dependency graphs through real Tiptap 2.11.7, with
trusted Enter, Backspace, Mod-b, Escape and non-US Alt-key events.

The upstream source tests are retained unchanged. **Five pass; one stale assertion
fails both upstream and VPM**: it expects a Shift-only key-code fallback that the
published 1.2.3 change removed. The gate explicitly checks that shared failure,
and independent tests assert the current behavior. The original suite assumes
non-Apple `Mod`, so its environment is fixed; the independent tests cover six
platforms. See the [fixture](../../scripts/prosemirror-keymap-conformance/README.md).

Packed npm/Bun consumers verify exact files, fresh/frozen installs, Node/Bun
contracts, CJS/ESM identity and TS7 NodeNext/Bundler declarations. [Benchmarks](bench/results/README.md)
use isolated processes, balanced order, identical-source controls and proper
CommonJS module scope. They compare complete dependency graphs, not keymap alone
or application typing latency. All samples and inconclusive cases are retained.

The recorded Node 24 run shows lower time beyond control spread in all eight
cases: eight-binding setup is 1,209 → 770 ns, plugin creation 1,321 → 1,035 ns,
and modifier dispatch 70 → 30 ns. Bun's five dispatch cases are 72–88% lower,
but eight-binding setup is 411 → 454 ns and plugin creation 500 → 627 ns.
Bun's 48-binding compilation has a slower median (3,308 → 4,251 ns), with a
large upstream outlier reversing one pair; its direction is unestablished by
the report's conservative rule. These are setup/dispatch microbenchmarks, not
measured editor latency. The setup cost is paid when building a handler/plugin.

This completes the source-package scope. Public release, VentiMath cutover, editor
view implementation and full native input acceptance remain separate.
