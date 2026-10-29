# vexpress

Express 5-style HTTP applications built entirely on VPM runtime packages, derived
from Express **5.3.0**. Supports Node.js 20+ and Bun. Performance measurements
target Node 24 and Bun. Public TypeScript declarations are included.

```js
const express = require('vexpress')
const app = express()

app.use(express.json())
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, query: req.query })
})
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({ error: error.message })
})
app.listen(3000)
```

ES modules can use `import express, { Router, json } from 'vexpress'`. The default
export creates a callable application accepted by `http.createServer`. This is
an Express 5 counterpart: route syntax follows vpath-to-regexp 8.x and rejected
handler promises enter error middleware. Express 4's removed APIs are not added.

## API and compatibility

- Applications: `use`, all runtime HTTP method names in lowercase, `all`,
  `route`, `param`, settings (`set`, `get`, `enable`, `disable`, `enabled`,
  `disabled`), `engine`, `render`, `listen`, and mounted sub-applications.
- Requests: headers, negotiation, ranges, body/type detection, URL/query/path,
  route parameters, proxy-aware IP/hostname/protocol, freshness and XHR getters.
- Responses: status, headers, send/JSON/JSONP, cookies, negotiation, redirects,
  files/downloads, attachments, links, and view rendering.
- Exports: `application`, `request`, `response`, `Router`, `Route`, and the
  `json`, `raw`, `text`, `urlencoded`, and `static` middleware factories.

Mutable application/request/response prototypes, method overrides, sub-app
inheritance, custom query/ETag functions, custom view engines, and registration
order remain available. The default query parser is simple; extended query
parsing is opt-in. The default weak ETag and `X-Powered-By: Express` header are
preserved for compatibility; `app.disable('x-powered-by')` disables the header.
Cookie parsing, sessions, authentication and template engines remain separate
middleware supplied by the application.

The declarations use structural HTTP interfaces and compile without ambient
Node, browser or Undici declarations. They support Node HTTP consumers and typed
request/response bodies, but do not reproduce every ambient `@types/express`
extension or infer route parameter names from string literals. The generic order
for `RequestHandler` is params, response body, request body, query, locals. Default body
and query values remain permissive; types do not validate incoming data.

## Improvements and deliberate differences

- **Binary responses:** every ArrayBuffer view sends exactly its visible bytes.
  DataView and multi-byte typed arrays retain byte offsets and lengths, with
  correct Content-Length and ETags. Upstream can truncate typed-array elements
  or send an empty DataView. Buffer behavior remains unchanged.
- **Response framing:** `send` removes an existing Content-Length when
  Transfer-Encoding is present. Bodyless 204/205/304 responses remove Trailer
  with transfer framing. Generated redirects remove streaming/trailer headers
  and honor bodyless statuses. This is not a general-purpose HTTP compressor.
- **Configuration:** invalid ETag, query-parser and proxy settings are compiled
  before publication, leaving the previous value/function pair intact on
  validation failure. Numeric proxy hop counts must be nonnegative safe integers.
- **Registration:** nested handler arrays are validated iteratively. Cycles and
  invalid later handlers leave no partial registration; ordinary middleware
  groups compile their mount path once. Mounted-app metadata and mount events
  are published after successful layer registration. A mount listener sees the
  whole newly registered group; arbitrary user getter/event side effects cannot
  be rolled back. Explicit `app.route(path)` still creates a route immediately.
- **Options and headers:** `sendFile` and `render` accept frozen options without
  writing into them. File-response headers, including arrays, are snapshotted
  before asynchronous I/O; download options are copied. Options, response header
  objects, request `get`/`header` lookups, and `format` defaults use own fields.
  Passing options through inherited properties is no longer supported by these
  copying APIs. This does not change deliberate application-settings inheritance.
- **View engines:** the built-in View settles its callback once, preserves async
  delivery for synchronous completion, and ignores duplicate callbacks or a
  synchronous throw after completion. A throw before completion reports an error.
  User-supplied replacement View classes retain responsibility for their contract.
- **Caller optimizations:** three exact, canonical UTF-8 Content-Type strings
  avoid redundant parsing/formatting. Other spellings and parameters still take
  the existing parser. Built-in ETags hash short UTF-8 strings directly; custom
  ETag functions still receive Buffers, and large bodies share one encoding.
  Response method overrides remain observable.
- **Application construction:** a specialized descriptor copy assigns ordinary
  data properties directly when the new function has no such property anywhere
  in its prototype chain. Accessors, special attributes and inherited properties
  still use descriptor definitions; proxy sources and custom function prototype
  chains use `vmerge-descriptors`. Current descriptors are read on every creation,
  preserving symbols, method overrides and changes between applications. Nothing
  is cached from public prototypes, and settings/handler validation stays intact.

