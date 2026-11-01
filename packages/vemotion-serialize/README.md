# vemotion-serialize

Serializes Emotion's style arguments to CSS and a class name, targeting
**@emotion/serialize 1.3.3**, the latest release checked November 1, 2026. On
[vemotion-hash](../vemotion-hash), [vemotion-memoize](../vemotion-memoize),
[vemotion-unitless](../vemotion-unitless) and [vemotion-utils](../vemotion-utils);
`csstype` (types only) is a peer. An ES module for browsers, Node.js 24+ and Bun.

```js
import {serializeStyles} from 'vemotion-serialize';
const {name, styles} = serializeStyles([{color: 'red', padding: 8, '&:hover': {opacity: 0.5}, label: 'Card'}]);
// styles: 'color:red;padding:8px;&:hover{opacity:0.5;}label:Card;', name: '<hash>-Card'
```

`serializeStyles(args, registered?, props?)` takes a tagged template's strings
and values, or interpolations: style objects (nested selectors and at-rules,
fallback arrays, numbers as px except for unitless properties), arrays,
functions of props, other serialized styles, `keyframes()` results, registered
class names and component selectors. It returns `{name, styles, next}`, where
`next` lists the keyframes used. The style types (`CSSObject`, `Interpolation`,
`Keyframes`...) are exported; they need DOM types.

## Differences from @emotion/serialize 1.3.3

| @emotion/serialize | vemotion-serialize |
| --- | --- |
| Units decided with the key as written: `{'font-weight': 600}` became `font-weight:600px` in production (development only warns that kebab-case is unsupported) | The camelCase form decides: `font-weight:600` (the warning remains) |
| `{width: [100, '50%']}` became `width{100;50%;}` (a list counts as fallbacks only when its first value is a string) | `width:100px;width:50%;` |
| Any key whose second character is `-` counted as a custom property (`z-index` escaped the kebab-case warning) | Custom properties start with `--` |
| Class names collide for styles that differ by non-ASCII characters (@emotion/hash) | Distinct ([vemotion-hash](../vemotion-hash)); `gridArea` and `lineClamp` take no px ([vemotion-unitless](../vemotion-unitless)) |
| Module variables saved and restored around nested calls | Each call keeps its own state |

Otherwise the output is identical: over 20,000 generated style arguments, in
development and production builds, vemotion-serialize gives the same names,
styles, keyframes, messages and errors as the original, and Emotion's suite
passes with it in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
