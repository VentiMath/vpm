# vhighlight-words

Independent, dependency-free replacement for **highlight-words 2.0.0**, the current
release and VentiMath’s version beneath Material React Table 3.2.1. It splits text
into highlighted and ordinary chunks; it does not render HTML or change table filters.

```js
import highlightWords from 'vhighlight-words';
highlightWords({ text: 'Algebra study guide', query: 'study' });
// [{ key: '0:8:0', text: 'Algebra ', match: false },
//  { key: '8:13:1', text: 'study', match: true },
//  { key: '13:19:0', text: ' guide', match: false }]
```

CommonJS uses `require('vhighlight-words').default`. `HighlightWords.Options` and
`HighlightWords.Chunk` types are exported for TypeScript consumers.

## Contract and improvements

- String queries match case-insensitively, with regex punctuation escaped. Leading
  and trailing whitespace is trimmed. Space-separated words match individually,
  in query order; `matchExactly: true` matches the complete trimmed phrase instead.
- A `RegExp`, or a slash-delimited pattern with flags, uses native JavaScript regex
  semantics and scans all matches. Caller regex state is never mutated. Explicit
  regex queries retain native backtracking costs; ordinary queries are escaped.
- `clipBy` keeps contextual space-delimited tokens around matches. Null, undefined
  and zero disable clipping. Positive safe integers retain upstream clipping,
  including leading/trailing spaces. Negative, fractional and nonfinite limits
  are rejected instead of silently coercing them.
- Each chunk has `{ key, text, match }`. Keys are deterministic UTF-16 source ranges
  plus match state, unique within one returned list. Unlike upstream’s random keys,
  unchanged table cells keep their existing React chunk nodes. Keys are not global
  identifiers; separate lists need their own React parent or key prefix.
- Adjacent matches all remain highlighted. In default multiword mode (table fuzzy filters),
  upstream’s stateful regex test marks alternating adjacent matches false. VPM uses actual matched ranges directly.
- Regex captures do not duplicate or remove text. Capturing groups are optional;
  nested and optional groups work. Upstream can lose uncaptured matches or throw
  on missing captures. Zero-width matches are ignored and advance safely over
  Unicode, preserving text and terminating.
- Only the last compiled string query is cached. Source text and mutable output
  chunks are never retained. No upstream runtime is copied or shipped.

An empty query returns one unmatched chunk (even for empty text). Empty text with
an active query returns an empty list. These cases match upstream. The package
accepts string text only; it does not interpret text as HTML.

## Evidence and scope

18 unchanged public upstream tests pass with only their mocked key field normalized.
Node 24 and Bun also pass 6,000 differential cases, 3,000 independent reconstruction
and match-mask cases, and six original regression groups. The unchanged Material
React Table cell passes 64 server-rendered comparisons and ten Chrome snapshots
covering markup, accessibility attributes and computed colors. Chrome separately
confirms preserved chunk identity and corrected adjacent highlights, with failing
upstream controls. These are synthetic caller fixtures, not an authenticated app
session, screen-reader acceptance or proof of VentiMath adoption.

[Conformance](../../scripts/highlight-words-conformance/README.md) checks exact packed
npm/Bun installs, frozen locks, CJS/ESM and TypeScript 7 NodeNext/Bundler consumers.
[Isolated measurements](bench/results/README.md) retain all raw samples and identical-source controls.

Included in the [Material React Table release](../../docs/INSTALLATION.md#material-react-table),
with its dependency URL pinned by the widget. Application adoption remains
separate from publication.
