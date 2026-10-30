# vfast-xml-builder

XML serialization for plain objects and the ordered output of fast-xml-parser.
Based on **fast-xml-builder 1.3.1**, checked October 30, 2026, with fixes to
traversal, filtering, state isolation and serialization. Its two runtime
dependencies are VPM's `vpath-expression-matcher` and `vxml-naming`.
CommonJS, ESM and declarations are tested on Node 24 and Bun.

```js
const Builder = require('vfast-xml-builder');
const builder = new Builder({arrayNodeName: 'Part'});
builder.build([
  {PartNumber: 1, ETag: '"part&one"'},
  {PartNumber: 2, ETag: '"part-two"'},
]);
// <Part><PartNumber>1</PartNumber><ETag>&quot;part&amp;one&quot;</ETag></Part>...
```

ESM supports `import Builder from 'vfast-xml-builder'` and `import {Builder}`.
The constructor also works without `new`. `build(input)` takes an object or
array and returns a string. Each build has independent traversal state; a builder
can be reused after a failed build, but callbacks cannot reenter that same builder.

## Options and compatibility

The ordinary and ordered serializers retain upstream's formatting and processing
instruction conventions, CDATA/comment delimiter protections, negative-zero
handling, unpaired/empty tags, grouped attributes and custom value processors.
Options include:

| Options | Purpose / defaults |
| --- | --- |
| `attributeNamePrefix`, `attributesGroupName`, `textNodeName` | `@_`, `false`, `#text` |
| `ignoreAttributes` | `true`, or `false`, a string/regex filter array, or a callback returning true to omit an attribute |
| `cdataPropName`, `commentPropName` | `false`; set a property name to emit that node kind |
| `format`, `indentBy` | `false`, two spaces |
| `preserveOrder` | `false`; true accepts the parser's ordered arrays and `:@` attribute maps |
| `arrayNodeName`, `oneListGroup` | Optional root-array tag name; false for grouping repeated list content |
| `suppressEmptyNode`, `suppressUnpairedNode`, `suppressBooleanAttributes` | `false`, `true`, `true` |
| `unpairedTags`, `stopNodes` | Empty arrays; stop patterns accept VPM `Expression` instances or strings |
| `tagValueProcessor`, `attributeValueProcessor` | Identity functions; return the value to serialize |
| `processEntities`, `entities` | Enabled by default; optional ordered `{regex, val}` replacement rules |
| `maxNestedTags` | 100; nonnegative safe integer, with zero disabling the depth bound |
| `jPath` | true gives attribute-filter callbacks string paths; false gives read-only matcher views |
| `sanitizeName` | false; otherwise a callback invoked for invalid qualified names |

Configuration is copied and frozen at construction. Filter and custom replacement
regexes are cloned; changing the caller's arrays, records or regex state cannot
change another builder. Construct another builder to change its configuration.
Legacy truthiness for boolean flags is retained: the string `"false"`, like
`"true"`, enables a flag. A parser's `processEntities` policy object also enables
encoding; that object's parser-specific limits are not builder options.

Some upstream conventions are unusual and remain explicit. In ordinary-object
mode, `ignoreAttributes: true` disables prefix recognition: a key such as `@_id`
is treated as a tag, not silently removed. An explicit attribute group still
identifies attributes. Ordered mode omits `:@` attributes when ignoring them.
Group handling is an ordinary-object feature; use `:@` in ordered mode.
Pretty output retains different leading/trailing newline conventions between
the two modes. Upstream's disabled formatting test exposes this distinction.

## Fixes over 1.3.1

- Single-character root-array names work. Null array items retain their position,
  Date array values serialize, and grouped list items can have null prototypes.
- A text-only object invokes its processor once. Inherited text cannot replace
  an object's own child elements. Object-valued processor results are converted
  to strings before default escaping.
- Global/sticky attribute regexes give repeatable results without mutating the
  supplied regex. Selective filters work in ordered and grouped attributes,
  including structured children of raw stop nodes. Already-unprefixed ordered
  attribute names are retained.
- Attribute predicates compare original string values, rather than values with
  quotes already escaped. Callback path views cannot mutate traversal state.
- Configured sanitizers must return valid qualified names. Validation remains
  opt-in, and `?` processing instructions and raw nested names retain their
  upstream exemptions.
- Depth checks cover ordinary, ordered and structured raw traversal. Cycles reject
  explicitly even when the depth limit is disabled; shared acyclic subtrees work.
  Invalid numeric budgets reject at construction.

Ordinary serialization skips path tracking when no path-dependent option is in
use and skips name-validator construction when sanitization is disabled. Default
escaping uses an inline loop; custom replacement lists retain their ordered rules.

## Boundaries and evidence

This is a serializer, not a complete XML well-formedness validator. Default name
permissiveness, boolean attributes and unpaired tags can produce non-XML output.
`processEntities: false`, custom replacement rules and stop-node text intentionally
allow raw markup. Attribute quote delimiters remain escaped. The depth budget
counts structured traversal; it does not parse raw markup strings, bound total
output size or constrain application callbacks. Disabling the depth bound can
reach the JavaScript stack limit on sufficiently deep acyclic input.

[Retained tests](../../scripts/xml-builder-conformance) execute all 136 upstream
cases: 135 pass unchanged, and the originally disabled newline-mismatch case is
executed and recorded on both implementations. Seventeen paired discriminators
demonstrate specific fixes. Seventeen focused tests include cycle/reuse checks,
depth boundaries, 4,000 independent escaping comparisons and parser round trips.

Actual fast-xml-parser **5.11.2** source re-exports the replacement in nine caller
cases and two round trips. Storage **8.4.0** completes one-part and three-part
uploads through it, with eight mocked HTTP requests, MD5 checks and exact escaped
completion bodies. Browser bundle and isolated package-install checks cover the
published exports. These checks do not migrate application dependencies.

[Benchmarks](bench/results/README.md) retain raw samples, source hashes, controls
and regressions. [PROVENANCE.json](PROVENANCE.json) identifies the adapted sources;
the upstream MIT notice and modification attribution are retained in [LICENSE](LICENSE).
