# vparseurl

Parse and cache HTTP request URLs with zero external runtime dependencies.
`vparseurl` is a modernized counterpart to `parseurl` 1.3.3 for Node.js 20+ and Bun.

## Use

```js
const parseurl = require('vparseurl');

const request = { url: '/items?limit=10', originalUrl: '/api/items?limit=10' };
parseurl(request).pathname;          // '/items'
parseurl(request).query;             // 'limit=10'
parseurl.original(request).pathname; // '/api/items'
```

ES modules can use `import parseurl from 'vparseurl'`. TypeScript declarations
are included and do not require a Node.js types package in consuming projects.

## API

### `parseurl(request)`

Reads `request.url` and returns a mutable legacy Node.js `Url` object, including
`pathname`, `query`, `search`, `path`, and `href`. Queries remain undecoded strings;
an absent query is `null`, while a trailing `?` produces an empty query string.
The `_raw` field contains the original input.

Repeated calls for the same request and unchanged URL return the same object.
Changing the input string causes a new parse. An undefined URL returns `undefined`
and clears that request's current-URL cache. Other non-string URLs throw `TypeError`.

### `parseurl.original(request)`

Parses `request.originalUrl` when it is a string, using a separate cache. Otherwise
it clears the original-URL cache and falls back to `parseurl(request)`. Rewriting
`request.url` does not invalidate an unchanged original URL.

### `parseurl.clear(request)`

Clears both caches for that request. The next call parses again. Existing returned
objects and the request itself are unchanged. Repeated calls are harmless.

## Improvements and compatibility

- Stores cache entries in private `WeakMap`s, without adding or trusting
  `_parsedUrl` or `_parsedOriginalUrl` properties on requests.
- Supports frozen, sealed, and non-extensible request objects.
- Keeps cache keys separate from mutable parsed results. Changing `_raw` cannot
  make an old parse match a different request URL.
- Provides explicit cache invalidation and structural TypeScript declarations.
- Replaces the character-by-character fast-path loop with a character check and
  string search, while preserving the same parsing boundaries.
- Removes support code for obsolete runtimes without changing normal URL fields.

The returned object remains mutable and shared by calls using that cache. This
preserves consumers such as `serve-static`, which edits URL fields before formatting
a redirect. Call `clear(request)` to discard those edits and parse the input again.

Private request cache fields are intentionally unsupported; clearing those fields
does not clear VPM's cache. Use `clear(request)` instead. Missing inputs discard old
cache entries. Passing a pre-parsed `Url` object as `request.url` is intentionally
rejected; request URLs must be strings.

Common request paths retain percent escapes, repeated slashes, and dot segments.
Other inputs use the runtime's legacy `node:url.parse()` to preserve existing
`parseurl` behavior. Switching to the WHATWG `URL` API would change those semantics.
This compatibility parser does not validate destinations or establish that a URL
is safe to fetch; use the [WHATWG URL API](https://nodejs.org/api/url.html#the-whatwg-url-api)
and application-specific validation for that purpose.

## Performance

Private caching has a cost: short first-time parses are slower than upstream.
Long request paths benefit from the simpler fast-path scan. Cached reads are close
on Bun and somewhat slower on Node in the local measurement below. These are
microbenchmarks, not application throughput or latency measurements.

Reproduce from the repository root:

```sh
node packages/vparseurl/bench/compare.cjs
bun packages/vparseurl/bench/compare.cjs
```

One local run on October 25, 2026, using Node 24.22.1 and Bun 1.4.0. Each cell is
**parseurl / vparseurl** in median nanoseconds per call across seven samples;
lower is better. Request object creation is outside the timed region.

| Workload | Node | Bun |
| --- | ---: | ---: |
| First parse: short path | 43 / 610 | 34 / 126 |
| First parse: path and query | 93 / 328 | 76 / 208 |
| First parse: 2 KB path | 6,571 / 593 | 3,208 / 360 |
| First parse: absolute URL | 663 / 1,334 | 1,096 / 1,122 |
| Cached current URL | 11 / 15 | 11 / 11 |
| Cached original URL | 11 / 15 | 10 / 11 |

Results vary with runtime, warmup, and garbage collection. The benchmark consumes
results and alternates implementation order. No application-level speedup is claimed.

## Validation

Tests cover cache isolation, frozen requests, explicit invalidation, URL rewrites,
redirect formatting, and real `IncomingMessage` objects. Differential tests compare
results and parse failures against `parseurl` 1.3.3 over character boundaries and
2,000 deterministic generated inputs. The upstream source is kept unchanged as a
test-only fixture and is excluded from the package archive.

## Install from this repository

From `packages/vparseurl` in a VPM checkout:

```sh
bun pm pack
```

Then, in the consuming project:

```sh
bun add /absolute/path/to/vpm/packages/vparseurl/vparseurl-0.1.0.tgz
```

The package has not been published to a registry.

## Origin and license

Derived from [`parseurl` 1.3.3](https://github.com/pillarjs/parseurl/tree/1.3.3),
commit `0a5323370b02f4eff4069472d1e96a0094aef621`, by Jonathan Ong and Douglas
Christopher Wilson. MIT licensed; upstream notices are preserved in [LICENSE](LICENSE).
