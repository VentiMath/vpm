# vemotion-utils

Registration and insertion of serialized styles in an Emotion cache, targeting
**@emotion/utils 1.4.2**, the latest release checked November 1, 2026. Depends
on [vemotion-sheet](../vemotion-sheet) for its types; an ES module for browsers,
Node.js 24+ and Bun.

```js
import {insertStyles, getRegisteredStyles} from 'vemotion-utils';
insertStyles(cache, serializeStyles([{color: 'red'}]), false); // inserts .css-<name> once
const registered = [];
getRegisteredStyles(cache.registered, registered, 'css-abc other'); // 'other ', registered: ['color:red;']
```

- `insertStyles(cache, serialized, isStringTag)` registers the styles and
  inserts them (and the keyframes chained after them) once per cache; without a
  document it returns the CSS for server rendering.
- `registerStyles` records a class's styles for components that compose it.
- `getRegisteredStyles` splits a `className` into registered styles and other
  classes.
- The `EmotionCache`, `SerializedStyles` and `RegisteredCache` types.

Its declarations use vemotion-sheet's `StyleSheet` type, so it depends on
vemotion-sheet: @emotion/utils imports @emotion/sheet's types without depending
on it, and installed on its own (pnpm, or any isolated install) its
declarations fail to compile (TS2307). The `browser` export condition (or a
`document` at run time) selects browser behavior. Emotion's suite passes with this package in place of the original;
see the [conformance record](../../scripts/emotion-conformance/README.md).
