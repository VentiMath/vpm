# vsection-iterator

Independent, dependency-free replacement for **section-iterator 2.0.0**, also the
version used by VentiMath’s navigation search through react-autosuggest 10.1.0.
It computes suggestion indices; it does not render a widget or handle DOM events.
Application adoption is separate.

```js
import createSectionIterator from 'vsection-iterator';
const flat = createSectionIterator({ data: 3 });
flat.next([null, null]); // [null, 0]
flat.prev([null, null]); // [null, 2]
flat.next([null, 2]);    // [null, null]: nothing highlighted

const grouped = createSectionIterator({ data: [0, 2, 0, 1], multiSection: true });
grouped.next([1, 1]); // [3, 0]: skip the empty section
```

CommonJS `require('vsection-iterator')` returns the same factory. TypeScript
exports the factory’s `Options`, `Position` and `Iterator` namespace types.

## Contract

- `data` is an item count in flat mode, or an array of section counts when
  `multiSection` is `true`. Counts are nonnegative safe integers.
- A position is `[sectionIndex, itemIndex]`. Flat positions use a null section.
  `[null, null]` is the unhighlighted state in either mode.
- `next` and `prev` return new position arrays. They skip empty sections. Moving
  past either end returns the unhighlighted state; navigating again enters the
  other end. The sentinel is part of the cycle, not an immediate last-to-first jump.
- `isLast` identifies the final item. For an empty list it is true at the sentinel.
- Positions must be the sentinel or an existing item. Invalid shapes throw
  `TypeError`, and invalid indices/counts throw `RangeError`.

## Changes and verification

The runtime is independently written; no upstream implementation is shipped.
Grouped counts are private snapshots, unlike upstream’s retained array. To change
counts, create another iterator; the actual autosuggest caller already does this
when its items change. Frozen input arrays work and returned positions share no
mutable internal state. Counts can be large without allocating one entry per item.
A sorted index of occupied sections crosses gaps with binary search instead of
scanning empty sections on every key press. Flat lists need no section index.

All 21 unchanged upstream tests and 435,099 valid-position differential calls pass
on Node 24 and Bun. Original tests cover invalid inputs, snapshot mutation,
empty/sectioned cycles and safe-integer bounds. The unchanged autosuggest component
passes 301 keyboard callbacks, including list replacement. Native Chrome checks
exercise 260 trusted arrow-key events through its mounted input with flat and
grouped fixtures. These are isolated synthetic caller checks, not an authenticated
VentiMath session or proof of application adoption.

[Conformance](../../scripts/section-iterator-conformance/README.md) includes exact
npm/Bun archive installs, CJS/ESM identity and TypeScript 7 consumers.
[Measurements](bench/results/README.md) retain all isolated process samples and controls.


The [Autosuggest release installation recipe](../../docs/INSTALLATION.md#navigation-autosuggest)
provides this package in the `autosuggest-10.1.0` set with pinned internal URLs.
Release availability and application adoption are separate milestones.
