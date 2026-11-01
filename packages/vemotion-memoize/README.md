# vemotion-memoize

Single-argument memoization for Emotion, targeting **@emotion/memoize 0.9.0**,
the latest release checked November 1, 2026. No dependencies; an ES module for
browsers, Node.js 24+ and Bun.

```js
import memoize from 'vemotion-memoize';
const hyphenate = memoize(name => name.replace(/[A-Z]/g, '-$&').toLowerCase());
```

Results are cached in a `Map`, including `undefined` results, which
@emotion/memoize recomputed on every call. Emotion's suite passes with this
package in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
