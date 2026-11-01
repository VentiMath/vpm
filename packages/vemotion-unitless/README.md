# vemotion-unitless

The style object keys of CSS properties whose numeric values take no unit,
targeting **@emotion/unitless 0.10.0**, the latest release checked November 1,
2026. Emotion appends `px` to numbers for every other property. No
dependencies; an ES module for browsers, Node.js 24+ and Bun.

```js
import unitless from 'vemotion-unitless';
unitless.lineHeight; // 1
```

Adds `gridArea` and `lineClamp`, which React 19 also treats as unitless:
with @emotion/unitless, `gridArea: 2` became `grid-area:2px` and
`lineClamp: 3` became `line-clamp:3px`. Emotion's suite passes with this
package in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
