# vtanstack-match-sorter-utils

Independent fuzzy ranking for table filtering, targeting
**@tanstack/match-sorter-utils 9.2.6** with the app's **8.19.4** as a second
control. Zero runtime dependencies.

```js
import { rankItem, rankings, compareItems } from 'vtanstack-match-sorter-utils';

const result = rankItem('Renée González', 'renee', {
  threshold: rankings.MATCHES,
});
// result.passed === true
```

`rankItem(item, query, options?)` returns `rankedValue`, `rank`, `accessorIndex`,
`accessorThreshold` and `passed`. Exact case-sensitive matches rank 7, case-folded
matches 6, prefixes 5, word prefixes 4, substrings 3, acronyms 2, ordered subsequences
between 1 and 2, and misses 0. `compareItems` sorts the better rank first; ties return 0.
Accessor functions may return one value, an array, or null/undefined to skip;
object accessors can set `minRanking`, `maxRanking` and `threshold`. Accessor
indices count flattened values. Equal best scores retain the first match.
`keepDiacritics` disables accent normalization. No caller records are cached; only single-character Unicode folds from bounded
ranges are reused.

## Changes and boundaries

- Caller options are never mutated, so frozen and shared options work.
- Canonically composed/decomposed Latin accents normalize alike within the
  supported Latin blocks; stacked combining marks do not leave stray accents.
  Uppercase `Ł` remains uppercase. These can change ranks and result ordering
  relative to upstream for affected names. `keepDiacritics:true` preserves input.
- Unicode NFD normalization plus a small set of non-decomposing letter expansions
  replaces the embedded character table. Greek, Japanese and other unrelated
  scripts are preserved; this is not a general transliterator. German `ß` stays
  `ß`, matching the established API. Supported Cyrillic accent folds are retained.
- Types accept fractional ranks and nullable/readonly accessor results, matching
  runtime behavior. Rankings are readonly constants.

Both inspected TanStack versions embed their accent implementation despite
also declaring `remove-accents`. The replacement owns normalization, so no
`vremove-accents` package is needed for this path. Other application callers may
still require the original dependency.

[Conformance](../../scripts/match-sorter-conformance/README.md) includes current
and app controls plus Material React Table 3.2.1's unchanged `fuzzy` filter used
by VentiMath's DataTable. [Measurements](bench/results/README.md) use isolated
processes and identical-source controls. CJS/ESM and declarations are provided;
Node 24, Bun and TypeScript 7 are checked. Consumer publication, application
adoption and full table UI acceptance are separate.
