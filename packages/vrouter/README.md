# vrouter

Express 5-style routing, derived from `router` 2.2.0. Supports Node.js 20+ and Bun.
Public declarations are included and do not require ambient Node or browser types.

```js
const Router = require('vrouter')
const router = Router({ mergeParams: true })

router.param('id', (req, res, next, id) => {
  req.params.id = id.toUpperCase()
  next()
})
router.get('/users/:id', (req, res) => res.end(req.params.id))
router.use((error, req, res, next) => {
  res.statusCode = error.status || 500
  res.end(error.message)
})
// Pass router(req, res, next) to your HTTP server or middleware stack.
```

ES modules can use `import Router, { Route } from 'vrouter'`. Both `Router()` and
`new Router()` return callable routers. `Router.Route` constructs an individual
route. The TypeScript factory accepts request and response type parameters, for
example `Router<IncomingMessage, ServerResponse>()` when using your own Node types.

## API and compatibility

- `Router({ caseSensitive, strict, mergeParams })`: the familiar routing options.
- `router.use([path], ...handlers)`: middleware with optional mount prefix;
  nested handler arrays are supported. Paths may be strings, RegExp objects or
  arrays. String routes follow the vpath-to-regexp 8.x-compatible syntax.
- `router.METHOD(path, ...handlers)` and `router.all(path, ...handlers)`:
  case-insensitive method names from the runtime's `node:http.METHODS`, exposed
  in lowercase. `router.route(path).get(...).post(...)` shares one route.
- `router.param(name, fn)`: parameter callback `(req, res, next, value, name)`;
  callbacks may edit `req.params` and are memoized per request/value.
- Normal handlers receive `(req, res, next)`; error handlers have four arguments,
  `(error, req, res, next)`. Throws and rejected promises enter error routing.
  Fulfillment does not call `next()` automatically. Thenables remain supported
  with the upstream deprecation warning.
- `next('route')` skips the current route; `next('router')` exits the router.
  HEAD falls back to GET, and OPTIONS gets an automatic Allow response when no
  handler responds. Nested routers restore URL prefixes and parent request state.

The callable prototype, mutable stacks and registration order remain compatible
with Express 5. Deep synchronous handler dispatch yields after 100 calls, as
upstream does. Handler code is still responsible for calling `next()` once or
ending the response. This package does not make arbitrary application RegExp
patterns safe from excessive backtracking.

## Improvements and intentional differences

- **Parameter dictionaries:** registry, memoization, RegExp captures, empty
  middleware parameters and merged parameters have null prototypes. Names such
  as `constructor` and `__proto__` work as ordinary own properties. Numeric
  capture merging no longer changes the child layer's captured parameters.
- **RegExp state:** routes copy source and flags at registration. Global and
  sticky matches start at zero for every request and leave the caller's
  `lastIndex` untouched. Later pattern mutation and custom `.exec` overrides do
  not change a registered route. Capture scanning handles escaped parentheses,
  character classes, lookarounds, named groups and Unicode-escaped group names.
- **Thenables:** each returned `.then` getter is read once. The captured function
  is invoked with its original receiver, including in parameter/error handlers.
  This small check is in the caller, removing the `is-promise` dependency.
- **Registration:** the complete handler list is validated and layers are built
  before publication. Invalid handlers, name getters and route patterns leave
  no partial registration behind. Cyclic handler arrays throw promptly; deep
  arrays are flattened iteratively. Repeated arrays preserve their order.
  Side effects performed by user getters cannot be rolled back.
- **Caller specialization:** route handler layers share one stateless root
  matcher; one `use(path, ...handlers)` call compiles its path once. Layer arrays
  and match results remain separate. Percent-free captures avoid URI decoding;
  parameter-free layers avoid parameter-processing closures. Request-state
  restoration copies three known fields directly.
- **Pathnames:** ordinary URLs take a pathname-only path with a cache scoped to
  each router invocation. Changes to `req.url` invalidate it. Complex URL forms
  still use vparseurl. The fast-path boundary matches vparseurl; ordinary routing
  no longer creates full URL objects or populates parseurl's request cache.

Four direct runtime dependencies are all VPM packages: `vdebug`, `vdepd`,
`vparseurl`, and `vpath-to-regexp`. `vms` is the only additional transitive package.
Upstream router declares five direct dependencies. Runtime-provided `node:http`
is not an external package. Installable archives contain ten files and exclude
all comparison fixtures, tests and benchmarks.

