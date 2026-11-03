# varia-hidden

Independent implementation of the four public **aria-hidden 1.2.6** helpers,
with no runtime dependencies or tslib. Radix menus use this layer to keep content
outside an open modal out of the accessibility tree.

```js
import {hideOthers, inertOthers, suppressOthers, supportsInert} from 'varia-hidden';
const restore = hideOthers(dialog);
// When the dialog closes:
restore();
```

`hideOthers(targets, parent?, marker?)` accepts one Element or a readonly array,
keeps targets and their ancestor paths, and hides sibling subtrees. The parent
defaults to the first target's document body. Live regions and scripts stay
exposed. The default marker is `data-aria-hidden`.

`inertOthers` uses the native inert attribute, including for live regions, and
marks nodes with `data-inert-ed`. `suppressOthers` chooses inert when the target
document supports it, otherwise aria-hidden, with `data-suppressed` as its marker.
`supportsInert()` checks the current global realm. All isolation functions return
an undo callback. No function moves focus, traps focus or observes later DOM
insertions; callers still own modal focus and updates. Shadow targets retain the
containing host subtree, rather than isolating individual shadow descendants.

## Deliberate repairs

- ARIA and inert ownership are independent, so closing one kind of lock cannot
  strand or clear another kind. Overlapping calls keep attributes until their
  last owner releases them.
- Undo is idempotent and restores original values, including `aria-hidden="false"`
  and custom marker values. A different attribute value written externally during
  the lock is preserved; rewriting the identical value cannot be distinguished.
- Empty or wholly detached target lists are harmless. Invalid targets no longer
  make the whole document inaccessible. Invalid marker names throw before mutation.
- Prototype-named markers work. Ancestor traversal is iterative, and nested shadow
  roots and foreign-document inert support are handled without global counters.

[Comparison fixtures](../../scripts/aria-conformance/README.md) exercise original
and VPM behavior, actual Radix menu calls, clean npm/Bun archives, TS7 and Chrome
focus behavior. [Benchmarks](bench/results/README.md) measure synthetic DOM
isolation and cleanup, not screen-reader performance or browser responsiveness.
Built, not released or adopted. [Provenance](PROVENANCE.json).
