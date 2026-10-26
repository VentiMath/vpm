# vserve-static

Static-file middleware for the Express 5 stack, built on `vsend` and the VPM URL
helpers. A counterpart to `serve-static` 2.2.1 for Node.js 20+ and Bun.

Its four direct runtime dependencies are `vencodeurl`, `vescape-html`,
`vparseurl`, and `vsend`. Including transitive dependencies, its external runtime
tree contains fifteen VPM packages. No additional prerequisite package was needed.

## Use

```js
const express = require('express');
const serveStatic = require('vserve-static');
const app = express();

app.use('/assets', serveStatic('/srv/assets', {
  maxAge: '1h',
  setHeaders(response) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));
```

ES modules can use `import serveStatic from 'vserve-static'`. TypeScript
declarations are included, using structural HTTP interfaces from `vsend`.
Importing the package does not require a separate types package. Applications
using Node or Express APIs can keep their existing types.

`serveStatic(root, options?)` returns `(request, response, next) => void`.
The required root is resolved at construction and must be a nonempty string
without NUL. URLs are decoded and paths checked by `vsend`; the middleware
removes queries from file lookup while retaining them in directory redirects.
Mounted middleware redirects `/assets` to `/assets/` before serving an index.

## Options and fallthrough

All [`vsend` options](../vsend/README.md#options-and-events) are supported except
`root`, which is supplied as the first argument. The wrapper adds:

| Option | Behavior |
| --- | --- |
| `fallthrough` | Defaults to `true`. Missing files, malformed paths, and other pre-file client errors call `next()`; unsupported methods also fall through. With `false`, client errors call `next(error)` and unsupported methods receive 405 with `Allow: GET, HEAD`. |
| `redirect` | Defaults to `true`. Directories redirect to a trailing slash. With `false`, directories follow the 404/fallthrough policy. |
| `setHeaders(response, path, stat)` | Optional synchronous callback before file headers are finalized. Its `this` is the active sender, as upstream. |

Once a file is found, every error is forwarded, including 412, 416, and read
failures. Server errors are forwarded even before finding a file. This preserves
the behavior needed for stacking multiple static roots. A `next(error)` handler
owns the error response and must handle an already-started response appropriately.

Options are validated and snapshotted once when the middleware is created.
Inherited values remain supported; arrays are copied and frozen. Changes to the
original options object or its arrays do not reconfigure existing middleware.
Create new middleware to change configuration. The root argument takes
precedence over any runtime `options.root` value. Explicit `maxAge: 0` wins over
the legacy `maxage` spelling through `vsend`.

## Improvements and deliberate differences

- **URL cache isolation:** directory redirects format a copy instead of changing
  the shared parsed original URL. Later logging and middleware still see the
  original pathname and path; frozen cached results work too. Leading slashes
  are collapsed, query strings are retained, and location/body values use
  `vencodeurl` and `vescape-html`.
- **Startup validation:** invalid sender options fail when middleware is created,
  before handling a request. Non-null `fallthrough`/`redirect` values must be
  booleans, and non-null `setHeaders` must be a function, including previously
  ignored falsy inputs such as `0` or `false`.
- **Generated response framing:** redirects and 405 responses remove stale
  transfer encoding, trailers, content encoding/language/range, and content type
  before setting their own headers. HEAD redirects explicitly end without body
  bytes while retaining the GET content length. Unrelated headers are retained.
- **Lifecycle and malformed input:** invocation after completion or disconnection
  does nothing. A strict-method rejection after headers were sent forwards a 500
  error instead of trying to write another response. Missing or unparseable URLs
  follow the 400/fallthrough policy rather than throwing on a missing pathname.

The documented `vsend`, `vparseurl`, and URL-encoding differences also apply.
In particular, `vsend` uses strong preconditions, GET-only ranges, and guarded
stream cleanup. Header callbacks remain synchronous; thrown exceptions are
application errors. A callback that sends an alternative body must adjust its
headers. This wrapper retains legacy URL parsing/formatting, follows filesystem
symlinks, and does not make the root a filesystem jail or stat/open atomic.

## Validation

Seventeen tests cover a differential HTTP matrix, option snapshots and
inheritance, mounted redirects, cache preservation, frozen URL results, query
escaping, framing, HEAD, completed/partial responses, header callbacks, malformed
URLs, filesystem errors, multiple roots, and HTTP/2. The differential baseline
is unchanged `serve-static` 2.2.1 source using the same VPM dependencies to isolate
wrapper behavior. It is not the complete upstream test suite.

The repository's [integration gate](../../scripts/integration.cjs) aliases all
VPM counterparts into the pinned Express 5.2.1, Functions Framework 5.0.2,
firebase-functions 7.4.0, and serve-static 2.2.1 stack. Its 60 HTTP checks cover
static delivery, downloads, ranges, callbacks, fallthrough, mount roots,
redirect queries, and conflicting headers, alongside the other VPM packages.
It runs on Node 20, 22, 24 and Bun in CI. This package targets that Express 5 path.

```sh
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
```

## Performance

From the repository root, after installing the pinned consumers:

```sh
node packages/vserve-static/bench/compare.cjs scripts/consumers/node_modules/serve-static
bun packages/vserve-static/bench/compare.cjs scripts/consumers/node_modules/serve-static
# Isolate the wrapper by sharing VPM dependencies on both sides:
node packages/vserve-static/bench/compare.cjs
bun packages/vserve-static/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **upstream / VPM**, in median
microseconds per completed request. Seven alternating samples of 200 sequential
requests follow 50 warmup requests per implementation. Outputs are compared
before timing and consumed during timing. Middleware is constructed once, outside
timing. These tests use keep-alive, warm filesystem caches, localhost HTTP, no TLS,
and no request concurrency.

| Workload | Complete stack, Node 24.22.1 | Complete stack, Bun 1.4.0 | Shared dependencies, Node | Shared dependencies, Bun |
| --- | ---: | ---: | ---: | ---: |
| 4 KiB file GET | 220.9 / 243.6 | 246.9 / 260.5 | 289.6 / 250.4 | 230.5 / 224.6 |
| HEAD | 129.1 / 134.6 | 113.0 / 130.2 | 178.6 / 190.9 | 116.5 / 118.5 |
| Directory redirect | 119.4 / 127.7 | 111.4 / 123.3 | 142.8 / 137.4 | 120.4 / 117.7 |
| 405 | 77.6 / 78.9 | 83.2 / 74.5 | 93.7 / 102.0 | 75.6 / 75.6 |
| Missing file | 104.7 / 116.8 | 119.9 / 126.5 | 119.7 / 120.6 | 115.0 / 108.6 |

Against the complete upstream stack, GET was **6–10% slower**, HEAD **4–15%
slower**, redirects **7–11% slower**, and missing files **5–12% slower**. The
405 path was close on Node and about 10% faster on Bun. The shared-dependency
comparison was mixed. Independent runs have different baselines; these results
do not establish a reliable wrapper speedup, production throughput improvement,
tail-latency improvement, or memory reduction.

## Install from this repository

VPM has not published these packages to a registry. Run `bun pm pack` in each
of these package directories:

```text
vserve-static, vparseurl, vsend, vdebug, vencodeurl, vescape-html, vetag,
vfresh, vhttp-errors, vmime-types, vms, von-finished, vrange-parser,
vstatuses, vee-first, vmime-db
```

Set the consumer's `dependencies["vserve-static"]` to the absolute `file:` path
of its archive, and use `overrides` to map each of the other fifteen package names
to its archive's absolute `file:` path. Then run `bun install`. Packing rewrites
workspace dependencies to exact `0.1.0` versions; the overrides resolve them
locally. Tests and benchmarks are excluded from the archives.

Use this function explicitly where you currently call `express.static()` or
`serve-static`. Installing it alone does not replace Express's imports. The
integration gate changes aliases only inside its process and does not change
application manifests or deployments.

## Origin and license

Derived from [`serve-static` 2.2.1 at commit
76312e1](https://github.com/expressjs/serve-static/tree/76312e12c2754c226a685201ff43d785455d0590).
The unchanged source and original license are retained as test fixtures.
MIT licensed, with upstream notices preserved in [LICENSE](LICENSE).