## Validation and benchmarks

```sh
# From the repository root
bun install --frozen-lockfile
node --test packages/vrouter/test/*.test.cjs
bun test packages/vrouter/test
npm run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
node packages/vrouter/bench/compare.cjs
bun packages/vrouter/bench/compare.cjs
```

48 local tests cover upstream parity, all runtime HTTP methods, error and promise
routing, URL restoration, options, arrays, async parameter concurrency, 3,000
synchronous handlers, deep/cyclic registration, prototype names, RegExp state and
capture parsing. Pathname comparisons include 300 generated URLs and explicit
whitespace, fragments, absolute URLs and invalid inputs. The shared HTTP gate
runs 226 checks through Express 5.3.0, Functions Framework 5.0.2 and
firebase-functions 7.4.0 with VPM aliases, including nine new router requests.
Archive tests use npm and Bun installations, Node/Bun CJS/ESM imports, and
TypeScript 7 CJS/ESM consumers without ambient platform types.

The original router source and upstream test files are retained as verified
comparison/contract references. The upstream test suite is **not run verbatim**;
these results refer to the local tests and consumer gate described above.

Measurements on 2026-10-28 used Node 24.22.1 and Bun 1.4.0, three fresh processes
per runtime and twelve alternating samples per case. The table takes the median
of the three per-process medians. It measures synchronous dispatch or registration,
including request/result allocation and retention writes. JSON response serialization
is included; network I/O is excluded. Outputs are checked for parity and retained
in 256 slots, with final consumption outside timing. Debug logging is disabled.

| Operation | Node 24 upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| register one static route | 5,743 → 4,666 | 4,026 → 3,054 |
| register one parameter route | 6,286 → 5,192 | 4,140 → 3,394 |
| register route with 20 handlers | 23,112 → 6,065 | 23,520 → 4,755 |
| register 20 root middleware | 25,720 → 5,811 | 23,502 → 4,186 |
| register 20 mounted middleware | 27,608 → 7,036 | 26,372 → 5,945 |
| dispatch static route | 533 → 614 | 660 → 505 |
| dispatch one parameter | 850 → 760 | 800 → 655 |
| dispatch escaped parameter | 910 → 862 | 790 → 699 |
| dispatch wildcard | 1,107 → 1,028 | 1,028 → 872 |
| dispatch RegExp captures | 947 → 872 | 1,173 → 997 |
| dispatch with param callback | 897 → 838 | 907 → 775 |
| dispatch HEAD fallback | 523 → 484 | 561 → 407 |
| dispatch after 20 misses | 1,112 → 995 | 1,131 → 965 |
| dispatch through 20 middleware | 2,995 → 2,844 | 4,024 → 2,536 |
| dispatch 20 route handlers | 1,471 → 1,412 | 1,075 → 822 |
| dispatch nested mergeParams | 2,052 → 1,953 | 1,543 → 1,307 |
| dispatch query string | 580 → 514 | 671 → 476 |
| dispatch absolute URL | 1,364 → 1,649 | 1,859 → 1,744 |
| dispatch query requiring full parse | 1,115 → 1,489 | 1,472 → 1,412 |
| dispatch long query through 20 middleware | 11,629 → 3,124 | 10,457 → 2,802 |
| dispatch error recovery | 798 → 687 | 920 → 655 |

Group registration takes roughly 70–83% less time across these measurements.
Most dispatch cases improve; gains are more consistent on Bun. Node static-route
results vary from 12% faster to 15% slower between processes, and HEAD/error
recovery also vary. Node absolute-URL dispatch takes 12–36% more time and a query
requiring full parsing takes 25–34% more. These fallback paths retain full URL
parsing and the VPM cache cost; the pathname specialization targets ordinary
request URLs. The 4 KiB query passing through 20 middleware takes about 72–74%
less time. These are component measurements, not application throughput claims.

The benchmark also runs unchanged router with VPM dependencies to isolate the
caller's changes. All raw samples, runtime metadata, checksum and recorded source
hashes are in [bench/results](bench/results). Reproduce with `COUNT` and `OUTPUT`
environment variables; defaults are 10,000 dispatch iterations and smaller
registration batches. See [PROVENANCE.json](PROVENANCE.json) and [LICENSE](LICENSE)
for source versions, fixture hashes, origins and MIT attribution.
