# vemotion-hash

The class name hash of Emotion, targeting **@emotion/hash 0.9.2**, the latest
release checked November 1, 2026: MurmurHash2 in base 36. No dependencies; an
ES module for browsers, Node.js 24+ and Bun.

```js
import hash from 'vemotion-hash';
hash('something'); // 'crsxd7'
```

ASCII strings hash exactly as with @emotion/hash. Other strings are hashed as
their UTF-8 bytes: @emotion/hash keeps only the low byte of each UTF-16 code
unit, so `中` (U+4E2D) and `伭` (U+4F2D) hash alike, and two styles that differ
only by such characters (`content: "中"` and `content: "伭"`) get the same class
name, the second rendering with the first's styles. Encoding needs no
`TextEncoder`, which jsdom test environments lack.

[Process-isolated measurements](bench/results/README.md) on Node 24 and Bun
include raw samples, balanced process order and independent controls. The ASCII
case is slower on Node and faster on Bun. The Unicode case hashes different
bytes by design and has a substantial Node cost; it is not a comparison of
identical hash semantics. The report includes these costs and inconclusive cases.


Emotion's suite passes with this package in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
