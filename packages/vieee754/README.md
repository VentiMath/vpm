# vieee754

An independent implementation of the floating-point reader and writer used by browser Buffer 4.9.2. It reads and writes single and double precision in either byte order, including at unaligned offsets inside a byte-array view. The wire representation preserves signed zero, subnormals, infinities, upstream’s NaN payload and its float32 midpoint rounding.

Use `read(bytes, offset, littleEndian, mantissaBits, byteCount)` or `write(bytes, value, offset, littleEndian, mantissaBits, byteCount)`. Plain byte arrays and Uint8Array views are supported. Byte-aligned custom formats with 1–52 fraction bits and 2–11 exponent bits use the generic path. Invalid offsets, short buffers and unsupported layouts throw before a write.

[Node and Bun benchmarks](bench/results/README.md)
