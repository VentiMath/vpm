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
`TextEncoder`, which jsdom test environments lack. `bench/compare.cjs` times
both: on par for ASCII styles on Node and faster on Bun; a style with
non-ASCII text, which now hashes all of its UTF-8 bytes, takes about 0.4 µs
instead of 0.2 µs on Node ([Node](bench/results/node.json),
[Bun](bench/results/bun.json)).

Emotion's suite passes with this package in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
