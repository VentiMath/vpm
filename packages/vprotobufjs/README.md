# vprotobufjs

Protocol Buffers based on **protobuf.js 8.8.1**, with VPM 64-bit integers,
restored reader bounds after decoding errors, validated lengths and protected
shared zero values. Supports Node 24+, Bun and browser bundling.

```js
import { parse } from 'vprotobufjs';

const Item = parse('syntax="proto3"; message Item { int64 id = 1; }')
  .root.lookupType('Item');
const bytes = Item.encode(Item.fromObject({ id: '9007199254740993' })).finish();
Item.toObject(Item.decode(bytes), { longs: String });
// { id: '9007199254740993' }
```

CommonJS uses `require('vprotobufjs')`. The full entry includes the schema parser;
`vprotobufjs/light` supplies reflection without the parser, and
`vprotobufjs/minimal` supplies the generated-code runtime. All share constructors.
Descriptor, ProtoJSON and text-format extensions, Google schemas and declarations
are included. Modern bundlers can build each entry for the browser; prebuilt UMD
bundles and the separately published protobuf.js CLI are not included.

## Changes from 8.8.1

- `vlong` replaces `long`. Exact 64-bit arithmetic remains, with faster native
  string conversion, complete integer-text validation and protected constants.
- Packed varint reads and dynamically generated decoders restore their temporary
  reader bounds in `finally` blocks. A malformed nested field no longer leaves
  the reader's length shortened after the exception.
- Explicit decode and skip lengths must be nonnegative safe integers. Negative,
  fractional, NaN and coerced string lengths are rejected before consuming bytes.
- Skipped varints stop at ten bytes, matching the integer reader's maximum width.
  Noncanonical encodings within that width remain accepted.
- Empty message types correctly skip valid unknown groups. Upstream passed the
  full wire tag where the group field number was required.
- The shared `LongBits.zero` object and its static property are immutable, so
  modifying a zero conversion cannot corrupt later integer encoding.

A failed decode can still advance the cursor and append partial values; restoring
bounds does not rewind input. Dynamic decoder changes apply to reflection-based
messages and code generated with this implementation. Existing pre-generated SDK
code keeps its own decoder logic while using the replacement readers and writers.

## Compatibility and dependencies

The baseline is the current **8.8.1** API, including proto2, proto3 and editions.
It has one runtime dependency, `vlong`, replacing upstream's one `long` dependency.
Version 8 already consolidated the older `@protobufjs/*` helpers and removed the
runtime Node-types dependency; those reductions are upstream improvements.

Moving from protobuf 7 also adopts version 8 behavior, including decimal int64
map keys instead of eight-byte hash keys. The tested descriptor map round-trip
failure in 7.6.6 is fixed by upstream 8.8.1 and remains fixed here. This package
is not a promise that every application using version 7 can upgrade unchanged.

VPM's intentional differences are the input and mutation protections above and
[vlong's documented validation rules](../vlong/README.md). Boxed string inputs to
integer writers remain accepted. Ordinary Long and LongBits instances remain
mutable. Public declarations compile without ambient Node, Undici or DOM types.

## Evidence

On Node 24 and Bun:

- **79 unchanged upstream runtime test files, 2,877 assertions** pass, as do the
  original implementation controls. Separate CLI tests and old UMD-loader tests
  are outside the shipped package's scope.
- Ten focused tests and seven paired correction probes exercise bounds recovery,
  invalid input, unknown groups, exact integers, shared-value mutation, extensions
  and CommonJS/ESM identity.
- **22 caller checks, including stock controls**, exercise proto-loader **0.8.1**,
  google-gax **6.14.0** gRPC/fallback schema loading, Proto3 JSON conversion and
  Firestore **9.4.0** serialization. Exact bytes and integer values match the
  selected protobuf **7.6.6** controls. Version 8 descriptor round-tripping also
  succeeds where that control fails.
- Full, light and minimal browser bundles execute without Node globals. Packed
  npm/Bun installations and declaration consumers verify public entry points.

The caller tests load actual SDK sources locally. They do not perform cloud RPCs
or establish complete Google SDK or application migration coverage.

See the [comparison fixture](../../scripts/protobuf-conformance/README.md) and
[measurements](bench/results/README.md) for scope, controls and remaining costs.

## Provenance

Derived from [protobuf.js 8.8.1](https://github.com/protobufjs/protobuf.js/tree/798b4c942cca81a7ae0a2694f28ecd2985d386c9).
The BSD 3-Clause [license](LICENSE) and extension notices are retained.
[PROVENANCE.json](PROVENANCE.json) records the upstream commit and npm integrity.
