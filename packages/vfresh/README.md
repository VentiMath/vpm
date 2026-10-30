# vfresh

Conditional HTTP freshness checks for Node.js 24+ and Bun, with no runtime
dependencies. A counterpart to `fresh` 2.0.0 that parses quoted entity tags and
handles cache-control directive casing.

## Use

```js
const fresh = require('vfresh');

fresh({ 'if-none-match': 'W/"a,b"' }, { etag: '"a,b"' }); // true
fresh({ 'if-none-match': '"a"', 'cache-control': 'NO-CACHE' },
  { etag: '"a"' }); // false
```

ES modules can use `import fresh from 'vfresh'`. Inputs are ordinary objects with
lowercase header names, as provided by Node HTTP APIs; this is not the Web Headers
API. TypeScript declarations accept Node request/response header dictionaries
without requiring consumers to install Node types.

## Behavior and improvements

`fresh(requestHeaders, responseHeaders)` returns a boolean. Callers must apply
request-method and response-status eligibility themselves. A wildcard assumes
the selected representation exists, matching upstream's calling contract.

`If-None-Match` takes precedence over `If-Modified-Since`, as in fresh 2.0.0.
Strong and weak tags compare by opaque value. Without a tag condition, dates use
the existing `Date.parse` behavior; this package does not introduce strict
HTTP-date validation.

- A tag can contain a comma or backslash without being split incorrectly.
  Optional spaces/tabs and empty list members are handled.
- Weak-prefix casing and tag characters are validated. Malformed tags or list
  members make the result stale, even if an earlier member matched. Unquoted tags
  are no longer accepted just because both sides contain the same invalid text.
- `no-cache` is case-insensitive, and directive parsing respects quoted commas.
  Text inside an unrelated quoted extension does not trigger a reload. Any
  `no-cache` directive, including one with a value, forces stale under this API.
- Repeated tag/cache-control fields can be supplied as arrays of strings.
- Ordinary single-tag comparisons avoid allocating a list. Longer lists are
  scanned without building an array of tokens.

Entity-tag handling follows [RFC 9110's entity-tag syntax](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8.3).
The weak prefix is case-sensitive; HTTP header dictionary keys must still be
lowercase. This is a conditional-response helper, not a general cache policy engine.

## Validation and performance

Eight tests compare 448 ordinary combinations with the pinned upstream source
and check 2,000 generated valid tag lists against an independent matching model.
They cover quoted commas, backslashes, weak tags, malformed tails, header arrays,
date precedence, and cache-control quoting/casing.

The repository's [integration gate](../../scripts/integration.cjs) aliases this
package into ventimath's pinned Cloud Functions upgrade target (Functions Framework 5.0.2,
firebase-functions 7.4.0, Express 5.3.0, send 1.2.1, serve-static 2.2.1) and runs
real HTTP checks on Node and Bun in CI. It exercises 304 responses, forced reloads,
quoted-comma tags, and tag/date precedence. The target is fresh 2.0.0 semantics; the
development dependency `node-mocks-http` still pins fresh 0.5.2 and is not
aliased.

From the repository root:

```sh
node packages/vfresh/bench/compare.cjs
bun packages/vfresh/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **fresh / vfresh**, median nanoseconds
per call across seven alternating samples of 50,000 calls after warmup. Boolean
results are consumed. These measurements exclude HTTP I/O and application routing.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Single matching tag | 40 / 39 | 28 / 25 |
| 32 tags, last matches | 1,358 / 1,103 | 968 / 1,176 |
| 32 tags, no match | 1,563 / 1,536 | 892 / 1,187 |
| Cache-Control no-cache | 27 / 44 | 34 / 37 |
| Modified-since | 366 / 381 | 318 / 319 |

Single tags and dates were close. The matching-list case improved on Node, while
**long lists were 21–33% slower on Bun**. The no-cache case was about 1.6 times
upstream's time on Node, an increase of roughly 17 ns per call. Correct parsing
does not imply a universal speedup; results vary by runtime and run.

## Install and origin

Run `bun pm pack` here, then `bun add /absolute/path/to/vfresh-0.1.0.tgz` in the
consumer. This package has not been published by VPM to a registry. Fixtures and
benchmarks are excluded from its archive.

Derived from [`fresh` 2.0.0](https://github.com/jshttp/fresh/tree/f185ef1376c0337d366f9e35bda92b053983fd81),
by TJ Holowaychuk and Douglas Christopher Wilson. The source fixture is verified
against that commit. MIT licensed; notices are preserved in [LICENSE](LICENSE).
