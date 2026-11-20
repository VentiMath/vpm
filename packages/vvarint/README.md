# vvarint

Encode and decode unsigned base-128 integers up to `Number.MAX_SAFE_INTEGER`. VentiMath’s frontend builds use this wire format for Sass compilation IDs.

```js
import {encode, decode, encodingLength} from 'vvarint';
const packet = new Uint8Array(encodingLength(300));
encode(300, packet);     // writes [172, 2]
decode(packet);           // 300
decode.bytes;             // 2
```

Both operations accept an optional byte offset and expose the number of bytes processed. Encoding can allocate a plain array or write into a supplied array, Uint8Array or Buffer. Truncated input, unsafe values and invalid offsets throw. A fixed-size output buffer is checked before writing. A failed call resets its byte count to zero. Padded values that fit in eight bytes and the safe-integer range are accepted.

[Provenance](PROVENANCE.json) · [Sass caller checks](../../scripts/varint-conformance/README.md) · [Benchmarks](bench/results/README.md)
