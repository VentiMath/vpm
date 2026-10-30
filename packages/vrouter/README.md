# vrouter

Express 5-style routing, derived from `router` 2.2.0. Supports Node.js 24+ and Bun.
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
  use the same native `node:url.parse` fallback directly, without creating a
  disposable request object and a WeakMap cache entry that cannot be reused.
  The fast-path boundary matches vparseurl; ordinary routing
  no longer creates full URL objects or populates parseurl's request cache.

Three direct runtime dependencies are all VPM packages: `vdebug`, `vdepd`,
and `vpath-to-regexp`. `vms` is the only additional transitive package.
Upstream router declares five direct dependencies. Runtime-provided `node:http` and
`node:url` are not external packages. Installable archives contain ten files and exclude
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
npm --prefix scripts/router-conformance ci --ignore-scripts
node scripts/router-conformance/run.cjs
bun scripts/router-conformance/run.cjs
node scripts/check-media-archives.cjs
node packages/vrouter/bench/compare.cjs
bun packages/vrouter/bench/compare.cjs
node packages/vrouter/bench/pathnames.cjs
bun packages/vrouter/bench/pathnames.cjs
```

53 local tests cover upstream parity, handler-less registration, all runtime HTTP methods, error and promise
routing, URL restoration, options, arrays, async parameter concurrency, 3,000
synchronous handlers, deep/cyclic registration, prototype names, RegExp state and
capture parsing. Pathname comparisons include 300 generated URLs and explicit
whitespace, fragments, absolute URLs and invalid inputs. Another 3,361 complex
URL cases compare exact pathnames with vparseurl, including malformed hosts,
authentication, IPv6, international hostnames and control characters. Nonstring
inputs, getter read counts, URL rewrites and mutable shared parse results have
explicit regression tests. The shared HTTP gate
runs 228 checks through Express 5.3.0, Functions Framework 5.0.2 and
firebase-functions 7.4.0 with VPM aliases, including eleven router requests added for this package.
Archive tests use npm and Bun installations, Node/Bun CJS/ESM imports, and
TypeScript 7 CJS/ESM consumers without ambient platform types.

The original router source and upstream test files are retained as verified
references. The [router conformance gate](../../scripts/router-conformance/README.md)
runs that upstream suite **unchanged**: 694 of 694 tests pass on Node, and Bun
passes 693 with one `OPTIONS *` request that Bun's HTTP server rejects for
upstream router too.

### Initial baseline at `692d773`

These historical measurements predate the complex-URL follow-up below.
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

In that baseline, group registration takes roughly 70–83% less time across these measurements.
Most dispatch cases improve; gains are more consistent on Bun. Node static-route
results vary from 12% faster to 15% slower between processes, and HEAD/error
recovery also vary. Node absolute-URL dispatch takes 12–36% more time and a query
requiring full parsing takes 25–34% more. Those fallback paths still paid for a temporary request and redundant VPM
cache entry; the follow-up below removes that cost while retaining native parsing. The 4 KiB query passing through 20 middleware takes about 72–74%
less time. These are component measurements, not application throughput claims.

The benchmark also runs unchanged router with VPM dependencies to isolate the
caller's changes. All raw samples, runtime metadata, checksum and recorded source
hashes are in [bench/results](bench/results). Reproduce with `COUNT` and `OUTPUT`
environment variables; defaults are 10,000 dispatch iterations and smaller
registration batches. See [PROVENANCE.json](PROVENANCE.json) and [LICENSE](LICENSE)
for source versions, fixture hashes, origins and MIT attribution.

### Complex-URL follow-up, 2026-10-28

The old fallback called `vparseurl({ url })`. Each call allocated a temporary
request, added `_raw` metadata to the parsed URL, allocated a cache record and
inserted a WeakMap entry. That entry had no reuse: the temporary request was
immediately discarded, while the router already cached the pathname locally.
The new fallback calls the same `node:url.parse` directly. It retains the exact
fast-path boundary, string-only input contract and native parsing behavior. The
ordinary-URL cache and all routing corrections above remain in place.

[`bench/pathnames.cjs`](bench/pathnames.cjs) compares upstream, the exact saved
`692d773` implementation, and the updated router within each process. Three fresh
processes per runtime, twelve balanced samples and the same retention/consumption
method cover the original 21 cases plus four additional complex-URL cases.
Values below are medians of the three process medians; original results above
remain historical and are not mixed into this comparison.

| Operation | Node upstream (ns) | Node before → after (ns) | Bun upstream (ns) | Bun before → after (ns) |
| --- | ---: | ---: | ---: | ---: |
| dispatch absolute URL | 1,814 | 2,007 → 1,697 | 1,948 | 1,937 → 1,806 |
| dispatch query requiring full parse | 1,290 | 1,560 → 1,229 | 1,594 | 1,532 → 1,420 |
| dispatch absolute URL with parameter | 2,513 | 2,767 → 2,435 | 2,296 | 2,375 → 2,248 |
| dispatch absolute international hostname | 2,404 | 2,652 → 2,318 | 2,520 | 2,437 → 2,393 |
| dispatch escaped path through full parser | 1,477 | 1,671 → 1,387 | 2,008 | 1,844 → 1,753 |
| dispatch complex URL through 20 middleware | 4,051 | 4,371 → 3,920 | 5,314 | 4,008 → 3,946 |
| dispatch static route | 548 | 536 → 511 | 762 | 576 → 571 |
| dispatch query string | 636 | 544 → 566 | 714 | 578 → 552 |
| dispatch long query through 20 middleware | 11,972 | 3,121 → 3,176 | 11,149 | 3,080 → 3,078 |

Node's original absolute-URL case takes **14–20% less time** than the previous
router across the three processes; the full-parse query takes **16–21% less**.
Against upstream in the same runs, those cases now range from **10% faster to 2%
slower**, and **5–8% faster**, respectively. The additional complex cases take
**8–18% less time** than the previous VPM implementation. Ordinary-path and
registration differences are generally small; their algorithms are unchanged.
The long-query cache benefit is retained (about **73–74% less than upstream**
on Node and **72% less on Bun**).

Bun's full-parse query improves by **7–10%**. Its absolute-URL median also improves,
but one process is **14% slower than the previous version**, while the other two
are about **7% faster**; the raw samples are noisy, so no across-the-board Bun
speedup is claimed. All correctness tests and both HTTP consumer gates pass.
These are component timings, not a prediction of end-to-end application latency.

[Raw follow-up samples and matching source hashes](bench/pathname-results) include
all controls and all three implementations. The exact previous entry and layer
sources are retained under `test/fixtures/vrouter-692d773` and recorded in
[PROVENANCE.json](PROVENANCE.json). No cache or parser changes were made to the
standalone vparseurl package.
