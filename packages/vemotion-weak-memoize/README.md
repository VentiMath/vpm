# vemotion-weak-memoize

Memoization keyed by object without keeping the keys alive, for Emotion
(themes, caches), targeting **@emotion/weak-memoize 0.4.0**, the latest release
checked November 1, 2026. No dependencies; an ES module for browsers, Node.js
24+ and Bun.

```js
import weakMemoize from 'vemotion-weak-memoize';
const withDefaults = weakMemoize(theme => ({...defaults, ...theme}));
```

The same behavior as the original. Emotion's suite passes with this package in
place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
