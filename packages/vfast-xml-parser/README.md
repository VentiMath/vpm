# vfast-xml-parser

XML parsing and syntax validation based on **fast-xml-parser 5.11.2**, checked
October 30, 2026. `XMLBuilder` uses [vfast-xml-builder](../vfast-xml-builder).
All six direct runtime dependencies are VPM packages. Node 24 and Bun are tested;
ESM and CommonJS expose the same three implementations.

```js
const { XMLParser, XMLBuilder, XMLValidator } = require('vfast-xml-parser');
const parser = new XMLParser({ ignoreAttributes: false });
parser.parse('<file id="7">notes &amp; examples</file>', true);
// { file: { '#text': 'notes & examples', '@_id': '7' } }
```

## Changes from the baseline

- Reuses parser configuration, the entity decoder and compiled stop expressions
  between documents. Each document starts with fresh paths, counters, DTD entities
  and XML-version state; failed parses also release their document state.
- Copies options and freezes configuration records/arrays. Attribute regular
  expressions run from the beginning on every check without changing the caller's
  `lastIndex`. Default configuration is shared; supplied configuration is captured
  at construction. Callbacks and custom decoders remain caller-owned objects.
- Applies `maxNestedTags` to every parsed element, including self-closing and stop
  nodes. The root has depth 1; the default is 100. Zero means unlimited. Negative,
  fractional, nonnumeric and infinite depth values reject. Raw stop-node contents
  are not traversed and therefore do not contribute to the parsed depth.
- Requires positive safe integer entity limits or `Infinity`, instead of silently
  coercing or accepting invalid limits. Existing default entity budgets remain.
- Transforms a self-closing tag name once, after removing the slash. Names returned
  by `updateTag`/`onDangerousProperty` and callback-added attributes receive reserved
  property checks. Grouped attributes remain available to path predicates during
  ordinary-object conversion.
- Reads the XML version from the declaration independently of output grouping,
  filtering and processors. Other processing instructions cannot change it.
  XML names support supplementary Unicode characters; DTD names use XML Name.
- Rejects extra self-closing roots, duplicate `__proto__` attributes, unterminated
  declarations, malformed comments, stray equals signs and invalid attribute
  references during validation. Numeric references require digits and valid Unicode
  scalar values. Name references can contain valid Unicode, dots and hyphens.
- Scans text and validator tokens in contiguous slices. Malformed whitespace before
  a stray equals sign no longer causes repeated scanning.

## API and intentional differences

`XMLParser`, `XMLValidator.validate` and `XMLBuilder` retain the stable v5 library
entry points. Parser options include ordinary/ordered output, attributes and groups,
value/name processors, path expressions, CDATA/comments, unpaired tags, stop nodes,
entity controls and metadata. The [declarations](index.d.ts) describe these APIs;
helper types do not imply additional runtime exports. CLI commands and experimental
v6 sources are excluded.

Input must be a string or UTF-8 `Uint8Array` (including Buffer). Arbitrary objects
are not coerced with `toString`. `addEntity` validates string names and values at
registration, and invalid names can fail earlier than upstream. Reentering the same
parser or registering entities from its active callbacks rejects; use another
parser for a nested parse. Changing options requires constructing another parser.
The `options` view is shallowly read-only; embedded regular expressions and supplied
custom callback/decoder objects are not deeply immutable.

Validation is **optional**, as upstream: `parse(xml)` still accepts fragments and
some malformed nesting. Use `parse(xml, true)` or `XMLValidator.validate` for the
syntax checks. This is not a complete XML/DTD/schema or namespace-conformance
validator: declaration grammar, all XML-version-specific character restrictions
and DTD validity are outside its checks. Entity decoding has its own character
policy. External resources are never fetched; recursive/parameter DTD entities
remain unsupported. `maxExpansionDepth` is retained as a compatibility option,
not a promise of recursive entity expansion. The parser has no overall input-size
limit. Metadata offsets follow upstream's CRLF normalization.

Seven retained tests deliberately differ because the validator rejects previously
accepted malformed references or gives more specific errors. Default parsing of
those inputs remains separately covered. The builder's own fixes and differences
are documented in its README.

## Evidence

[Conformance fixtures](../../scripts/xml-parser-conformance) pin source, MIT
licensing, integrity and hashes. They execute 331 upstream cases: 321 unchanged
passes, one timing case that checks outputs and permits zero elapsed milliseconds,
seven specified validation differences, and two originally disabled
failures recorded explicitly. One upstream test requiring a 102 MB asset is omitted;
a separate generated document of over 1 MB is parsed and validated.

The focused suite has 50 tests, including 35 paired upstream discriminators,
1,000 seeded builder/parser round trips, entity budgets, parser reuse after errors,
byte views, metadata and callback safety. Actual **Storage 8.4.0** multipart calls
verify string/Buffer/sliced Buffer responses, three uploads, 12 mocked requests,
checksums and escaped completion bodies. Storage itself accepts string/Buffer
responses; plain Uint8Array input is tested at the parser API. Packed npm/Bun
installs and isolated declaration consumers are checked. A minified browser-target
bundle executes in an isolated VM with native text codecs and no Node globals;
this does not constitute a full real-browser compatibility suite.

[Benchmarks and raw results](bench/results/README.md) cover fresh Storage-shaped
parses, repeated parsing, attributes, ordered output, entities and validation.
Fresh Storage-shaped parses take about 32% less time on Node and 27–28% less
on Bun in these samples; all 13 aggregate cases favor VPM, with control noise
and variable cases retained in the report. They measure parser operations, not upload throughput or deployed application
performance. [Provenance](PROVENANCE.json) records the adapted implementation.
