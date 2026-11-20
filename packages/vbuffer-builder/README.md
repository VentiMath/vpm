# vbuffer-builder

Sass Embedded builds each outgoing packet’s length header one byte at a time. This package provides that growable buffer on Node and Bun with zero runtime dependencies.

```js
import BufferBuilder from 'vbuffer-builder';
const header = new BufferBuilder(8).appendUInt8(0x80).appendUInt8(1);
const packet = Buffer.alloc(header.length + 128);
header.copy(packet);
```

The builder supports chainable integer, float, string, null-terminated string, byte-array and fill appends. `get()` returns an independent Buffer. `copy(target, targetStart, sourceStart, sourceEnd)` copies the written range and returns the number of bytes copied. Empty ranges copy zero bytes. An invalid numeric write leaves the written length and contents intact.

[Provenance](PROVENANCE.json) · [Sass checks](../../scripts/varint-conformance/README.md) · [Benchmarks](bench/results/README.md)
