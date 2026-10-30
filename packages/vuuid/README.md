# vuuid

UUID v1, v3, v4 and v5 generation, parsing, validation and formatting, compared
with `uuid` 9.0.1. Zero runtime dependencies, native cryptography, Node.js 24+
and Bun. CommonJS and native named ESM exports include self-contained types.

```js
const {v4, v5, parse, stringify} = require('vuuid');
const random = v4();
const stable = v5('example.test', v5.DNS);
stringify(parse(stable));
```

`NIL`, `validate()` and `version()` retain UUID 9's accepted versions (1–5 plus
NIL), rather than silently adopting the different UUID 10/11 API. All generators
accept an output `Uint8Array`/Buffer or growing ordinary array and an offset.
`v1` retains upstream clock sequencing and node/clock options. `v3` and `v5`
expose `DNS` and `URL` namespace constants. The CLI is renamed `vuuid`:
`vuuid v5 example.test DNS`, or `vuuid` for random v4.

## Changes and boundaries

- Default v4 uses native `crypto.randomUUID()`; custom RNGs remain supported.
- Custom random input is copied before version/variant bits are set, including
  frozen arrays and shared RNG buffers. Upstream mutates the supplied bytes.
- Byte arrays must contain integer bytes, offsets must be nonnegative integers,
  and fixed-size output buffers must have sufficient capacity before writing.
  Arbitrary array-like objects and wider typed arrays are deliberately rejected.
- Explicit v1 time, sub-millisecond count, clock sequence and node bytes are
  checked before updating generator state. The timestamp must fit UUID v1.
- Validation rejects trailing line terminators that an end-anchored regular
  expression can otherwise accept.
- v3/v5 hash the namespace and native UTF-8 name incrementally, avoiding the
  intermediate escaped string and concatenated byte array. Lone surrogates use
  UTF-8 replacement characters, whereas upstream throws `URIError`.

This is the server runtime package. Browser-specific hashing bundles are not
shipped. v3/v5 are deterministic identifiers, not password hashing algorithms;
v1 exposes a timestamp, as in upstream.

## Evidence

Nine focused tests and 45 upstream tests pass on Node and Bun. Four tests for
private/browser hash helpers are excluded; native hash behavior is exercised
through the v3/v5 public vectors. See the
[conformance runner](../../scripts/google-http-conformance/uuid.cjs).
The integration fixture makes a real multipart request through `teeny-request`
and its UUID 9 dependency.

[Benchmarks](bench/results) contain three fresh processes and an identical-upstream
control per runtime. With 4 KiB names, v3/v5 take **78%/90% less time on Node 24**
and **81%/93% less on Bun**. Short names and default native v4 are broadly similar
on Node; default v4's Bun paired median is 12% lower but varies between processes.
Validation/copying costs remain: custom-random v4 is 134 → 241 ns on Node and
65 → 106 ns on Bun; explicit v1 fields are 152 → 362 ns and 113 → 235 ns.
These are operation-level results, not application throughput claims.

Run `node packages/vuuid/bench/compare.cjs` (or `bun`) and
`node packages/vuuid/bench/summarize.cjs --verify-current`.
See [provenance](PROVENANCE.json) and [license](LICENSE).
