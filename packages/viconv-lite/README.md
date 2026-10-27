# viconv-lite

Character encoding and decoding for Node.js 20+ and Bun. Based on `iconv-lite`
0.7.3, with all 414 supported encoding names and aliases, unchanged conversion
tables, corrected streaming boundaries, and **zero external runtime dependencies**.

```js
const iconv = require('viconv-lite');

const bytes = iconv.encode('Привет', 'windows-1251'); // native Buffer
iconv.decode(bytes, 'windows-1251');                 // 'Привет'
iconv.encodingExists('Shift_JIS');                  // true

const decoder = iconv.getDecoder('gb18030');
decoder.write(Buffer.from('9439da', 'hex'));         // ''
decoder.write(Buffer.from('33', 'hex'));             // '💩'
decoder.end();
```

Native ESM supports default and named imports, such as
`import iconv, { encode, decode } from 'viconv-lite'`.

## What changes

- **Multibyte chunk boundaries:** decoder output capacity includes buffered
  bytes, preserving supplementary characters in GB18030 and multi-character
  Big5 mappings when their last byte arrives separately. Encoder output capacity
  also accounts for pending surrogates and character sequences.
- **UTF-7 and IMAP UTF-7:** a shift terminator in a later chunk no longer turns
  preceding encoded content into a literal `+` or `&`.
- **CESU-8:** incomplete endings emit the replacement character without an
  extra literal `0`; flushing clears the pending state.
- **UTF-16BE:** a split surrogate pair is retained until complete. Encoding
  uses native byte swapping. UTF-32 encoding reads JavaScript code units directly,
  avoiding an intermediate UTF-16 byte buffer.
- **Automatic UTF-16/32 detection:** buffered initial bytes are copied before
  returning to the caller, so reusing that input buffer cannot change the result.
  Empty chunks do not accumulate in the detection queue.
- **Options and streams:** caller options are copied, including frozen objects.
  Automatic encoders and Transform constructors no longer modify them. `collect`
  completes once, reports premature closure, and removes its listeners.
- **Dependencies:** native `Buffer` APIs replace `safer-buffer`; resolved aliases
  are cached and custom alias cycles throw instead of looping indefinitely.

This retains the upstream conversion algorithms and mapping data where no
specific change is needed. It is a maintained derivative, with provenance and
targeted fixes, rather than a new set of character maps.

## API and compatibility

The familiar APIs remain: `encode`, `decode`, `encodingExists`, `getEncoder`,
`getDecoder`, `getCodec`, `encodeStream`, `decodeStream`, `toEncoding`, and
`fromEncoding`. Both low-level converters and native Transform streams are
available. Transform streams support `.collect(callback)`, `.pipe()`, events,
backpressure, and asynchronous iteration.

```js
source.pipe(iconv.decodeStream('windows-1251'));

const stream = iconv.encodeStream('utf16', Object.freeze({ highWaterMark: 1024 }));
stream.collect((error, bytes) => {
  if (error) return handleError(error);
  consume(bytes);
});
stream.end('Hello');
```

Intentional differences from 0.7.3:

- `encode` requires a string, `decode` requires a Buffer or Uint8Array, and
  encoding names require strings. Deprecated binary-string decoding and implicit
  object/number coercion are rejected. `encodingExists` returns false for invalid
  names. Punctuation/case normalization and the existing encoding aliases remain.
- Options must be objects; null/undefined mean defaults. Only own enumerable
  options are copied. `addBOM` must be boolean; `stripBOM` accepts a boolean or
  callback. `defaultEncoding` accepts explicit UTF-16LE/BE or UTF-32LE/BE names,
  with optional hyphens and case-insensitivity. Recursive defaults such as
  `utf32` are rejected. Unsupported option values throw `TypeError`.
- Encoder Transform streams always output bytes and decoder streams output
  strings. An `encoding` stream option cannot change encoder output into text.
- Corrected chunk boundaries change output where upstream dropped data or
  produced spurious characters. UTF-16BE may delay a high surrogate until the next
  chunk; the complete decoded result stays the same for valid input.

UTF-16/32 auto mode keeps upstream BOM detection and its heuristic when no BOM
is present. For deterministic decoding of arbitrary binary input, specify the
endianness. Existing replacement-character and malformed-input policies are
retained except for the corrections listed above. No stricter Unicode validation
or universal performance improvement is claimed.

The extension hooks `encodings`, `_codecDataCache`, `getCodec`, and replacement
character defaults remain mutable as upstream exposes them. Changing codec
definitions after first use requires clearing affected cache entries, including
resolved aliases. Use the default import/object for mutable hooks; native ESM
named imports of CommonJS properties are snapshots. `enableStreamingAPI` and the
stream constructors remain available; streams are enabled automatically on the
supported Node/Bun runtimes. Browser bundling is outside this package's target.

## Types

Declarations require TypeScript 7 and load without Node, Undici, or DOM ambient
types. Return values infer the native `Buffer` type when Node declarations are
already loaded; otherwise a structural byte-buffer type exposes common operations.
Stream declarations describe the conversion API structurally, without importing
the full Node stream class. The complete upstream encoding-name union is included,
while function arguments also permit normalized names and custom aliases.

## Verification and performance

```sh
node --test packages/viconv-lite/test/*.test.cjs
bun test packages/viconv-lite/test
node packages/viconv-lite/bench/compare.cjs
bun packages/viconv-lite/bench/compare.cjs
```

Differential tests cover all 414 supported encoding names/aliases, all 256 byte
values and 65,536 UTF-16 code units across 81 single-byte tables, and a corpus
containing every byte pair for seven multibyte encodings. They also cover 3,200
generated malformed/chunked inputs, split surrogates, BOM callbacks, stream errors,
early closure, frozen options, mutable input buffers, and installed CJS/ESM/types.
The shared integration gate runs HTTP checks, substituting this package into
`body-parser` and `raw-body`, including separately delivered GB18030, Big5, and
UTF-7 chunks.

Local Node 24.22.1 / Bun 1.4.0 microbenchmarks measured UTF-16BE encoding taking
**81% / 62% less time**, and UTF-32BE encoding **48% / 28% less time**. UTF-16BE
decoding took **12% longer on Node** after fixing surrogate buffering; most other
cases were close. See the [complete table and methodology](../../IMPROVEMENTS.md#viconv-lite).
These measurements do not establish application throughput gains.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Installation and origin

This package is currently available in the VPM workspace. Run `bun pm pack` in
`packages/viconv-lite`, then install `viconv-lite-0.1.0.tgz` using npm or Bun.
This does not imply npm publication or native VPM registry support. The archive
contains runtime code, types, mapping data, documentation, and licenses; test
fixtures and benchmarks are excluded.

Based on [iconv-lite 0.7.3](https://github.com/pillarjs/iconv-lite/tree/43694e28291d3b0cb3a452c77be40c4fd3a4bd85),
MIT licensed. Existing author notices, data provenance comments, and Microsoft
declaration attribution are retained. `PROVENANCE.json` records upstream and
current hashes for codec/data files. Test-only fixtures preserve unmodified
upstream sources, their hashes, and the npm release integrity.
