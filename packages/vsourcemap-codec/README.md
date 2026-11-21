# vsourcemap-codec

Encodes and decodes the `mappings` string that connects generated JavaScript to the original file, line, column and optional symbol name. The frontend build uses these two operations through `@jridgewell/gen-mapping` and `@jridgewell/trace-mapping`. The implementation has no runtime dependencies.

```js
import {decode, encode} from 'vsourcemap-codec';
const mappings = encode([[[0, 0, 3, 2]], [], [[4]]]);
decode(mappings); // [[[0, 0, 3, 2]], [], [[4]]]
```

The codec preserves empty lines, duplicate columns, named segments and unmapped positions. Decoding sorts out-of-order segments stably by generated column. Invalid digits, truncated deltas and malformed segment lengths throw. VPM targets the `encode` and `decode` APIs of `@jridgewell/sourcemap-codec` 1.6.0. The upstream scope and range extension APIs remain outside this package.

[Node and Bun benchmarks](bench/results/README.md)
