# vobject-hash

Deterministic object fingerprints based on **object-hash 3.0.0**, with faster
string hashing and corrected binary and collection serialization. Zero runtime
dependencies. Supports Node 24+ and Bun.

```js
import hash from 'vobject-hash';

hash({project: 'example', enabled: true});
hash('cache key', {algorithm: 'sha256'});
hash({a: 1}, {encoding: 'buffer'}); // Buffer
```

CommonJS uses `require('vobject-hash')`. Both module systems expose `sha1`, `MD5`,
`keys`, `keysMD5`, and `writeToStream`. Types are included and need no ambient
Node, Undici or DOM declarations.

## Improvements

- Plain strings take a direct path through Node crypto, preserving upstream's
  `string:<UTF-16 length>:` framing. Algorithm names are indexed once instead
  of searching the runtime's full list for every hash.
- Buffer serialization includes a byte length. Adjacent buffers can no longer
  move framing text across boundaries and produce identical input to the hash.
- Unordered binary entries retain their actual bytes instead of converting them
  to lossy UTF-8 text. Text-only collections retain upstream serialization.
- DataViews hash their visible bytes, respecting offsets and lengths.
- Sparse arrays record holes and their positions; map entries retain key/value
  roles even with `unorderedArrays: true`.
- File metadata includes the correctly spelled `lastModified`. Native Bun File
  objects are recognized even when the runtime brands them as Blob.
- BigInt64Array and BigUint64Array values are supported. Passthrough output with
  `encoding: 'buffer'` returns actual bytes.
- Options use own properties, are read once, and validate booleans and hooks.
  Unknown object tags cannot invoke methods inherited by the internal visitor.

## Compatibility and migration

Ordinary primitive/string, record, function, dense-array and text-collection
hashes preserve the 3.0.0 format. The actual google-gax 6.14.0 gRPC and fallback
protobuf-cache paths produce **identical cache keys**, because they hash
`JSON.stringify(...)` strings. Their insertion-order behavior remains unchanged.
When building a VPM gax caller, this string-only operation is a candidate for
inlining; changing its framing would require an explicit cache migration.

Corrected cases intentionally change digests:

| Input or option | Change |
| --- | --- |
| Buffers, including inside unordered collections | Length framing and byte-preserving serialization |
| DataView | Contents and visible window replace the constant token |
| Sparse arrays | Holes are explicit and distinct from `undefined` |
| Maps with unordered arrays enabled | Key/value pairs remain ordered |
| File | Timestamp is included; metadata field roles stay ordered |
| Passthrough + buffer encoding | Returns a Buffer instead of a string |
| Inherited or malformed options | Inherited fields are ignored; invalid booleans/hooks throw |

Invalidate affected persisted fingerprints or caches when migrating. This is
not an unrestricted drop-in promise for every historical digest. Bigint typed
arrays add support where upstream throws. The synchronous Node/Bun build does
not include upstream's browser crypto bundle.

## API behavior

The default algorithm is SHA-1 and encoding is hex for format compatibility;
`algorithm` accepts names from the runtime's `crypto.getHashes()`, case
insensitively. Digest encodings are `hex`, `binary`, `base64`, or `buffer`.
`algorithm: 'passthrough'` returns serialization text, or exact bytes with
`encoding: 'buffer'`; it does not interpret `hex` as an instruction to encode
that serialization. Use byte output for binary data.

Options retain upstream defaults: object keys and sets/maps are unordered,
arrays are ordered, function names/properties and object type information are
included. `excludeValues`, `excludeKeys`, `replacer`, `ignoreUnknown` and the
`respect*`/`unordered*` flags are supported. Options are not mutated. The streaming
API synchronously calls a sink's `update` or `write` and does not end it or await
backpressure; it is suitable for a crypto Hash or a sink that accepts all writes.

These are cache fingerprints, not password hashing or authentication. Getters,
function stringification, replacers and key filters execute caller code.
Symbol-keyed fields remain excluded; symbols use their string descriptions.
Files hash metadata, **not file contents**. Blobs/WeakMaps/WeakSets remain
unsupported unless `ignoreUnknown` deliberately reduces them to type markers.
Opaque runtime handles use upstream-style markers, including Bun timers. Very
deep graphs can exceed the JavaScript stack; general cyclic unordered-graph
canonicalization retains upstream limitations.

## Evidence

On Node 24 and Bun:

- All 68 retained upstream cases pass, with fixture repairs and the corrected
  DataView expectation documented in the [comparison fixture](../../scripts/object-hash-conformance/README.md).
- Eighteen focused tests cover nine upstream-failing regression probes,
  generated differential inputs across twelve option configurations, exact
  crypto framing, cycles, binary streaming, native files and module identity.
- Actual google-gax 6.14.0 methods execute twelve instrumented hash calls per
  run, checking hits/misses, forced reload, clear, exact cache keys, unchanged
  inputs and real protobuf encode/decode round trips.
- Packed npm/Bun installations and CJS/ESM type consumers are checked.

[Benchmark results](bench/results/README.md) include ordinary values and actual
cache callers, three fresh processes and identical-upstream controls per runtime.
These are local CPU measurements, not application or network speedups.

## Provenance

Derived from [object-hash 3.0.0](https://github.com/puleos/object-hash/tree/1045a05d42c2077f7b380617d0f3d32c851234dd).
The MIT [license](LICENSE) and contributor attribution are retained.
[PROVENANCE.json](PROVENANCE.json) records the exact commit and npm integrity;
the development fixture retains hash-pinned source and tests.
