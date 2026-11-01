# vemotion-use-insertion-effect-with-fallbacks

`useInsertionEffect` with fallbacks, for Emotion, targeting
**@emotion/use-insertion-effect-with-fallbacks 1.2.0**, the latest release
checked November 1, 2026. React (16.8 or later) is a peer; an ES module for
browsers and server rendering.

```js
import {useInsertionEffectAlwaysWithSyncFallback, useInsertionEffectWithLayoutFallback} from 'vemotion-use-insertion-effect-with-fallbacks';
useInsertionEffectAlwaysWithSyncFallback(() => insertStyles(cache, serialized, false));
```

- `useInsertionEffectAlwaysWithSyncFallback(create)`: `useInsertionEffect` on
  React 18 and later in the browser; on the server, or on React 16 and 17,
  `create` runs at once (and its result is returned).
- `useInsertionEffectWithLayoutFallback`: `useInsertionEffect`, or
  `useLayoutEffect` on React 16 and 17.

The `browser` export condition (or a `document` at run time) selects browser
behavior. The same behavior as the original; Emotion's suite passes with this
package in place of the original under React 16 and React 18; see the
[conformance record](../../scripts/emotion-conformance/README.md).
