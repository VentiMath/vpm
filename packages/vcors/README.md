# vcors

CORS middleware for Express-style applications, compared with `cors` **2.8.5
and 2.8.6**. Static policies are compiled once, origin regexes have isolated
state, callbacks settle once, and generated preflight responses have coherent
empty-body framing. Supports Node.js 24+ and Bun; benchmarks target Node 24 and Bun.

```js
const cors = require('vcors')
const express = require('vexpress')
const app = express()

app.use(cors({
  origin: ['https://ventimath.com', /^https:\/\/preview\.example\.com$/],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 600
}))
```

ES modules use `import cors from 'vcors'`. TypeScript declarations are included
and compile without ambient Node, browser or Undici types.

## API

`cors(options?)` returns `(request, response, next) => void`. With no options it
allows `*`, advertises `GET,HEAD,PUT,PATCH,POST,DELETE`, reflects requested headers
on OPTIONS, and completes OPTIONS with status 204 and `Content-Length: 0`.
Other requests continue through `next()`.

| Option | Values and behavior |
| --- | --- |
| `origin` | String, boolean, RegExp, readonly/nested arrays of strings/RegExps, or callback. Default `'*'`; explicit `false`, `null`, `undefined` or `''` disables CORS. `true` reflects the request origin. A fixed string emits that string; an allowlist emits only matching request origins. |
| `methods` | Comma-separated HTTP tokens or a readonly array. Method names retain their case. |
| `allowedHeaders` | Comma-separated tokens or a readonly array. Omitted: reflect `Access-Control-Request-Headers`. Empty string/array: emit no allowed-header grant. |
| `headers` | Legacy alias used when `allowedHeaders` is null/undefined. |
| `exposedHeaders` | Comma-separated tokens or a readonly array. |
| `credentials` | Boolean; only `true` emits `Access-Control-Allow-Credentials: true`. |
| `maxAge` | Nonnegative safe integer seconds or a decimal integer string, including zero. |
| `preflightContinue` | Boolean; default false. When true, OPTIONS continues without ending or changing body framing/status. |
| `optionsSuccessStatus` | Integer 200–299; default 204. |

Origin callbacks use `(origin, callback)` and settle with `callback(error, policy)`.
The origin can be undefined for requests without an Origin header. The returned
policy accepts the static origin forms above, including false to decline CORS.
An options delegate uses `(request, callback)` and settles with
`callback(error, options)`. Delegates can change policy per request. Both APIs
are callback-based; return values and returned promises are not used.

Static options and arrays are snapshotted when middleware is created. Change
policy through a delegate or create new middleware. A delegate's result is
validated/snapshotted per request. Own option properties are read once; inherited
options and unknown fields are ignored. Request headers use Node's lowercase
header names and own-property lookup. Origin must be a string when present.

`Request`, `Response`, `Options`, `OriginCallback`, `OptionsDelegate` and
`Middleware` are structural types exported through the callable namespace.
`cors<MyRequest>(delegate)` preserves an extended request type. The response
contract is compatible with Node's ServerResponse, including `removeHeader`.

## Improvements and compatibility boundaries

- **Predictable regex matching:** private RegExp copies start at index zero for
  each match, preserving sticky semantics while avoiding alternating `/g` and
  `/y` decisions. Original `lastIndex` and arrays are untouched. Nested arrays
  are handled iteratively, and cycles/invalid entries fail explicitly. Large
  string allowlists use private Sets for exact matching.
- **Configuration validation:** configured header lists contain HTTP tokens.
  A reflected `Access-Control-Request-Headers` is echoed as cors echoes it,
  checked only for characters a header cannot carry, so an unusual client list
  cannot fail the preflight. Reflected strings cannot inject line
  breaks/control characters. Flags are booleans,
  preflight statuses are successful integers, and max ages have complete numeric
  syntax. Static errors throw at creation; delegated/reflected errors reach
  `next(error)`. Invalid reflected fields are checked before CORS header writes.
  Arbitrary failures in user-provided response methods cannot be rolled back.
- **Once-only callbacks:** duplicate/reentrant provider completions are ignored.
  Synchronous provider throws before completion reach `next(error)`; synchronous
  provider throws after completion are ignored. Asynchronous failures must use
  the callback's error argument. Exceptions from downstream middleware propagate unchanged instead
  of causing a second `next()` call.
- **Cache variation:** dynamic origin callbacks and options delegates emit
  `Vary: Origin` on successful decisions, including a false/disabled decision.
  This avoids reusing an origin-dependent denial as though it were independent
  of the origin. Delegates that depend on other request headers must arrange
  the corresponding additional Vary fields themselves. `vvary` preserves
  existing values, including malformed ones set elsewhere, and avoids duplicate writes. With an absent Vary header,
  vcors writes its known valid field names directly; exact existing matches and
  `*` need no merge. Other existing values go through vvary's merge.
- **Preflight framing:** a middleware-generated empty response removes existing
  Transfer-Encoding, Trailer and Content-Encoding, then sets Content-Length to
  zero. Continued preflights retain the caller's framing and status.
- **Explicit empty headers:** `allowedHeaders: ''` disables reflection, matching
  an empty array. Upstream treats an empty string as absent and can reflect the
  request's header list. The legacy `headers` alias does not override an explicit
  empty list/string.
- **Less per-request work:** static settings and header arrays are prepared once;
  requests do not clone the options object or construct nested header plans.
  Both upstream versions use `object-assign` and `vary`; vcors uses only `vvary`.

