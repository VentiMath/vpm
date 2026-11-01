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

The cache factory, compiler storage and hydration are a source-informed VPM
redesign. Compatibility plugins, prefix rules and declarations retain the
upstream contract and attribution; this is not a clean-room implementation.

## Differences from @emotion/cache 11.14.0

| @emotion/cache | vemotion-cache |
| --- | --- |
| Shared browser insertion destination can be changed by a nested plugin insertion | Each invocation retains its own destination and source-map suffix |
| Hydration searches the global document | Hydration searches the container's document, including iframe documents |
| Compiled output is indexed by the supplied serialized name | Full selector and style text identify compiled output, preventing stale CSS when a name is reused |
| Shared custom-plugin compilation can reuse another request's closure-dependent output | Custom-plugin results stay with their cache |
| Unbounded compiled-output history | At most 1,024 compiled entries per storage map; eviction does not remove already-inserted CSS |
| stylis 4.2.0 | vstylis (stylis 4.4.0), the version Emotion's suite also passes with |
| A copy of stylis 4.0.13's prefixer, selecting properties by a hash: `flex-wrap` gained `-webkit-box-flex-wrap`, `color-scheme` gained `-webkit-print-color-scheme`, and others | Emotion's rule set, by property name |
| `align-self: flex-start` gave IE `-ms-flex-item-align:flex-start`; `justify-content: space-between` lost `-ms-flex-pack` | `-ms-flex-item-align:start`; `-ms-flex-pack:justify` |

CSS and inserted state match over 10,000 generated styles in four plugin
configurations, including VentiMath's RTL and `@layer` configurations, in
development and production. Distinct diagnostic text also matches;
development warnings can repeat in a new cache because another request no
longer suppresses them. The differential runner reports those repetitions
separately. Custom plugins should be deterministic within a cache; their
results are memoized until eviction. Inserted and registered tables remain
available for Emotion/MUI integration; compiled-cache eviction does not
bound those caller-owned tables.

Seven focused tests cover the storage and browser regressions. The complete
Emotion fixture retains two documented Babel-plugin differences, and ten
MUI/React 19 caller renders match upstream on Node 24 and Bun. See the
[conformance record](../../scripts/emotion-conformance/README.md).

[Isolated-process measurements](bench/results/README.md) cover server cache
construction, new compilation and reuse. The
[styled caller measurements](../vemotion-styled/bench/results/README.md)
cover the full rendering stack. These are local CPU comparisons, not browser
rendering or application-throughput measurements.

The current recording is mixed: Node's application-layer compilation is 17%
faster, while constructing its cache costs about 0.18 microseconds more. Bun's
repeated lookup costs about 5–11 nanoseconds more. The complete styled stack
shows no established server-rendering improvement on either runtime; raw
measurements and control variation are retained in the linked reports.
