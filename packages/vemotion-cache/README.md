# vemotion-cache

Emotion's style cache, targeting **@emotion/cache 11.14.0**, the latest release
checked November 1, 2026, on [vstylis](../vstylis) (stylis 4.4.0) and
[vemotion-sheet](../vemotion-sheet). An ES module for browsers and server
rendering.

```js
import createCache from 'vemotion-cache';
import rtlPlugin from 'stylis-plugin-rtl';
const cache = createCache({key: 'muirtl', stylisPlugins: [rtlPlugin], nonce: window.cspNonce});
// <CacheProvider value={cache}>...</CacheProvider>
```

`createCache({key, nonce, stylisPlugins, container, speedy, insertionPoint, prepend})`
returns the cache Emotion's components insert into: serialized styles go
through Emotion's stylis plugins (nested selectors starting with `:` apply to
the parent, `label:` declarations are dropped, and in development unsafe
pseudo-classes and misplaced `@import` rules are reported), then
`stylisPlugins` (by default `prefixer`, also exported), then into the
cache's style sheet. On the server, `insert` returns the CSS for rendering.
Server-rendered style elements are hydrated. Declarations use DOM types.

## Differences from @emotion/cache 11.14.0

| @emotion/cache | vemotion-cache |
| --- | --- |
| stylis 4.2.0 | vstylis (stylis 4.4.0), the version Emotion's suite also passes with |
| A copy of stylis 4.0.13's prefixer, selecting properties by a hash: `flex-wrap` gained `-webkit-box-flex-wrap`, `color-scheme` gained `-webkit-print-color-scheme`, and others | Emotion's rule set, by property name |
| `align-self: flex-start` gave IE `-ms-flex-item-align:flex-start`; `justify-content: space-between` lost `-ms-flex-pack` | `-ms-flex-item-align:start`; `-ms-flex-pack:justify` |

Otherwise the output is identical: over 10,000 generated styles, as classes
and global styles, in regular and compat mode, with no plugins, the default
prefixer and VentiMath's configurations (stylis-plugin-rtl and its `@layer`
plugin), vemotion-cache produces the same CSS, state and messages as the
original running on stylis 4.4.0, in development and production. Emotion's
suite passes with it in place of the original; see the
[conformance record](../../scripts/emotion-conformance/README.md).
