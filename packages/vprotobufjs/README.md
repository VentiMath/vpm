# vprotobufjs

Independent Protocol Buffers runtime for generated Google messages, proto-loader,
GAX and Firestore. Version **8.8.1** matches the upstream API comparison target;
it does not promise every upstream tooling API. Supports Node 24+, Bun and browser
bundling, with one runtime dependency, `vlong`.

The application-used runtime is rewritten. It is built and locally validated,
but has not been released or adopted by VentiMath. Retained compatibility code
and schema data are identified in [provenance](PROVENANCE.json).

```js
import { parse } from 'vprotobufjs';
const Item = parse('syntax="proto3"; message Item { int64 id = 1; }')
  .root.lookupType('Item');
const bytes = Item.encode(Item.fromObject({ id: '9007199254740993' })).finish();
Item.toObject(Item.decode(bytes), { longs: String });
// { id: '9007199254740993' }
```

CommonJS uses `require('vprotobufjs')`. The full entry includes the schema parser;
`vprotobufjs/light` supplies reflection and JSON schemas, and
`vprotobufjs/minimal` supplies readers, writers and generated-code helpers.
Constructors are shared across entries. `vprotobufjs/ext/descriptor` provides the
independent descriptor conversion used by proto-loader.

## Implementation and correctness

The public entries use `runtime/`: independent wire primitives, reflection,
message conversion, schema parsing/loading and application descriptor conversion.
Protocol encoding follows the [Protocol Buffers wire specification](https://protobuf.dev/programming-guides/encoding/).
Message constructors and scalar, repeated, map and nested-message codecs
specialize validated templates once. Only whitelisted wire methods, checked field
IDs and JSON-quoted names enter generated functions. Closed enums and groups
retain the checked interpreter. Environments blocking dynamic functions use the
interpreter and ordinary constructors for every message.

Compared with the 8.8.1 baseline:

- Temporary message and packed-reader bounds are restored even when decoding or
  appending values throws. Explicit lengths must be nonnegative safe integers.
- Varint skipping is bounded to ten bytes; tags and lengths have their own width
  limits. Valid unknown groups, including those in empty messages, are skipped.
- The shared integer zero cannot be mutated. `vlong` preserves exact 64-bit values.
- Prototype-named message/map fields remain own data, without changing prototypes.
- Short service names resolve within packages as required by GAX fallback calls;
  descriptor type names retain their lexical qualification.

Presence, negative zero, UTF-8 verification for proto3 strings, closed enum
filtering, retained unknown fields and singular-message merging are preserved.
Those are compatibility requirements, not claimed discoveries or unique VPM
features. A failed decode may advance the cursor or append partial values;
restoring bounds does not rewind input. Pre-generated SDK decoders keep their own
logic while using VPM readers and writers.

## Scope and retained material

The verified scope includes generated messages, reflected proto2/proto3 messages,
tested edition presence/packing features, imports, maps, oneofs, services and the
descriptors used by the actual Google callers. Public declarations describe this
implemented scope. Advanced edition/descriptor tooling, the separate CLI/compiler,
decorator APIs and source/comment metadata are not claimed.

`src/`, its compatibility declarations and `ext/descriptor-compat.js` retain the
previous upstream-derived implementation. Optional ProtoJSON, text-format and
debug extensions also retain upstream provenance. They are not evidence of a
completed independent rewrite and are outside the application-runtime completion
claim. Tests assert that the public full/light/minimal and descriptor entries do
not load `src/`. Google/descriptor schemas and `runtime/common.json` are retained
protocol data, with upstream attribution and licenses preserved.

## Validation and performance

On Node 24 and Bun, 343 paired scalar, seeded and full Firestore-schema messages
match upstream. Fifteen unchanged upstream binary/RPC test files run against the
new public runtime; 185 loader comparisons cover exact descriptors, wire bytes
and conversions. The actual Firestore SDK produces the same 23 workflow results
and 25 decoded RPCs against a local stock server, including transactions, bulk
writes and Watch. These are synthetic local fixtures, not cloud deployment tests.

The separate retained-source suite passes 79 files / 2,877 assertions. That count
applies to compatibility source, not the new public runtime. Browser bundles,
package archives, TypeScript 7 consumers and focused malformed-input tests are
checked separately. See the [fixture contract](../../scripts/protobuf-conformance/README.md).

[Current measurements](bench/application-results/README.md) use separate processes,
balanced AB/BA order and identical-source controls. Results are workload-specific;
small differences that overlap control spread remain inconclusive, and no
universal speed improvement is claimed.
The performance follow-up removes repeated schema interpretation, generic
constructor overhead, redundant short-string Buffer conversions and temporary
writer allocations. Short Unicode encoding preserves lone-surrogate replacement
and prefixes when buffers grow. Longer Unicode strings keep the native path;
Node and Bun use different short-string cutoffs based on measured conversion
costs. Historical measurements of either the earlier independent implementation
or the derived runtime do not describe this revision.
