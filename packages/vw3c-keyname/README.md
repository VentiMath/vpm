# vw3c-keyname

Independent keyboard-event normalization targeting **w3c-keyname 2.2.8**, the
current and VentiMath-installed version checked on 2026-11-06. It has no runtime,
optional or peer dependencies.

```js
import { keyName, base, shift } from "vw3c-keyname";

keyName(event); // e.g. "ArrowLeft", "a", "Dead"
keyName({ keyCode: 65 }); // "a"
keyName({ keyCode: 65, shiftKey: true }); // "A"
base[13]; // "Enter"
```

Modern `event.key` values retain the browser's keyboard-layout and composition
information. The fallback tables reproduce the historical US-layout key-code
mapping, including shifted punctuation and function keys. They cannot infer a
user's actual keyboard layout. Mac Command+Shift and legacy IE modifier behavior,
plus the six historical arrow/Escape/Delete aliases, match upstream.

## Implementation and differences

The implementation is written for VPM; no upstream runtime source is shipped.
It reads `event.key` once. The exported `base` and `shift` tables retain their
numeric entries and are mutable, but have no object prototype: inherited names
such as `constructor` cannot become key names through malformed key-code input.
Callers must use `Object.hasOwn(table, code)` rather than a table's inherited
`hasOwnProperty` method. Native keyboard events and structural event objects are
accepted; declarations use DOM types for the upstream-compatible `Event` input.

## Verification and scope

Six original contract groups compare **430,080** combinations across seven
platform environments against the pinned upstream package, including every code
0–255, all modifier combinations, international characters and composition keys.
Both exported tables match. Six-platform real `prosemirror-keymap` 1.2.3 plugin
checks verify 138 dispatch cases with actual editor state.

Chrome compares native `KeyboardEvent` objects and trusted Enter, Backspace and
Mod-b events through the real Tiptap 2.11.7 editor. Fresh/frozen npm and Bun installs,
CJS/ESM identity and TypeScript 7 NodeNext/Bundler consumers use packed files.
See the [conformance fixture](../../scripts/keyname-conformance/README.md).

[Benchmarks](bench/results/README.md) run implementations in separate processes,
with balanced order and identical-source controls. They include the real upstream
keymap caller with only its key-name dependency substituted. These are local
normalization/dispatch timings, not application or typing-latency guarantees.

Five of eight Node cases show lower time beyond the control spread. The Mac,
unmapped-key and full keymap-dispatch directions are inconclusive. All eight Bun
cases show lower time. Modern letter normalization measures 9 → 6 ns on Node and
35 → 4 ns on Bun; keymap dispatch is 49 → 47 ns (inconclusive) and 74 → 35 ns,
respectively. Getter measurements use synthetic getter-backed objects, while
actual Chrome events are checked for correctness rather than timed.

This completes the source package. The independently built shortcut caller is
[vprosemirror-keymap](../vprosemirror-keymap). Public release, VentiMath adoption
and physical keyboard-layout/IME acceptance remain separate.
