# vis-unsafe

Repeatable string checks against contextual pattern lists. The compatibility
baseline is **is-unsafe 2.0.2**, checked October 30, 2026. Zero runtime dependencies;
CommonJS and ESM, tested on Node 24 and Bun.

```js
const { isUnsafe, whyUnsafe, HTML, XML } = require('vis-unsafe');
isUnsafe('hello', [HTML, XML]);              // false
isUnsafe('<script>alert(1)</script>', HTML); // true
whyUnsafe('<script>', HTML).id;             // 'html-script-open'
```

ESM supports a default predicate and named exports:
`import isUnsafe, { HTML, XML } from 'vis-unsafe'`.

## API

- `isUnsafe(value, context)` returns a boolean.
- `whyUnsafe(value, context)` returns the first match or `null`.
- `allUnsafe(value, context)` returns every match in context/rule order, preserving duplicates.

A context is a nonempty pattern list, an array of nonempty pattern lists, or a
custom RegExp. Rules have `{id, description, pattern}`; lists may have a string
`label`. Match results contain `{context, id, description, pattern}`. Unlabeled
custom lists use `CUSTOM`. Values must be strings.

All nine upstream contexts are retained: `HTML`, `XML`, `SVG`, `SQL`,
`SQL_STRICT`, `SHELL`, `REDOS`, `NOSQL`, and `LOG`. `VALID_CONTEXTS` maps labels
to these lists, with the key `'SQL-STRICT'`. The same rules, flags, metadata and
ordering are retained. The current XML parser uses `HTML` and `XML`.

These are **heuristic checks**, with false positives and false negatives. A
negative result does not establish safe HTML, SQL, shell input or XML. Escaping,
parameterized queries and parser resource limits remain the caller's job.
The `REDOS` context is not a proof that a regex runs in bounded time. No general
complexity bound is claimed for the retained rules or caller-supplied patterns.

## Corrections and tradeoffs

| Behavior | Upstream | VPM |
| --- | --- | --- |
| Global/sticky custom regex | Advances `lastIndex`, so repeated checks can disagree | Matches from zero using a copy, leaving caller state unchanged, including frozen patterns |
| Built-in lists/rules | Shared mutable objects | Frozen lists and rules backed by private patterns |
| Exposed built-in patterns | Mutating or recompiling one changes later matching | Pattern access and match results provide isolated copies |
| Malformed custom rules | May be ignored after an early match | Entire context structure is checked before matching |
| Boolean HTML/XML checks | Tests each individual rule and allocates metadata on a match | Compiles alternatives by identical flags; avoids match-result allocation |

Custom lists remain live: changes between calls take effect. Custom match
results retain the supplied RegExp identity. Built-in pattern identity is not
stable; modifying a returned pattern cannot modify built-in matching. Pattern
copies add work to diagnostic APIs. Copy a built-in list to make your own rules.

The CommonJS implementation and ESM facade load all nine contexts. This package
does not preserve upstream's potential ESM per-context tree shaking. That is a
known packaging difference; the current server-side XML caller is the verified
integration target. Browser bundle size has not been measured.

## Evidence and scope

All **294 retained upstream tests** pass unchanged on Node 24 and Bun. Additional
checks reproduce upstream's stateful-regex and mutable-rule failures, verify
frozen patterns and malformed contexts, and compare optimized HTML/XML scanning
against individual upstream rules on 20,000 seeded cases.

The [shared conformance fixture](../../scripts/xml-helpers-conformance) exercises
actual fast-xml-parser **5.11.2** entity handling and the combined XML stack through
Storage **8.4.0** multipart uploads. Ordinary Storage responses in this fixture do
not contain input entities and therefore do not call the predicate. Dedicated
DTD cases verify that entity checks execute and preserve blocked/allowed results.

[Paired benchmarks](bench/results/README.md) retain raw samples, controls and
regressions. They measure utility calls, not production application throughput.

MIT; [LICENSE](LICENSE) retains upstream attribution and
[PROVENANCE.json](PROVENANCE.json) records the source baseline.
