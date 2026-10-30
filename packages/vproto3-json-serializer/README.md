# vproto3-json-serializer

Proto3 JSON conversion based on **proto3-json-serializer 4.1.0**, with exact byte
slices, consistent collection handling and validated timestamps, durations and
integer values. Supports Node 24+, Bun and browser bundling. The sole package
dependency is `vprotobufjs`.

```js
import { parse } from 'vprotobufjs';
import { fromProto3JSON, toProto3JSON } from 'vproto3-json-serializer';

const Item = parse('syntax="proto3"; message Item { int64 id = 1; }')
  .root.lookupType('Item');
const message = fromProto3JSON(Item, { id: '9007199254740993' });
toProto3JSON(message); // { id: '9007199254740993' }
```

CommonJS exports the same two functions. `toProto3JSON` requires a reflected
message with `$type`; static generated objects need conversion through a reflected
type first. `{ numericEnums: true }` retains Google's numeric-enum option.
`fromProto3JSON` returns a message from the supplied type, or `null` for an ordinary
message given null input. Declarations need no ambient Node, Undici or DOM types.

## Corrections

- Typed-array slices encode only their selected bytes. Bytes, special floats and
  64-bit values use the same rules in singular, repeated and map fields.
- Negative durations preserve both seconds and nanos. Duration input requires
  valid syntax, at most nine fractional digits and the protobuf range.
- Offset timestamps retain nanoseconds, including short fractional parts. Invalid
  dates, missing/invalid zones, excessive precision and out-of-range instants fail.
  Output retains the existing `.000Z` representation for integral seconds.
- FieldMask paths convert between snake_case and lowerCamelCase. Empty masks work;
  paths that cannot round-trip through the mapping are rejected.
- Any values containing wrapper messages use the required `@type`/`value` envelope.
  Nested conversion retains numeric-enum options and avoids a bytes/base64 round trip.
- Available JSON field names, protobuf names and reflected names are accepted. Output uses
  the declared JSON name. Duplicate aliases and conflicting oneof values fail.
- Every scalar input path validates its type, including repeated/map entries and
  signed/fixed integer variants. Integers must be integral and in range; exact
  decimal exponent strings are supported. Base64 is validated and accepts standard
  and URL-safe alphabets, with or without padding. A 4 MiB regression case guards
  against regex-stack exhaustion; malformed trailing text is rejected.
- Own `__proto__` output keys are defined as data properties. Inherited properties
  are not traversed. Recursion is bounded to 100 conversion levels.

The implementation caches resolved field-name indexes per type and rebuilds them
when the type's field array changes. Scalar conversion uses direct loops and
shared helpers instead of building `Object.entries` pairs at every level.

## Compatibility and intentional differences

The two public functions, `numericEnums`, wrapper/null behavior, unknown-field
ignoring and unknown-enum forwarding retain the 4.1.0 interface. Invalid values
that previously became truncated integers, corrupt bytes or normalized dates now
throw. Null scalar fields are left unset; null repeated/map fields become empty.
Null collection elements are accepted only for Value/NullValue fields.

Non-finite numbers in `google.protobuf.Value` throw. Upstream turns them into
strings, changing the data's type; ordinary float/double fields still use the
ProtoJSON strings `NaN`, `Infinity` and `-Infinity`. Explicit input strings remain
strings inside Value. These choices follow the [ProtoJSON mapping](https://protobuf.dev/programming-guides/json/).

The serializer accepts the tested protobuf **7.6.6** and **8.8.1** reflected types
without an `instanceof` dependency on one constructor. Version 8's presence and
object-conversion rules still apply when that runtime supplies the type. In
particular, it drops an implicit default NullValue enum before serialization;
two older upstream expectations differ for both serializers for this reason.
Arbitrary schema mutation after resolution is not a supported cache-invalidation
API; add/remove fields through the protobuf reflection APIs.

Exact 64-bit inputs should be decimal strings: precision lost before a JavaScript
Number reaches the converter cannot be recovered. Duplicate textual JSON keys
cannot be detected after `JSON.parse`; duplicate field aliases are detected.
This is an adapter for reflected protobuf messages, not a general JSON validator.

## Evidence

On Node 24 and Bun:

- All **316 unchanged upstream cases** run. With protobuf 7, **310 pass** and six
  expectations for non-finite Value output are explicitly verified as intentional
  rejections. With protobuf 8, **308 pass**, with the same six differences plus the
  two inherited NullValue-presence differences. Original controls establish both.
- Fifteen focused tests cover corrected behavior, integer limits, aliases, nulls,
  recursion, schema additions and CommonJS/ESM identity. **Thirteen paired probes**
  demonstrate upstream failures using identical protobuf 7 types.
- **Twelve caller checks, including controls**, run google-gax **6.14.0** code with
  Firestore **9.4.0** schemas: requests, responses, structured error details and
  resumable-start serialization. They pass with both protobuf generations.
- Browser bundles, packed npm/Bun installations and public declarations are checked.

Caller tests use synthetic data and replace the outbound upload transport. They
verify serialization boundaries, not live cloud requests or full SDK behavior.

See [fixture details](../../scripts/protojson-conformance/README.md) and
[benchmarks](bench/results/README.md), including controls and remaining costs.

## Provenance

The interface and behavior are derived from Google's
[4.1.0 release](https://github.com/googleapis/google-cloud-node/tree/703154ba1720ff2d1a5832ad0683a3c3bcbbadd1/core/packages/proto3-json-serializer-nodejs).
The Apache 2.0 [license](LICENSE) is retained. [PROVENANCE.json](PROVENANCE.json)
records the release commit, npm integrity and VPM changes.