The [dependency packages](../../IMPROVEMENTS.md#package-comparison) retain their
documented differences. These include strict quality weights (`0.5`, not `.5`),
valid media wildcards, strict form limits, fixed JSON strict-mode errors,
null-prototype route parameters, and stronger file/conditional-request checks.
Applications relying on malformed inputs or exact upstream error wording need
to account for those differences.

## Dependency and release boundary

All **28 direct** and **39 total external** runtime dependencies are VPM packages.
The locked upstream comparison graph has 64 distinct external package names
(68 installed copies); the corresponding VPM tree uses 25 fewer package names.
Runtime-provided `node:*` modules are not external packages. Template engines and
optional application middleware are outside that count. The package has no
dependency on `express` or `@types/express`.

The installable archive contains thirteen files: entry point, seven implementation
files, declarations, package metadata, README, license and provenance. Tests,
benchmarks, upstream sources and their test-only dependencies are excluded.
See [PROVENANCE.json](PROVENANCE.json) and [LICENSE](LICENSE) for the verified
Express source and MIT attribution.

## Validation

```sh
# From the repository root
bun install --frozen-lockfile
node --test packages/vexpress/test/*.test.cjs
bun test packages/vexpress/test
npm run typecheck
npm --prefix scripts/express-conformance ci --ignore-scripts
node scripts/express-conformance/run.cjs
bun scripts/express-conformance/run.cjs
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

46 local regression tests cover the changes above, including descriptor parity,
live prototype edits, inherited setters, proxy fallbacks and isolated app state.
The pinned upstream suite
executes **1,261 tests on Node 24**, including its example-application acceptance
tests. **1,242 pass unchanged**; 19 use explicit assertions for documented VPM
dependency diagnostics (error messages and strict-JSON wording, not outcomes). No upstream tests are skipped on Node 24. Bun 1.4.0 runs
1,255 with six pending runtime limitations reproduced against unchanged Express:
two overlong filesystem paths, three non-chunked transfer-coding cases, and one
invalid header containing a newline. The [conformance harness](../../scripts/express-conformance/README.md)
records every adaptation and provides unadapted/control commands.

The shared integration gate runs HTTP checks, replacing
Express itself in Functions Framework 5.0.2 and firebase-functions 7.4.0 as well
as the dependency packages. npm/Bun archive consumers check CJS/ESM imports and
TypeScript 7 without ambient platform types. These fixtures do not deploy VPM
into the production application.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

```sh
node packages/vexpress/bench/compare.cjs
bun packages/vexpress/bench/compare.cjs
node packages/vexpress/bench/http.cjs
bun packages/vexpress/bench/http.cjs
STARTUP=1 node packages/vexpress/bench/compare.cjs
STARTUP=1 bun packages/vexpress/bench/compare.cjs
```

Both harnesses compare pinned Express 5.3.0, unchanged Express with VPM
dependencies, and vexpress. `COUNT` adjusts iterations and `OUTPUT` saves all
samples. Component measurements include synthetic request/response allocation
and completion checking, excluding network I/O. The HTTP harness includes the
local client and network with eight concurrent keep-alive connections; batch
time per completed request is not individual request latency. Results are
workload-specific and do not establish production throughput. `STARTUP=1`
replaces the middle control with the saved pre-optimization vexpress factory and
uses 5,000 calls for construction/registration. It retains all request cases.

### Initial results, 2026-10-28

Node 24.22.1 and Bun 1.4.0, macOS arm64. Each harness ran sequentially in
three fresh processes per runtime. Values below are the median of the three
per-process medians. Component cases use 12 balanced samples (all six orders
twice), 10,000 calls per sample or 1,000 for application creation/registration,
with corpus and case warmup. Results are retained in 256 slots and consumed
outside the timed loop. Debug output is disabled; outputs are checked for parity.

| Component operation | Node upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| create application | 24,211 → 25,340 | 8,628 → 8,771 |
| register one route | 33,828 → 34,586 | 14,322 → 13,467 |
| register 20 middleware | 61,408 → 38,132 | 39,735 → 17,057 |
| register route with 20 handlers | 54,608 → 36,671 | 34,901 → 16,949 |
| dispatch res.end | 1,217 → 1,104 | 982 → 773 |
| send short string with ETag | 3,074 → 2,485 | 2,809 → 2,142 |
| send short string without ETag | 2,106 → 1,785 | 1,952 → 1,470 |
| send JSON with ETag | 4,070 → 2,851 | 3,836 → 2,339 |
| send JSON without ETag | 2,791 → 2,135 | 2,833 → 1,767 |
| send Unicode string | 3,215 → 2,537 | 2,975 → 1,996 |
| send 4 KiB JSON | 8,766 → 7,404 | 8,048 → 6,580 |
| parameter plus query JSON | 5,162 → 4,346 | 4,587 → 3,088 |
| extended query JSON | 7,906 → 6,387 | 7,531 → 5,016 |
| 20 middleware then JSON | 7,436 → 5,454 | 6,122 → 4,571 |
| mounted application JSON | 5,525 → 4,133 | 4,556 → 3,184 |
| absolute URL plus JSON | 5,008 → 3,687 | 4,963 → 3,499 |
| negotiate and send JSON | 6,883 → 4,819 | 7,451 → 5,021 |
| set response headers | 1,324 → 1,264 | 1,021 → 1,121 |

JSON with ETags takes **28–31% less time on Node** and **38–40% less on Bun**
across the three processes. Without ETags, the ranges are **21–24%** and
**34–41%**. Parameter-plus-query responses take **15–22% less on Node** and
**31–33% less on Bun**. Group middleware registration takes **37–39% less on
Node** and **56–58% less on Bun**. The control using unchanged Express with
VPM dependencies is retained in every raw report, isolating the application's
changes from the already improved dependencies.

Before the construction follow-up below, Node application creation took
**3–6% more time**, and single-route registration took **0–3% more**.
Bun's header-only case ranges
from **16% faster to 10% slower**, with the aggregate median slower; it is noisy
and does not support a universal improvement claim. Creation and registration
are startup operations, while the response cases above measure request handling.

HTTP runs use 1,000 completed requests per sample, six balanced samples per
case and 200 warmup requests per implementation. Each row is **batch elapsed
microseconds per completed request**, including the client and loopback network,
with eight concurrent keep-alive connections. It is not a request-latency metric.

| HTTP workload | Node upstream → VPM (µs/request) | Bun upstream → VPM (µs/request) |
| --- | ---: | ---: |
| GET JSON | 61.17 → 57.23 | 43.72 → 42.76 |
| GET parameter/query JSON | 59.68 → 56.46 | 44.09 → 41.50 |
| POST JSON parse and echo | 68.15 → 65.05 | 57.31 → 54.43 |

Node's per-process HTTP improvement ranges are **4–8%** for GET JSON, **4–8%**
for parameters/query, and **5–7%** for JSON parsing and echo. Bun ranges from
**0–8%**, **2–7%**, and **2–7%**, respectively. Client/network overhead and runtime
variation are included, so these gains are smaller than the component results
and should not be projected onto arbitrary applications.

[The twelve initial raw reports](bench/results) include samples, runtime metadata,
checksums, VPM source hashes at measurement time and the comparison lockfile hash.

### Application construction follow-up, 2026-10-28

The initial startup regression measured warm `express()` calls after module
loading, not Node process launch or cold imports. Copying EventEmitter and
application properties dominated that work. The specialized copy above avoids
general descriptor definitions for ordinary new data properties, while retaining
live descriptor inspection and the general fallback. No configuration compilation
or handler validation was removed.

`STARTUP=1` compares upstream Express, the exact previous factory from `b58bd90`,
and the optimized factory. Before/after share the same application, request,
response and dependency implementations. The saved factory and provenance hash
make the control reproducible. Three fresh processes per runtime use 12 balanced
samples, 5,000 construction/registration calls and 10,000 request calls per sample.
Runtime, platform, warmup, retention and parity checks match the initial harness.

| Operation | Node before → after (ns) | Bun before → after (ns) |
| --- | ---: | ---: |
| create application | 25,207 → 12,881 | 8,428 → 7,380 |
| create and register one route | 33,506 → 20,837 | 12,473 → 11,446 |
| create and register 20 middleware | 37,662 → 24,869 | 15,785 → 15,205 |
| create and register route with 20 handlers | 36,585 → 23,252 | 14,557 → 13,616 |

Application construction takes **48–49% less time on Node** and **9–13% less on
Bun** than the previous factory. Against upstream Express in these same runs,
it takes **46–48% less on Node** (24,563 → 12,881 ns) and **7–11% less on Bun**
(8,266 → 7,380 ns). Single-route setup takes **38–39% less on Node** and
**5–10% less on Bun** than before.

The request controls do not establish a further request-handling improvement.
Node before/after changes range from 4% faster to 5% slower; absolute-URL JSON
is consistently 1–5% slower and parameter/query JSON is 0.4–1.5% slower. Bun
varies more: direct `res.end` ranges from 9% faster to 18% slower, 20-middleware
JSON from 3% faster to 17% slower, and mounted-app JSON from 2% faster to 11%
slower. These costs and variation are retained alongside the construction gain.
Every Node request case remains faster than upstream in these runs; Bun's
header-only case remains mixed. The initial loopback HTTP results above are
historical and were not remeasured for this construction-only change.

[Six follow-up reports](bench/results) named `startup-node-{1,2,3}.json` and
`startup-bun-{1,2,3}.json` retain all 18 cases, raw samples, checksums and hashes.
