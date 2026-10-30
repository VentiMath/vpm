# vpath-expression-matcher

Track streaming XML/JSON paths and match compiled expressions or indexed sets.
The API baseline is **path-expression-matcher 1.6.2**, checked October 30, 2026.
Zero runtime dependencies; CommonJS and ESM, tested on Node 24 and Bun.

```js
const {Expression, ExpressionSet, Matcher} = require('vpath-expression-matcher');
const stops = new ExpressionSet().add(new Expression('..script')).seal();
const path = new Matcher();
path.push('script', {type: 'text/javascript'});
path.matchesAny(stops);                     // true, including at the root
path.readOnly().toString();                 // 'script'
path.pop();
```

ESM exports the same four constructors (`Expression`, `ExpressionSet`, `Matcher`,
`MatcherView`) and a default object containing them. TypeScript declarations
include nullable matches, typed expression data and the actual snapshot shape.

## Matching and state

Patterns support exact tags, `*` for one level, `..` for zero or more levels,
`ns::tag` or `*::tag` namespaces, `[attribute]`, `[attribute=value]`, and
`:first`, `:odd`, `:even`, `:nth(n)` selectors. Paths are rooted and must match
completely. Positions use a zero-based counter for siblings with the same tag
and namespace; `getPosition()` instead counts all siblings. Empty patterns
never match. A pattern containing only `..` matches an empty path too.

Attribute and position predicates apply only to the current node. Pushing a
child discards its parent's ordinary attribute record, matching upstream's
streaming memory policy; popping does not restore it. `push(tag, values,
namespace, {keep: ['id']})` explicitly retains selected own attributes for
`getAnyParentAttr` and `hasAnyParentAttr` until their node is popped. These
queries include the current node. An own property with value `undefined` is
present, including when kept. Inherited properties are ignored.

Separators default to `.` and can be multiple characters. Doubling the entire
separator denotes a deep wildcard. Separators inside attribute brackets are
literal. Attribute values use string equality and have no quoting/escaping
language. Empty separators and separators containing brackets or colons are
rejected. `toString('', false)` can explicitly concatenate unprefixed tags.

`Expression` fixes its pattern and compiled segments at construction; the
inspection segments are frozen copies. Its optional third constructor argument
and writable `.data` hold application metadata. `ExpressionSet` deduplicates by
pattern **and separator**. `findMatch()` returns an expression or `null`, using
upstream's priority: exact depth/tag, wildcard at that depth, deep pattern ending
in the current tag, then remaining deep patterns. Insertion order applies within
each bucket. `addAll()` validates before adding anything; `seal()` prevents later
additions, including attempts to reset an `_sealed` property.

`Matcher` provides push/pop, attribute updates, path/counter queries, matching,
string/array conversion, reset, snapshot and restore. `readOnly()` returns the
same cached, frozen `MatcherView` each time, with no exposed mutable matcher.
Its queries stay live; its `path` and `snapshot()` return inspection copies.
The matcher's public `path` and `siblingStacks` also return copies. Use mutation
methods rather than editing inspection arrays or the separator.

Snapshots copy structural arrays, counter maps and attribute records, and restore
validates and copies that structure before changing state. **Nested attribute
values remain shared references**, including values returned by attribute queries
and values retained with `keep`. The view protects matcher structure; it is not
a sandbox for arbitrary application objects. Counter state can grow with the
number of distinct sibling names, as in upstream.

## Corrections relative to 1.6.2

- Deep wildcards match zero levels, preserve the root anchor and retry repeated
  anchors correctly, without recursion or enumerating wildcard partitions.
- Attribute values containing path separators parse correctly; multi-character
  separators work and remain distinct in expression sets.
- Attributes require own properties; namespace/tag counter keys cannot collide.
- Compiled patterns, sealed sets, cached paths and read-only views cannot be
  corrupted through their formerly exposed mutable internal fields.
- Snapshot records are independent; failed restores and invalid/throwing kept
  attributes do not leave partially updated state.
- Malformed brackets and invalid or unsafe `nth` indices reject explicitly.
  `:last` throws because streaming state cannot know future siblings; upstream
  parsed it and silently ignored the constraint. This is an intentional change.

## Evidence and scope

The [fixture](../../scripts/path-matcher-conformance) runs all **131 retained
upstream cases**, with eight explicit assertion adaptations. The unchanged
upstream control records six inconsistencies in its stale read-only tests.
Fourteen package tests include **60,000** seeded comparisons with an independent
DP matcher, a 15,000-level path, mutation/validation regressions and CJS/ESM
identity. Thirteen paired discriminators demonstrate upstream/VPM differences.

Actual fast-xml-parser **5.11.2** and fast-xml-builder **1.3.1** source runs with
replaced matcher imports. Tests cover stop nodes, attributes, cached callback
views, parser reuse, ordinary/ordered builders, and Storage **8.4.0** multipart
uploads with string and Buffer responses. Storage makes six mocked HTTP requests
through its real upload implementation. This does not migrate the application or
claim full XML parser compatibility. Caller-specific namespace normalization and
XML validation remain responsibilities of the eventual parser/builder replacements.

[Benchmarks](bench/results/README.md) retain raw samples, source hashes, upstream
controls and all measured regressions. Microbenchmarks do not establish an
application speedup. MIT attribution is in [LICENSE](LICENSE), with pinned source
and package metadata in [PROVENANCE.json](PROVENANCE.json).
