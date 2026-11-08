# vautosuggest-highlight

Independent `match` and `parse` helpers for autocomplete highlighting, targeting
**autosuggest-highlight 3.3.4** (also VentiMath’s installed version). Zero runtime
dependencies. This is the string helper used by navigation search, not an
autocomplete widget or a fuzzy-search engine. Application adoption is separate.

```js
import match from 'vautosuggest-highlight/match';
import parse from 'vautosuggest-highlight/parse';

const text = 'Déjà vu';
const parts = parse(text, match(text, 'deja'));
// [{ text: 'Déjà', highlight: true }, { text: ' vu', highlight: false }]
```

Both subpaths export a default function and support CommonJS `require`.
The root additionally exports named `match` and `parse`. Type declarations ship
with the package. Render parts as ordinary text nodes; the library emits no HTML.

## Behavior

`match(text, query, options?)` returns ordered UTF-16 `[start, end]` ranges.
Whitespace separates query terms, processed in their original order. Matching is
case insensitive, with accent folding and Latin ligature transliteration. By
default each term consumes its first match and ASCII word characters require a
word boundary. A consumed match creates a boundary for a subsequent term, matching
upstream behavior (`foobar` queried with `foo bar` produces adjacent ranges).
Non-ASCII words retain upstream’s unanchored matching behavior.

- `insideWords: true` removes the word-boundary restriction.
- `findAllOccurrences: true` consumes every occurrence of each query term.
- `requireMatchAll: true` returns no ranges if any query term has no match left.

`parse(text, matches)` returns `{ text, highlight }` parts. Adjacent ranges remain
separate highlighted parts. No matches returns the entire text, even an empty
string, as one unhighlighted part. Inputs are not mutated.

## Deliberate corrections and limits

- Source offsets count UTF-16 consistently. `match('😀 café', 'cafe')` returns
  `[3, 7]`, not upstream’s `[2, 7]`. Astral symbols are not split by returned ranges.
- Canonically decomposed Latin accents stay with their letter in the highlighted
  slice: `Cafe\u0301` queried with `cafe` highlights all five code units. Native
  Unicode decomposition also supports Latin accents missing from upstream’s table,
  such as `Ḃ`. The small non-decomposing Latin-letter table is independently
  specified; this is not general transliteration or grapheme segmentation.
  Greek accents remain distinct. Existing Cyrillic accent folds are preserved.
- Expanded ligatures retain the tested partial-prefix behavior: querying `ma sœur`
  with `so` highlights `s`, and `soe` highlights `sœ`. Partial source characters
  are omitted; overlapping source slices are never returned.
- `parse` rejects malformed, empty, unordered, overlapping or out-of-bounds ranges
  with `RangeError`, rather than silently duplicating or dropping text. The valid
  ranges produced by `match` are accepted. Text/query inputs must be strings.
- Modern Node 24, Bun and browser bundles are supported. There is no IE11 build,
  locale-specific collation, fuzzy matching or reusable search index.

## Verification

[Conformance](../../scripts/autosuggest-conformance/README.md) covers all 36
unchanged upstream tests on both implementations, 6,000 deterministic match/parse
comparisons, 3,000 Unicode reconstruction cases, the navigation-search pipeline,
packed npm/Bun consumers, browser bundling and TypeScript 7.
[Benchmarks](bench/results/README.md) record isolated process controls and limits.
