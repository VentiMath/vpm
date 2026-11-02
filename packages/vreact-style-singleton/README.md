# vreact-style-singleton

Independently written shared stylesheets matching the three public factories in
**react-style-singleton 2.2.3**, for React 19 and modern browsers. Uses
[vget-nonce](../vget-nonce); removes tslib.

```jsx
import {styleSingleton} from 'vreact-style-singleton';
const SharedStyle = styleSingleton(); // create once, outside render
// Every mounted instance shares one style element.
<SharedStyle styles="body { overflow: hidden; }" />;
```

`stylesheetSingleton()` provides `add(css)` / `remove()` without React hooks.
`styleHookSingleton()` creates a hook accepting `(css, dynamic?)`.
The first active user sets the CSS and nonce; the last cleanup removes the
element. Each factory owns its own stylesheet. Effects insert styles after
commit, and React StrictMode cleanup is balanced. Static CSS stays unchanged
until the last user leaves. Set `dynamic` to reapply changes for a sole user;
multiple users still share the first active stylesheet, so do not use different
dynamic CSS values in concurrent instances.

Intentional repairs: dynamic CSS changes between nonempty strings now update;
extra `remove()` calls cannot prevent future insertion; direct `add()` without a
document is a no-op. SSR renders no style and hydration inserts it in the browser.
No request-scoped style collection, legacy Internet Explorer `styleSheet` path,
React 16–18 support claim or automatic CSP generation is provided.

[Checks](../../scripts/style-singleton-conformance/README.md) compare the original
contract, the deliberate fixes, actual scroll-lock consumers, browser bundles and
packed npm/Bun installs. [Measurements](bench/results/README.md) distinguish
reference bookkeeping from DOM work. Built, not released or adopted.
[Provenance](PROVENANCE.json).
