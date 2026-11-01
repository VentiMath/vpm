# vemotion-babel-plugin

Emotion's Babel plugin, targeting **@emotion/babel-plugin 11.13.5**, the latest
release checked November 1, 2026. On [vstylis](../vstylis),
[vemotion-serialize](../vemotion-serialize) and [vemotion-hash](../vemotion-hash):
3 dependencies instead of 11. CommonJS (Babel 7 loads plugins synchronously),
for Node.js 24+ and Bun.

```js
// babel.config.js
module.exports = {
  plugins: [['vemotion-babel-plugin', {autoLabel: 'dev-only', labelFormat: '[local]'}]],
};
```

It compiles Emotion at build time: `css`, `keyframes` and `injectGlobal` calls,
`Global`'s `styles`, the `css` prop and `styled` are minified, serialized when
static, labeled (`autoLabel`: `dev-only`, `always` or `never`; `labelFormat`
with `[local]`, `[filename]`, `[dirname]` or a function) and source-mapped in
development (`sourceMap`); styled components get stable target class names,
so they can be used as selectors; `importMap` covers packages re-exporting
Emotion's exports; `cssPropOptimization: false` leaves css props alone. Imports
of `@emotion/react`, `@emotion/styled`, `@emotion/css`, `@emotion/native` and
`@emotion/primitives` are transformed (alias them to VPM's packages at run
time, see [vemotion-react](../vemotion-react)).

## Differences from @emotion/babel-plugin 11.13.5

| @emotion/babel-plugin | vemotion-babel-plugin |
| --- | --- |
| Minifies with stylis 4.2.0, which drops the space a comment separates two words with: `border: 1px /* thin */ solid red` became `border:1pxsolid red` | vstylis keeps it: `border:1px solid red` |
| `macros` export for the `/macro` entries, through babel-plugin-macros | No macros (VPM's Emotion packages have no macro entries) |
| 11 dependencies (Babel helpers and runtime, babel-plugin-macros, source-map, convert-source-map, find-root, escape-string-regexp, stylis 4.2.0, three Emotion packages) | 3, all VPM; source maps, imports and package roots are the plugin's own code |

The output is otherwise the original's, including target class names: the
plugin's own 130 tests pass except two pinned by name (a fixture importing
`@emotion/react/macro`, and a snapshot recording the dropped space), and
Emotion's runtime suite passes with its test files compiled by this plugin;
see the [conformance record](../../scripts/emotion-conformance/README.md).
