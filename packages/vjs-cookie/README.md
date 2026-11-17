# vjs-cookie

Independent **js-cookie 3.0.8** browser-cookie API, with zero dependencies and
built-in TypeScript declarations. Requires Node 24+ or Bun for tooling; cookie
operations use the browser’s `document.cookie` and are inert without a document.

```js
import Cookies from 'vjs-cookie';
const session = Cookies.withAttributes({ path: '/', secure: true, sameSite: 'lax' });
session.set('preference', 'math');
session.get('preference');
session.remove('preference');
```

Supports `get(name)`, `get()`, `set`, `remove`, `withAttributes` and
`withConverter({ read, write })`. Expires accepts days (including fractions) or
a Date. Default attributes and converters are frozen snapshots; per-call options
override defaults. Removal must use the same path/domain attributes as creation.
CommonJS uses `require('vjs-cookie')`. Global/AMD script namespace helpers are
outside this package’s module contract.

The unchanged Amplify Core 6.11.2 `CookieStorage` is the app-shaped caller under
test. Current 3.0.8 and app-pinned 3.0.5 are separate controls. This package is
built and tested; release and VentiMath adoption are separate.

## Deliberate differences

- Prototype-named cookies are returned as safe own properties; the object’s
  prototype never changes. Current upstream omits those names.
- Attribute prototypes are ignored. Invalid attribute names, embedded control
  characters and invalid/nonfinite expiration values throw before a write.
- Cookie separators need not include a space. Malformed UTF-8 affects only its
  own cookie; literal invalid percent escapes remain literal.
- Duplicate names use the first visible cookie, matching current upstream.
  The app’s older 3.0.5 takes the last cookie when collecting all values.

No cookie data is cached. Browser path/domain/security rules still determine
which cookies JavaScript can read. No API can access HttpOnly cookies.

[Measurements](bench/results/README.md) compare serialization and parsing with
an in-memory document fixture. They do not measure browser cookie I/O or app
latency. Production source was written independently; upstream packages are
pinned only in development fixtures and excluded from the shipped archive.

In the 24-cookie fixture, named lookup uses 89–93% less JavaScript time and
collecting all cookies uses 43–59% less across Node/Bun and both controls.
Node token writes use 24–27% less; Bun Unicode writes use 22–27% less. Bun
plain-token writes have no established direction (current-control medians:
224 ns VPM versus 212 ns upstream). The noisy Node/current Unicode comparison
also remains inconclusive. Raw samples, controls and source hashes are retained.

## Release

The [js-cookie-3.0.8 release](https://github.com/VentiMath/vpm/releases/tag/js-cookie-3.0.8)
provides an immutable archive and checksums. Keep existing `js-cookie` imports
and use the release's `consumer-package.json` override, including for Amplify
CookieStorage. Source ownership and package publication do not establish app
adoption or deployment. See [installation](../../docs/INSTALLATION.md#js-cookie).