Common upstream behavior remains: all OPTIONS requests are treated as preflight,
including ones without an Origin header; exposed headers are also emitted on
preflight. An allowlist mismatch omits the origin grant but continues ordinary
requests. CORS controls browser access to responses, so the handler still needs
its own authentication and authorization. It does not clear grant headers set
by earlier middleware; compose a single authoritative policy for a route.

A wildcard with `credentials: true` stays a wildcard; vcors never silently
broadens it into reflected origins. Browsers do not permit credentialed sharing
with that combination. Use explicit allowed origins when credentials are needed.
See the [Fetch CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
and [upstream API](https://expressjs.com/en/resources/middleware/cors/).

## Verification and packaging

```sh
node --test packages/vcors/test/*.test.cjs
bun test packages/vcors/test
npm run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

The package runs **39 unmodified upstream tests** and **30 additional regression
tests** on Node and Bun. Original source/test hashes and test-helper licenses
are recorded in [PROVENANCE.json](PROVENANCE.json). The upstream tests use the
built-in runner through a registration adapter; no assertions are changed.

The shared consumer fixture pins cors 2.8.6 and replaces it with vcors before
Firebase Functions loads. Its HTTP checks include CORS
reflection, repeated global-regex decisions, callback denial, duplicate callbacks
and preflight framing. This verifies adoption in isolated consumers; it does not
deploy VPM into the application.

The six-file installable archive contains code, declarations, package metadata,
README, license and provenance, with only `vvary` as a runtime dependency.
Upstream comparisons, test helpers, tests and benchmarks are excluded. Both npm
and Bun archive consumers exercise CJS/ESM runtime imports and TypeScript 7.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

```sh
node packages/vcors/bench/compare.cjs
bun packages/vcors/bench/compare.cjs
```

`COUNT` controls request iterations; `OUTPUT` saves raw results. The harness
compares cors 2.8.5, cors 2.8.6 and vcors using synthetic HTTP objects. Results
include allocation, a completion assertion and retention in 256 slots, consumed
outside timing. Outputs are checked for parity; the denial row explicitly permits
vcors's additional Vary header. These measurements are not HTTP throughput or
cold process startup measurements.

### Results, 2026-10-28

Node 24.22.1 and Bun 1.4.0 on macOS arm64. Three fresh processes per runtime,
run sequentially, with 12 balanced samples (all six orders, twice). Request rows
use 50,000 calls per sample; factory and factory-plus-first-request rows use
10,000. Corpus warmup is min(iterations, 5,000), followed by case warmup of
min(iterations, 20,000). Values below are medians of the three process medians.
The table uses 2.8.6; the raw reports retain both upstream versions.

| Operation | Node cors 2.8.6 → VPM (ns) | Bun cors 2.8.6 → VPM (ns) |
| --- | ---: | ---: |
| create default middleware | 16 → 15 | 15 → 19 |
| create configured middleware | 16 → 702 | 18 → 536 |
| create configured and handle first GET | 753 → 1,171 | 901 → 1,000 |
| default GET | 257 → 199 | 363 → 167 |
| reflect origin GET | 454 → 310 | 561 → 225 |
| fixed origin GET | 446 → 307 | 572 → 227 |
| four origin allowlist GET | 475 → 319 | 580 → 237 |
| 250 origin allowlist GET | 2,508 → 321 | 1,580 → 238 |
| RegExp origin GET | 468 → 332 | 573 → 229 |
| disabled GET | 65 → 36 | 154 → 43 |
| origin callback GET | 456 → 333 | 555 → 284 |
| origin callback denial GET | 83 → 213 | 175 → 212 |
| options delegate GET | 572 → 530 | 688 → 404 |
| default OPTIONS | 723 → 669 | 894 → 603 |
| reflected headers OPTIONS | 1,284 → 999 | 1,456 → 910 |
| configured OPTIONS | 1,250 → 1,041 | 1,570 → 989 |
| continued OPTIONS | 1,193 → 789 | 1,523 → 687 |
| existing Vary GET | 502 → 453 | 694 → 512 |
| missing origin GET | 354 → 176 | 497 → 126 |

Across the three processes, default GETs take **22–23% less time on Node** and
**50–55% less on Bun**. Origin-reflecting GETs take **30–33% less on Node** and
**59–61% less on Bun**. Reflected-header preflights take **22% less on Node**
and **37–38% less on Bun**. A 250-origin allowlist takes **87% less on Node**
and **85–86% less on Bun**.

There are deliberate costs. Configured factory creation changes from **16 to
702 ns on Node** and **18 to 536 ns on Bun**, because vcors validates and compiles
all settings up front. Creating configured middleware and handling only one GET
is **55–56% slower on Node** and **1–14% slower on Bun**. Create middleware once
and reuse it across requests. Bun's default factory also takes about 4 ns more in the
aggregate (9–25% more across processes).

Callback denial now emits a cache-correct Vary header that upstream omits. That
row therefore performs additional observable work: **83 → 213 ns on Node**
(150–160% more across processes) and **175 → 212 ns on Bun** (15–21% more).
The raw report labels this output difference explicitly. No universal performance
or production-throughput improvement is claimed.

[Six raw reports](bench/results) retain all samples, runtime metadata, consumed
checksums, source/fixture/dependency hashes and the exact harness hash.
