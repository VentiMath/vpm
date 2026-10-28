# VPM improvements

A central record of what VPM changes, why those changes matter, and the evidence
behind them. Comparisons use the specific upstream versions below. They do not
imply that every VPM package is faster, that upstream packages are insecure, or
that these replacements have already improved application performance.

## Package comparison

| VPM package | Compared with | Main improvements |
| --- | --- | --- |
| [vrouter](packages/vrouter) | router 2.2.0 | Isolated RegExp state, prototype-safe parameters, atomic handler registration, single-read thenables, and pathname-only dispatch. |
| [vdepd](packages/vdepd) | depd 2.0.0 | Private warning state, transparent function/constructor wrappers, correct inherited property writes, and safer stack capture. |
| [vpath-to-regexp](packages/vpath-to-regexp) | path-to-regexp 8.4.2 | Span-based parsing, isolated compiled tokens, lossless parameter names, less decoding allocation, and validated route configuration. |
| [vproxy-addr](packages/vproxy-addr) | proxy-addr 2.0.8 | Single-pass candidate parsing, private numeric trust rules, direct mapped-address matching, complete zero prefixes, and strict configuration snapshots. |
| [vipaddr](packages/vipaddr) | ipaddr.js 1.9.1 / 2.5.0 | Single-pass parsing, bounded integer CIDR matching, isolated address state, direct mapped conversion, and preservation of IPv4-compatible IPv6 bits. |
| [vforwarded](packages/vforwarded) | forwarded 0.2.0 | Correct tab whitespace, a single output array, snapshotted request fields, own-header lookup, and explicit invalid-input errors. |
| [vee-first](packages/vee-first) | ee-first 1.1.1 | Once-only event dispatch, registration rollback, and cleanup under reentrant event hooks. |
| [von-finished](packages/von-finished) | on-finished 2.4.1 | Private callback queues, async resources released after dispatch, and more reliable socket-listener cleanup. |
| [vparseurl](packages/vparseurl) | parseurl 1.3.3 | Private caches, frozen-request support, cache keys isolated from mutable results, and explicit invalidation. |
| [vencodeurl](packages/vencodeurl) | encodeurl 2.0.0 | Repairs consecutive unpaired surrogates, incomplete percent escapes, and accidental double encoding. |
| [vescape-html](packages/vescape-html) | escape-html 1.0.3 | Skips long unchanged spans while preserving the exact escaping and coercion contract. |
| [vstatuses](packages/vstatuses) | statuses 2.0.2 | Strict numeric strings, immutable status data, and prototype-free dictionaries. |
| [vms](packages/vms) | ms 2.1.3 | Symmetric negative rounding, consistent plurals, and errors that do not serialize invalid inputs. |
| [vdebug](packages/vdebug) | debug 4.4.3 | Compiled namespace filters, monotonic elapsed timing, coherent filter snapshots, and native terminal color detection. |
| [vfinalhandler](packages/vfinalhandler) | finalhandler 2.1.1 | Once-only responses, checks after request draining, consistent HTTP framing, integer statuses, and copied error-header arrays. |
| [vhttp-errors](packages/vhttp-errors) | http-errors 2.0.1 | Five runtime dependencies reduced to one, integer statuses, own-property copying, subclass preservation, and one factory stack capture. |
| [vetag](packages/vetag) | etag 1.8.1 | Compatible native one-shot hashing, byte-array views, exact bigint metadata, and validated stat inputs. |
| [vfresh](packages/vfresh) | fresh 2.0.0 | Quoted-comma ETags, strict tag syntax, header arrays, and case-insensitive no-cache handling outside quoted extensions. |
| [vrange-parser](packages/vrange-parser) | range-parser 1.2.1 | Complete numeric syntax, safe bounds, oversized suffixes, and stable combined-range ordering. |
| [vmime-db](packages/vmime-db) | mime-db 1.54.0 | Immutable records and extension arrays, prototype-free dictionaries, precise types, and a verified data snapshot. |
| [vmime-types](packages/vmime-types) | mime-types 3.0.2 | Correct charset parameter recognition, immutable mappings, and prepared default Content-Type strings. |
| [vsend](packages/vsend) | send 1.2.1 | Strong conditional checks, GET-only ranges, validated option snapshots, and guarded file-stream cleanup. |
| [vserve-static](packages/vserve-static) | serve-static 2.2.1 | Redirects preserve shared URL caches, configuration is validated and snapshotted at startup, and generated responses clear incompatible headers. |
| [vcontent-type](packages/vcontent-type) | content-type 2.1.0 | Independent null-prototype parameter maps, validated offsets and input types, and span-based quoted-string processing. |
| [vmedia-typer](packages/vmedia-typer) | media-typer 1.1.1 | ASCII validation before lowercasing, consistent suffix round trips, and complete subtype length enforcement. |
| [vtype-is](packages/vtype-is) | type-is 2.1.0 | Case-insensitive matching, validated patterns and body indicators, own-header reads, and an entirely VPM dependency tree. |
| [vnegotiator](packages/vnegotiator) | negotiator 1.1.0 | Validated quality values, parameter specificity, stable duplicate ordering, and one parse per offered value. |
| [vaccepts](packages/vaccepts) | accepts 2.0.0 | Validated offers even without Accept, distinct empty-header behavior, coherent replacement headers, and VPM negotiation throughout. |
| [vbytes](packages/vbytes) | bytes 3.1.2 | Complete-input parsing that fails explicitly on invalid limits, exact decimal scaling, validated format options, and literal group separators. |
| [viconv-lite](packages/viconv-lite) | iconv-lite 0.7.3 | Complete encoding tables, corrected multibyte/UTF-7 chunk boundaries, safer option and stream lifecycles, and removal of safer-buffer. |
| [vraw-body](packages/vraw-body) | raw-body 3.0.2 | Premature-close settlement, strict byte counts, earlier length rejection, controlled chunk/decoder errors, and an entirely VPM dependency tree. |
| [vqs](packages/vqs) | qs 6.17.0 | Zero runtime dependencies, native percent encoding, validated numeric limits, no parameter-limit wraparound, and wide-array serialization without variadic calls. |
| [vonce](packages/vonce) | once 1.4.0 | Private call state, read-only status, descriptor-safe callback metadata, symbol support, and removal of wrappy. |
| [vmerge-descriptors](packages/vmerge-descriptors) | merge-descriptors 2.0.0 | Symbol descriptors, explicit object/boolean contracts, and handling of source keys removed during copying. |
| [vcookie-signature](packages/vcookie-signature) | cookie-signature 1.2.2 | Compatible HMAC signatures, fixed-size timing-safe verification buffers, early malformed-input rejection, and self-contained key types. |
| [vvary](packages/vvary) | vary 1.1.2 | Correct tab handling, validated old/new fields, single-read arrays, fewer duplicate writes, and scalable list merging. |
| [vcookie](packages/vcookie) | cookie 0.7.2 / 2.0.1 | Isolated cookie maps, single-read attributes, genuine Date serialization, safe integer ages, and modern APIs alongside Express compatibility. |
| [vcontent-disposition](packages/vcontent-disposition) | content-disposition 2.0.1 / 3.0.0 | Isolated parameter maps, strict input contracts, case-insensitive duplicate checks, and faster filename creation and long quoted parsing. |
| [vbody-parser](packages/vbody-parser) | body-parser 2.4.0 | Compressed-request abort handling, safe form bounds, validated option snapshots, nonmutating callback errors, and an entirely VPM dependency tree. |
| [vundici-types](packages/vundici-types) | undici-types 6.21.0 | Four Fetch signature fixes, complete original API coverage, and a focused web-types entry point. |
| [vnode-types](packages/vnode-types) | @types/node 22.20.5 | Complete Node 22 declarations using VPM web types, a smaller loaded compiler graph, and compatibility for legacy Node type references. |

Every runtime package includes TypeScript declarations, CommonJS and ES module import
support, an explicit Node.js 20+ baseline, tests exercised on Node.js and Bun,
and documented origins and licenses. Consumers do not need a separate types
package. The two declaration-only packages have separate Node API and compiler
baselines, described below. Test fixtures and benchmarks stay out of installable archives.

Most runtime replacements preserve their dependency counts. Both versions of
each utility have zero external runtime dependencies, except
`on-finished` / `von-finished`, `debug` / `vdebug`, `negotiator` / `vnegotiator`, and `mime-types` /
`vmime-types`, which each declare one,
`accepts` / `vaccepts` and `proxy-addr` / `vproxy-addr`, which each declare two,
`type-is` / `vtype-is`, which each declare three,
`serve-static` / `vserve-static`, which each declare four,
`finalhandler` / `vfinalhandler`, which each declare six,
`body-parser` / `vbody-parser`, which each declare nine,
`send` / `vsend`, which each declare eleven, and `http-errors` /
`vhttp-errors`, which declare **five and one**, respectively; and
`iconv-lite` / `viconv-lite`, which declare **one and zero**, and
`raw-body` / `vraw-body`, which declare **four and three**; and
`qs` / `vqs`, which declare **two and zero**; and
`once` / `vonce`, which declare **one and zero**; and
`router` / `vrouter`, which declare **five and three**.
`von-finished` replaces `ee-first` with `vee-first`, and `vdebug` replaces `ms`
with `vms`. Upstream `debug` also tries to load its optional peer `supports-color`;
`vdebug` uses built-in terminal detection instead. Built-in Node.js modules are
not external packages.

`vrouter` uses three direct VPM dependencies (`vdebug`, `vdepd`,
and `vpath-to-regexp`), with `vms` bringing its external tree to four packages.
Its thenable inspection is inline; it does not depend on `is-promise`.

`vsend` uses eleven direct VPM dependencies, with `vee-first` and `vmime-db`
bringing its complete external dependency tree to thirteen VPM packages.
`vserve-static` completes the modern static-file path with four direct and fifteen
total external VPM dependencies. Its dependencies are all existing VPM packages.
`vtype-is` uses `vcontent-type`, `vmedia-typer`, and `vmime-types` directly,
with `vmime-db` bringing its complete external tree to four VPM packages.
`vaccepts` also has four total external dependencies: `vnegotiator`,
`vcontent-type`, `vmime-types`, and `vmime-db`.
`vraw-body` uses `vbytes`, `vhttp-errors` and `viconv-lite`, with `vstatuses`
bringing its complete external dependency tree to four VPM packages.
`vqs` eliminates qs's full tree of **18 distinct external runtime packages**,
using native Map, WeakMap and Object.defineProperty. Other application packages
may still need some of those upstream helpers.
`vbody-parser` uses nine direct and fifteen total external VPM dependencies,
combining the existing body, codec, form, media-type, error and lifecycle packages.

## The target dependency graph

VPM's targets come from [ventimath](https://github.com/johnclyde-org/ventimath-private)'s
Cloud Functions gen 2 HTTP path. The reproducible consumer fixture also tests
parent upgrades before choosing which dependencies to replace. Its current
upgrade target is Functions Framework 5.0.2 serving `firebase-functions` 7.4.0
`onRequest` handlers through Express 5.3.0, `body-parser` 2.4.0, `router` 2.2.0,
`send` 1.2.1, and `serve-static` 2.2.1. Updating this fixture does not update or
deploy the application. The fixture pins `qs` 6.17.0 within Express and body-parser's
declared ranges, replacing its earlier 6.16.1 resolution. The runtime packages above target the corresponding upstream
versions in this graph. The platform types instead come from VPM's development
dependencies. `jsonwebtoken` 9.0.3 reaches `ms`, and the proxy agents
under `firebase-admin` reach `debug`.

The fixture previously pinned Express 5.2.1 and `body-parser` 2.2.2, both of
which requested `content-type ^1.0.5`. Upgrading those parents to
[Express 5.3.0](https://github.com/expressjs/express/releases/tag/v5.3.0) and
[body-parser 2.4.0](https://github.com/expressjs/body-parser/releases/tag/v2.4.0)
removes 1.x and consolidates three installed copies into one `content-type`
2.1.0 shared by Express, body-parser, type-is, and negotiator. No parser override
is needed. An override alone would be incorrect: the old body-parser passes
the request object to `parse()`, while 2.x accepts a header string, causing
the old caller to silently lose charset information. This makes 2.x the
`vcontent-type` compatibility baseline. The newer
[content-type 3.x](https://github.com/jshttp/content-type/releases/tag/v3.0.0)
requires Node 22 and is ESM-only; current consumers request 2.x, and VPM retains
its Node 20 and CommonJS contracts.

Three facts about that path shape the gate below. The framework disables
Express ETags on its own application, so conditional requests to plain handlers
never reach `etag` or `fresh`; Express applications deployed as handlers and
files served by `send` still use them. `firebase-functions` answers errors
thrown by a handler itself, with a structured log and a plain 500, so
`finalhandler` only serves Express applications. The framework's own
`body-parser` runs first, so an application's body limits are never consulted.

Express 4 is gone from that graph: `firebase-functions` 7.3.2 moved its only
Express use, the local development binary, to Express 5, so the fixture's upgrade
to 7.4.0 removed the nested branch (`finalhandler` 1.3.2, `send` 0.19.2,
`serve-static` 1.16.3, `fresh` 0.5.2, `debug` 2.6.9, `ms` 2.0.0, `mime-types`
2.1.35). Still not covered: `form-data` 2.5.5, reached only through
`@types/request` under `firebase-admin`'s `retry-request`, reads `mime-types`
2.1.35 with `mime-db` 1.52.0 and is never loaded at runtime, and the development
dependency `node-mocks-http` 1.17 still pins `fresh` 0.5.2, `range-parser` 1.2
and `type-is` 1.6. The gate reports such copies instead of aliasing them.

### The integration gate

[`scripts/integration.cjs`](scripts/integration.cjs) is a required CI job on
Node 20, 22, 24 and Bun. [`scripts/consumers`](scripts/consumers/package.json)
pins the consumer upgrade target above. The gate aliases
every VPM runtime package into every installed copy of its upstream, inside its own
process, then serves an `onRequest` handler and an Express application through
the Functions Framework, also serves a direct Express parser app, and runs 228
HTTP checks: RegExp route state and captures, prototype-named param callbacks,
merged parameters, single-read thenables, automatic HEAD/OPTIONS; Express redirect and router thenable deprecations with repeat-warning
suppression; route parameters, wildcards, optional groups, encoded and malformed URI
segments, array routes, mount boundaries, strict/case-sensitive routes, and
proxy address chains and Express `req.ip`/`req.ips` under disabled,
unrestricted, hop-count and subnet trust, including tab-separated proxies, mapped/native IPv6 boundaries and malformed addresses, and
stopping at untrusted hops; Express listen startup, followed by a late error, and EADDRINUSE
callbacks with state-shaped metadata; application mixins with symbol getters;
request media-type matching, uppercase and structured-suffix parser
patterns, response negotiation across all four Accept headers, invalid quality
weights, empty headers, parameter specificity, and `res.format()` including 406
responses and Vary/Content-Type headers; JSON bodies and malformed
bodies, exact/over-limit bodies with explicit lengths and chunked framing,
UTF-8 byte counts, gzip expansion and corruption, malformed limits and deliberate limit omission,
disconnected request settlement and raw-buffer verification callbacks,
large form limits without 32-bit truncation, frozen verifier errors and primitive reviver failures,
extended queries and nested form fields, duplicate fields, malformed percent
escapes, prototype guards, Latin-1 sentinels, query depth and parameter limits,
legacy and Unicode charset decoding, separately delivered GB18030/Big5/UTF-7 chunks,
UTF-16 decoding and unsupported charset rejection, weighted Accept
negotiation with quoted commas, preservation of Content-Type parameters when
Express changes the charset, CORS preflight, `res.set('Content-Type')` with syntax upstream
tolerated, conditional requests with quoted-comma tags and forced reloads,
redirect encoding and escaping, `sendFile` and `serve-static` with ranges,
HEAD, mounted-root redirects, static redirect/405 framing, download and empty-file
callbacks, Unicode/quoted/percent/control-character download and attachment filenames,
plain/Unicode/JSON/signed cookies, expiration and clearing, custom encoding,
duplicate request cookies and rejected header injection, signed-cookie verification
and tampering, tab-separated Vary fields, wildcard collapse and invalid Vary rejection,
extension fallback, dotfile policy,
strong preconditions, directory redirects, cache ages from duration strings,
thrown HTTP errors with headers, conflicting framing headers, an error after an accepted
404, `jsonwebtoken` expiry durations, and `DEBUG` output from each consumer
namespace. VPM exports are instrumented before their parents load, so transitive
calls count too. It fails if a target has no aliased installed copy or is never
reached; other versions are reported as uncovered. Dependency traversal includes
packages that hide their manifests through `exports`. The gate also requires
one shared `content-type` 2.x copy and verifies that all four callers are included.
Earlier per-package integration
scripts were replaced by this gate; the bugs that review found in
`vfinalhandler` and `vmime-types` were only visible through real consumers.

`vhttp-errors` keeps only `vstatuses`; native operations and local constructor
naming replace `inherits`, `setprototypeof`, and `toidentifier`. Invalid non-error
statuses normalize to 500, removing the associated deprecation behavior and
`depd`. Other packages in an application may still depend on those upstream helpers.

`vfinalhandler` connects all eight preceding VPM packages: six direct dependencies,
plus `vee-first` through `von-finished` and `vms` through `vdebug`. Its entire
external runtime dependency tree now consists of VPM counterparts.

## vfinalhandler

**Response correctness:** one accepted completion prevents duplicate writes and
error callbacks. Response state is checked again after request draining, avoiding
header writes after another writer has started or completed the response. Aborted
requests are not answered. A late error on a completed response preserves its
otherwise reusable connection; an error on a partial response closes it.

**Headers and statuses:** removes conflicting transfer encoding/trailer headers
before setting content length. Error headers cannot restore those fields or stale
content encoding/language headers. A stale Content-Range is cleared, while
explicit 416 error range metadata is retained for send/serve-static. Header arrays
are copied before draining.
Statuses must be integers from 400 to 599, and unknown codes receive a defined
phrase. Empty or unavailable pathnames get a readable fallback.

**Compatibility:** retains the callback API, production message hiding, HTML
formatting, HEAD behavior, HTTP/2 handling, and asynchronous error reporting.
Repeated accepted calls do not write again, but later errors are still passed
to `onerror`, so Express and connect keep logging them. Invalid error callbacks
fail at construction. All six
dependencies have VPM counterparts; their documented differences also apply.

**Evidence:** [30 tests](packages/vfinalhandler/test), including 480 differential
normal-response combinations and real HTTP/1 and HTTP/2 connections on Node and
Bun. Tests reproduce the upstream conflicting-framing failure and verify the
corrected response, upload draining, abort cleanup, and connection reuse. The
integration gate serves Express applications through it.

**Performance tradeoff:** full-stack microbenchmarks measured about 2–2.4 times
faster long-path 404 generation, but **19–33% slower short 404s** and **13–17%
slower production/HEAD errors**. Development-stack generation was 3–5% slower.
These measurements exclude socket I/O and request draining; they do not establish
application speed or security gains.
[Benchmarks, installation, and full compatibility notes](packages/vfinalhandler/README.md).

## vee-first

**Reliability:** a settled-state guard prevents duplicate or reentrant event
dispatch from calling the callback twice. If a `newListener` hook settles the
group during registration, the late listener is removed. The complete source
list is validated and snapshotted before subscriptions begin, and a registration
failure rolls back installed listeners. Cancellation remains idempotent.

**Compatibility:** retains the callback API, deferred callback assignment, event
arguments, and cancellation handle. Invalid source tuples, emitters, event names,
and callbacks now produce explicit `TypeError`s. Historical Node.js support is
replaced by the modern runtime baseline.

**Evidence:** [event and cleanup tests](packages/vee-first/test/first.test.cjs)
exercise duplicate sources, listener hooks, rollback, cancellation, and callback
errors. [API and compatibility details](packages/vee-first/README.md).
No throughput or memory improvement has been measured.

## von-finished

**Reliability and isolation:** uses `vee-first` for event selection and cleanup.
Callback queues live in a `WeakMap` instead of a message's `__onFinished` field.
As in `on-finished` 2.4, each queued callback runs in its own registration-time
`AsyncResource`; those resources are now released after dispatch. Finishing
before socket assignment removes the waiting socket listener. The first callback
is queued before subscription hooks can complete the message, and failed
registration rolls back subscriptions. Obsolete Node.js 0.8 socket patches and
runtime fallbacks have been removed.

**Compatibility:** retains the returned message, callback arguments, deferred
completion for finished messages, and tri-state `isFinished()` result. Invalid
callbacks fail immediately. Private `__onFinished` fields are unsupported.
A callback exception still stops later callbacks, matching upstream behavior.

**Evidence:** [lifecycle tests](packages/von-finished/test/finished.test.cjs)
cover async-context separation, reentrancy, delayed sockets, registration failure,
and real HTTP completion and client disconnects.
[API and installation details](packages/von-finished/README.md).
No application latency, throughput, or memory reduction has been measured.

## vparseurl

**Isolation and control:** separate private `WeakMap`s hold current and original
URL caches. Requests can be frozen or sealed, and unrelated `_parsedUrl` or
`_parsedOriginalUrl` fields cannot supply cached results. Cache keys are separate
from returned objects, so changing a result's `_raw` field cannot make it match a
different input. `clear(request)` discards both caches, and missing inputs discard
old entries. The common-path parser uses a character check and string search
instead of scanning every character in JavaScript.

**Compatibility:** preserves mutable legacy `Url` results, query strings, and the
parsing boundaries used by existing middleware. `serve-static` can still edit the
result before formatting a redirect. Clearing private request fields no longer
invalidates the cache; use `clear()`. Non-string current URLs, including pre-parsed
`Url` objects, are intentionally rejected. This remains a compatibility parser,
not a destination validator.

**Performance tradeoff:** the recorded measurements show much faster first parses
of long paths, but **slower first parses of short paths**. Cached reads are close
on Bun and somewhat slower on Node. The private cache adds lookup, allocation,
and insertion work; a universal speedup is not claimed.

**Evidence:** [cache and differential tests](packages/vparseurl/test/parse.test.cjs),
[reproducible benchmark](packages/vparseurl/bench/compare.cjs), and
[full measurements and compatibility notes](packages/vparseurl/README.md#performance).

## vencodeurl

**Correctness:** native UTF-16 repair handles consecutive unpaired surrogates
without throwing `URIError`. A non-consuming percent-escape check repairs a
trailing one-digit escape and preserves valid escapes next to invalid percent
signs.

| Input | encodeurl 2.0.0 | vencodeurl |
| --- | --- | --- |
| `'\uD800\uD800'` | Throws `URIError` | `'%EF%BF%BD%EF%BF%BD'` |
| `'%a'` | `'%a'` | `'%25a'` |
| `'%%20'` | `'%25%2520'` | `'%25%20'` |
| `'%2%20'` | `'%252%2520'` | `'%252%20'` |

**Compatibility:** preserves the function API, `String(value)` coercion, ordinary
URL character set, and existing percent escapes including their letter case.
The cases above intentionally differ. Whole-URL encoding does not validate a
destination or replace HTML escaping or query-component encoding.

**Performance tradeoff:** short ordinary URLs were about twice as fast in the
recorded Node and Bun runs. One workload containing many existing escapes was
about 24% slower on Node. Other workloads and runtimes have different results.

**Evidence:** [regression and differential tests](packages/vencodeurl/test/encode.test.cjs)
include all 65,536 UTF-16 code units, an independent byte encoder, generated
inputs, and HTTP header values. See the [benchmark](packages/vencodeurl/bench/compare.cjs)
and [full measurements](packages/vencodeurl/README.md#performance).

## vescape-html

**Performance and contract:** uses native regular-expression search to skip long
unchanged spans after an escape, while scanning short gaps and nearby escapes in
a simple loop. The initial match check avoids allocating a match array. This
targets the work upstream performs character by character after its first match.
The package adds declarations, a documented coercion contract, and extensive
compatibility tests. No upstream escaping bug was identified in this work.

**Compatibility:** preserves all five entities exactly, including `&#39;` for an
apostrophe. Existing entities are escaped again. Unicode, including unpaired
surrogates, stays unchanged. Input conversion remains `'' + value`, with its
default coercion hint, object conversion order, and Symbol rejection.

**Performance tradeoff:** long text with sparse escapes benefits most. Short and
dense inputs have smaller gains or regressions depending on the runtime. This
does not establish an application-level speedup or a stronger escaping guarantee
than upstream.

**Evidence:** [compatibility tests](packages/vescape-html/test/escape.test.cjs)
cover all UTF-16 code units, generated strings, scanner boundaries, reentrant
coercion, and long sparse and dense inputs. See the
[benchmark](packages/vescape-html/bench/compare.cjs) and
[full measurements](packages/vescape-html/README.md#performance).

## vstatuses

**Integrity and validation:** numeric strings must be exact three-digit codes.
Upstream's `status('200garbage')` returns `'OK'`; VPM rejects it. Status tables,
the code list, and their exported references are immutable, preventing one
consumer from changing another's results. Prototype-free dictionaries return
`undefined` for inherited names rather than exposing object properties. Types
describe readonly tables and the distinct numeric/string return contracts.

**Compatibility:** all status codes, reason phrases, and category flags remain
unchanged from 2.0.2. Numeric prefixes, padding, fractional strings, and whitespace
around codes are intentionally rejected. Code that changes upstream's shared
tables must keep its custom data separately.

**Performance tradeoff:** freezing tables adds lookup cost. Direct message lookup
was slower on both Node and Bun; numeric function calls were slower on Node and
faster on Bun in the recorded run. This is primarily an integrity improvement,
with no measured application speedup.

**Evidence:** [complete data and mutation tests](packages/vstatuses/test/status.test.cjs),
[benchmark](packages/vstatuses/bench/compare.cjs), and
[full measurements](packages/vstatuses/README.md#performance).

## vms

**Correctness:** `ms(-1500, { long: true })` changes from `'-1 seconds'` to
`'-2 seconds'`. Negative half-unit rounding mirrors positive rounding, and plurals
follow the rounded magnitude. Invalid-type errors no longer call `JSON.stringify`
on arbitrary values, avoiding `toJSON()` side effects and serialization failures.
Declarations distinguish parsing's possible `undefined` from formatting's string.

**Compatibility:** retains unit aliases, the 100-character parse limit, ordinary
positive formatting, and upstream year/week definitions. Negative half-unit
rounding intentionally differs. Invalid types and non-finite numbers now produce
a stable `TypeError` instead of upstream's variable serialization-based errors.

**Performance:** the final parser selects a scale from the validated unit's
initial letter. Recorded parsing cases were about 15–20% faster on Node, with
smaller gains on Bun; formatting was similar or faster. These are individual-call
measurements, with no startup, memory, or application-level improvement measured.

**Evidence:** [alias, rounding, and differential tests](packages/vms/test/ms.test.cjs),
[benchmark](packages/vms/bench/compare.cjs), and
[full measurements](packages/vms/README.md#performance).

## vdebug

**Matching and consistency:** compiles wildcard filters into literal chunks when
configuration changes. Readonly `names`, `skips`, and `namespaces` snapshots keep
cached logger decisions consistent; `enable()` updates the configuration.
Changing a logger's namespace refreshes its cached enablement. Elapsed differences
use a monotonic clock while `curr` and `prev` retain wall-clock timestamps.

**Dependencies and types:** uses `vms`, with no separate types package required.
Node's terminal capabilities replace the optional-peer `supports-color`
lookup, so incidental installed packages cannot change the chosen palette.

**Compatibility:** retains namespace patterns, exclusion precedence, formatting
hooks, sinks, extensions, Node inspection options, and browser storage/console
behavior. Direct filter mutation is unsupported. Invalid types fail explicitly;
enabled overrides accept boolean/null. Elapsed time is monotonic, color detection
can differ, and private upstream `src/*` imports are not exported.

**Performance tradeoff:** matching was faster in the recorded cases, including
large gains for repeated-prefix failures. Configuration was slower because it
compiles filters. Cached disabled calls were close on Node and slower in the Bun
sample; enabled calls without I/O were similar. No application throughput or
memory reduction is claimed.

**Evidence:** [matcher, lifecycle, Node, and browser tests](packages/vdebug/test/debug.test.cjs),
[benchmark](packages/vdebug/bench/compare.cjs), and
[full measurements and runtime notes](packages/vdebug/README.md#validation-and-performance).
The integration gate exercises all three replacements under Node and Bun.

## vhttp-errors

**Dependencies and behavior:** reduces five direct runtime dependencies to one,
`vstatuses`. Validates integer 4xx/5xx statuses, synchronizes status fields, and
copies only own enumerable string properties. Prototype-changing keys are ignored.
Named-constructor subclasses retain their prototypes; a private lookup prevents
export reassignment from redirecting factory calls. Factory construction avoids
a second stack capture.

**Compatibility:** preserves standard constructors, numeric aliases, Error
identity when annotating, descriptors, custom properties, and valid custom error
codes. Invalid statuses become 500 without deprecation warnings. Inherited
properties are no longer copied, and `isHttpError()` validates status integrity.

**Evidence and performance:** eleven tests cover every standard constructor and
the changed behavior. Factory benchmarks took 22–45% less time; **direct named
constructors took 14–40% more time**. The integration gate exercises JSON body
errors, thrown errors with headers, and final responses.
[Tests, measurements, and installation](packages/vhttp-errors/README.md).

## vetag

**Compatibility and inputs:** retains exact upstream body tags and metadata tag
format. Uses native one-shot hashing with a streaming-hash fallback, handles
Uint8Array views without modifying them, and accepts bigint/minimal stat objects.
Invalid sizes and dates fail explicitly instead of producing misleading tags.
No external runtime dependencies were added.

**Evidence and performance:** seven tests include 500 generated strings and byte
encodings, actual file metadata, sliced arrays, and the hashing fallback.
Short-text tags took 38–49% less time; larger Unicode inputs were close on Node
and about 9% faster on Bun. File metadata checks exclude disk I/O.
[Full results and compatibility notes](packages/vetag/README.md).

## vfresh

**Conditional response correctness:** parses commas inside quoted ETags, handles
optional whitespace and repeated fields, validates tag syntax, and respects
case-insensitive no-cache directives without matching inside unrelated quoted
values. Malformed tag lists return stale, including when an earlier member
matched. Retains fresh 2.0.0's tag-over-date precedence and existing date parsing.

**Evidence and performance:** eight tests include 448 upstream comparisons and
2,000 generated valid tag lists. The integration gate verifies real 304 and
forced reload responses. Single tags and dates were close in benchmarks; matching long
lists improved on Node, but **long lists were 21–33% slower on Bun**. Node's
no-cache check increased from 27 to 44 ns per call.
[Protocol references, tests, and full measurements](packages/vfresh/README.md).

## vrange-parser

**Parsing and ordering:** rejects partial numeric parses and malformed members,
clamps huge decimal values before arithmetic, normalizes range units, and treats
an oversized suffix as the entire nonempty representation. Combining includes
contained members when choosing the group's original input position.

**Compatibility:** retains ranges with a `type` property, `-1` for no selected
bytes, and `-2` for malformed syntax. Sizes must be safe non-negative integers.
Malformed members invalidate the entire header; reversed/out-of-bounds intervals
remain unsatisfiable. Empty representations still return `-1`.

**Evidence and performance:** eight tests include a 2,000-case byte-set model.
Real Express responses cover 206, 416, oversized suffixes, and malformed-range
fallback. Benchmarks were 5–16% faster on Node and **15–34% slower on Bun**.
[Full API, tests, and measurements](packages/vrange-parser/README.md).

## vmime-db

**Data integrity and provenance:** keeps all 2,522 upstream records byte for byte,
with a pinned source commit and checked SHA-256 digest. The runtime database,
records, and extension arrays are frozen. Null prototypes prevent inherited
names from appearing as data. Types explicitly allow missing keys and fields.

**Compatibility:** values and extension ordering match 1.54.0. Shared mutations,
record prototype methods, and the direct `db.json` package subpath are no longer
supported. Customization uses separate copies. The package adds no runtime
dependencies and makes no claim that its unchanged MIME assignments are better.

**Evidence and costs:** five tests verify complete data equality, provenance,
schema, immutability, and customization isolation. First-extension reads were
slower (13 → 15 ns on Node; 8 → 14 ns on Bun). Initial loading includes freezing
work; startup measurements and a manual data-update procedure are documented.
[Provenance, API, and measurements](packages/vmime-db/README.md).

## vmime-types

**Header correctness:** recognizes charset parameter names case-insensitively
and parses quoted values and escapes. Uppercase `CHARSET=ascii` no longer causes
a duplicate default; `note="charset"` no longer suppresses a missing default.
Malformed media types and parameters fall back to upstream's prefix handling,
since Express 5 passes every `res.set('Content-Type')` value through
`contentType()`. Shared mappings and exported methods are immutable.

**Compatibility and implementation:** preserves all 1,239 extension choices and
the default charset/extension data from 3.0.2 with database 1.54.0. Scoring runs
once per candidate, with upstream tie-breaking intact. Default Content-Type
strings are prepared once. Immutable exports are an
intentional difference; older MIME package mappings are not the baseline.

**Evidence and performance:** nine tests cover every type and extension, 4,000
generated paths, quoted parameters, invalid syntax, and mutation attempts.
The integration gate serves static files, `sendFile`, typed responses, and JSON
through it in Express 5.3.0 on Node and Bun. Content-Type from an
extension measured about **4.4× faster on Node and 12.3× faster on Bun**;
parameterized headers were **63–105% slower**, and full-path lookup was **13%
slower on Node**. These are microbenchmarks, not application throughput results.
[Full API, validation, benchmarks, and installation](packages/vmime-types/README.md).

## vsend

**HTTP behavior:** strong `If-Match` comparison handles quoted commas and
precondition precedence. `If-Range` requires an exact strong ETag or equal
modification date. Ranges apply only to GET and otherwise-200 responses, so HEAD
reports full length. Conditional non-GET requests can return 412 instead of 304.
Weak default stat tags remain weak and cannot satisfy strong comparisons.

**Delivery and options:** watches completion before filesystem work, handles
read errors before application stream hooks, stops after hooks finish a
response, and detects premature closure and short reads. Generated responses
remove conflicting framing headers. Supported options are validated and copied,
including inherited values required by Express; unrelated filesystem options
are not forwarded. Index candidates obey the dotfile policy, and non-regular
filesystem objects are rejected before opening.

**Compatibility and limits:** empty GETs do not open a file stream; a sender can
be piped once. Root validation remains lexical, symlinks are followed, and
stat/open are separate operations. Dates retain existing parsing and metadata
resolution limits. This is not an atomic file snapshot or a filesystem jail.

**Evidence and performance:** twenty-five tests cover differential HTTP cases,
failure paths, disconnections, and HTTP/2. The shared integration gate exercises
HTTP behavior through the pinned Functions Framework/Express stack on Node and
Bun, including downloads and sendFile callbacks. Its 416 check also exposed and
fixed dropped range metadata in `vfinalhandler`. Sequential localhost HTTP
measurements showed ordinary GETs **4–10% slower**, HEAD **10–12% slower**, and
304 responses **9–20% slower**;
the range case was within 3% of upstream. This release establishes correctness
changes and VPM composition, with no broad performance gain demonstrated.
[API, compatibility decisions, measurements, and installation](packages/vsend/README.md).

## vserve-static

**Configuration and redirect isolation:** snapshots supported options and arrays
at middleware construction, validates configuration before requests, and retains
inherited option support. Directory redirects format a copy of the parsed URL,
preserving its shared cache and allowing frozen cached results. Mounted paths and
queries retain their original redirect behavior.

**Response correctness:** redirects and 405 responses clear incompatible framing
and stale representation headers. HEAD redirects explicitly omit body bytes.
Completed or disconnected responses are left alone; partial responses are not
overwritten by a 405. Missing or unparseable URLs follow the selected
400/fallthrough policy. Errors after file selection and server errors still
reach `next(error)`.

**Compatibility and evidence:** seventeen tests include a differential matrix,
cache mutation reproduction, configuration changes, framing, error propagation,
multiple roots, and HTTP/2. The shared integration gate runs HTTP checks
through the Express 5 Cloud Functions stack with `vserve-static` installed by
process-local alias. Existing middleware no longer observes later configuration
mutations, and invalid options fail earlier. The `vsend` limitations still apply.

**Performance:** complete-stack GETs were **6–10% slower**, HEAD **4–15% slower**,
redirects **7–11% slower**, and missing files **5–12% slower** in one local run.
405 was close on Node and about 10% faster on Bun. A comparison using the same
VPM dependencies on both sides was mixed; no general speedup is established.
[Full API, compatibility notes, measurements, and installation](packages/vserve-static/README.md).

## vcontent-type

**Isolation and input contract:** parsed parameters have a direct null prototype
and are independent mutable dictionaries. Upstream 2.1.0 and 3.1.1 share an
intermediate prototype; modifying it can suppress parameters in later parses.
Tests reproduce that interference. Offsets must be bounded integers, parse flags
must be booleans, and headers, media types, and parameter values must be strings.
Formatting cannot return a coerced object or silently convert a number. Its own
errors do not echo invalid values. Exported methods are immutable.

**Compatibility:** preserves 2.1.0's lenient extraction, first-parameter wins,
case rules, quoted escapes, insertion-order formatting, and absolute offsets for
Accept lists. Results stay mutable for Express's charset updates. Parsing remains
an extractor, not a syntax validator. Ordinary inputs are checked against 3.1.1
too; no 1.x request-object parsing is provided. Both upstream and VPM have zero
runtime dependencies.

**Evidence:** fifteen tests include 20,000 generated headers, 3,000 round trips,
every byte in formatted parameter values, malformed input, all offsets in an
edge-case corpus, and shared-state interference. All 65 integration checks run
with `vcontent-type` substituted for Express, body-parser, type-is, and negotiator,
including UTF-16 decoding and quoted-comma Accept negotiation.

**Performance:** span processing and native searches substantially improve long
unescaped quoted values. Quoted-value formatting took **40–42% less time** than
2.1.0 in one local Node/Bun run. Short Node parsing cases were **10–63% slower**,
and the escaped-value case on Bun was **12% slower**. Against newer 3.1.1, short
Node parsing was **33–106% slower**, and Bun's escaped-value/Accept cases were
**28–31% slower**. There is no general application throughput gain established.
[API, compatibility decisions, both benchmark baselines, and provenance](packages/vcontent-type/README.md).

## vmedia-typer

**Consistent validation and formatting:** validates the original ASCII media
name before case conversion, rejecting Unicode `K` that 1.1.1 converts to `k`.
Formatting accepts all parsed subtype/suffix combinations, including earlier
plus signs, punctuation suffixes and an empty trailing suffix. It enforces the
127-character limit on the complete subtype rather than independently accepting
a 127-character subtype plus a suffix. Strict end assertions reject final line
terminators; fields require explicit strings. Exports are frozen and returned
records remain independent and mutable.

**Compatibility:** preserves the bare-name 1.x grammar, outer ASCII spaces,
case normalization and final-plus splitting. An explicitly empty format suffix
now preserves `+`, and invalid format field types no longer undergo coercion.
This targets the installed media-typer 1.1.1 API, not the ESM-only 2.x release.
There are no runtime dependencies.

**Evidence:** ten tests include every byte in each name position, 10,000
generated round trips and regressions for the observed differences. On one
Node 24.22.1 / Bun 1.4.0 run, validation cases took **11–18% less time on Node**
and **22–59% less on Bun**. Parsing took up to **7% longer on Node** and
**24–55% longer on Bun**. The consuming vtype-is uses validation, not parsing.
See the [package measurements](packages/vmedia-typer#validation-and-performance)
for all cases and the reproducible harness.

## vtype-is

**Matching and body indicators:** compares media names case-insensitively and
validates both expected and actual names. Invalid `text/@bad` no longer matches
`*/*`, and the original header media span is checked before Unicode case
conversion. Content-Length must be a decimal string; empty strings, negative
values, hex, exponent notation, arrays and null no longer indicate a body.
Only own lowercase Node-style header fields are read. A defined Transfer-Encoding
remains a presence check; HTTP framing belongs to the server.

**Compatibility and dependencies:** retains the callable request API, `.is()`,
`.hasBody()`, `.normalize()` and `.match()` used by Express and body-parser.
First-match strings, wildcard/suffix returns, empty-list behavior, variadic
patterns and `"0"` body indicators remain compatible. Malformed values and
inherited synthetic headers have documented stricter behavior. The baseline
is type-is 2.1.0, not the newer ESM class API in 3.x. Its three direct and four
total external dependencies are all VPM packages; counts are unchanged.

**Evidence:** thirteen tests include an upstream differential matrix and 20,000
generated matches. The shared HTTP integration checks run on Node and Bun with
these replacements installed alongside the rest of VPM. A required archive
gate installs the media-package dependency trees using npm and Bun, exercises CJS and ESM
on both runtimes, and checks TypeScript 7 consumers with no platform types.
On the same local run, extension/suffix/unmatched cases took **18–23% less time
on Node** and **45–50% less on Bun**. Node exact/invalid matching took
**13–15% longer**; standalone matching and body detection were slower on both
runtimes. The [full table](packages/vtype-is#validation-and-performance)
documents those costs. No application throughput improvement is claimed.

## vnegotiator and vaccepts

**Negotiation correctness:** vnegotiator validates decoded quality values as
complete decimals from 0 through 1 with no more than three fractional digits.
Malformed values such as `2`, `0.8junk`, empty values and `.5` become zero, so
specific invalid weights cannot gain preference through a broader wildcard.
More matching media parameters now mean greater specificity; exact zero
exclusions are respected. Charset labels compare without case, while other
parameter values compare exactly and parameter `*` is literal. Equally weighted
and specific duplicate entries keep their earliest header position.

**Wrapper behavior:** vaccepts preserves extension aliases and first-original
return values. Empty Accept headers no longer pick the first offer as if the
header were absent. Absent headers still validate offers, skipping unknown
extensions and malformed names. Its read-only `headers` view stays coherent
with the request used by its negotiator after header replacement. Both packages
read own lowercase header fields, accept string-array fields, avoid coercion,
and freeze their exports and method prototypes.

**Compatibility:** these target the actual consumer versions, negotiator 1.1.0
and accepts 2.0.0. They preserve callable/new-able constructors, Express-facing
methods, aliases, list/selection returns, encoding identity rules and upstream's
language fallback. The latter is not full RFC 4647 lookup. The generic parameter
parser remains tolerant: quoted numeric weights and first duplicate parameters
are retained. Strict decoded weights, exact parameter values, own-header rules,
empty Accept, invalid offers and the read-only headers view are documented
changes. Both complete dependency trees consist of existing VPM packages, with
the same counts as upstream.

**Evidence:** 25 tests include ordinary upstream differential matrices and
25,000 generated comparisons. The shared 96-request HTTP gate tests all
Express `req.accepts*()` methods and `res.format()`. Installed archives are
tested with npm, Bun, Node CJS/ESM and TypeScript 7, including public declarations
without platform types. Baseline source files, digests and licenses are retained
as test-only fixtures.

**Performance:** each offered value is parsed once rather than once per client
range, and output mapping no longer searches the full priority array. On a
sequential Node 24.22.1 / Bun 1.4.0 local run, a 16-range/16-offer media case took
**71–72% less time**. Smaller cases have mixed results. Negotiator's parameter
case took **118% longer on Node** and listing case **115% longer on Bun**.
Vaccepts' absent-header validation added about **185–215 ns/call**, and its
Node quoted-profile case took **127% longer**. See the complete
[negotiator](packages/vnegotiator#validation-and-performance) and
[accepts](packages/vaccepts#validation-and-performance) tables for all regressions
alongside gains. These measurements do not establish application throughput gains.

## vbytes

**Parsing and request limits:** replaces prefix parsing with complete decimal
syntax and rejects unsupported units, trailing junk, exponents and hex. Upstream
parses `100kbjunk` as 100 bytes and `1e3` as 1 byte. Invalid supplied values now
throw; only null/undefined return null. This distinction is deliberate:
`raw-body` 3.0.2 interprets null as unlimited, so returning null for a newly
rejected value could disable a limit. Both callback and promise callers must
allow for a synchronous validation exception. Ordinary `100kb`-style limits
retain their power-of-1024 meaning.

**Numeric correctness:** decimal strings scale exactly before rounding down to
whole bytes, including beyond binary floating-point precision. For example,
`0.99999999999999999999kb` produces 1023 instead of 1024. BigInt calculations
use at most 50 fractional digits; input scanning remains linear. Parsed integers
must fit within ±`Number.MAX_SAFE_INTEGER`. Numeric inputs retain their value,
including fractions, but non-finite/out-of-range inputs throw. Bare decimal
strings and explicit B suffixes now follow the same flooring rule as other
units; upstream instead truncates bare decimal strings toward zero.

**Formatting:** fixes trailing zeros after internal decimal zeros (`1.0100`),
treats dollar signs in thousands separators literally, and rejects invalid units
such as `constructor` instead of returning `NaNconstructor`. Option values are
validated, only own properties are read, and each is read once. Null option
values use defaults; `decimalPlaces: null` therefore uses 2 instead of upstream's
coerced 0. Scientific notation is retained without grouping its exponent.
Frozen exports and self-contained declarations are included. Both packages have
zero runtime dependencies; this change does not shrink the dependency count.

**Compatibility and evidence:** malformed sizes, unsupported format options,
inherited options, unsafe counts, and decimal edge cases deliberately change.
Consumers checking for a null invalid result must migrate to exception handling.
Tests include 12,000 generated rational-oracle parses, 30,000 generated formatting
comparisons, and a pinned, unmodified upstream fixture with source provenance.
All 108 HTTP checks pass with `vbytes` substituted into real `body-parser` and
`raw-body` calls: exact/over-limit JSON and binary requests, chunked framing,
UTF-8 byte lengths, gzip expansion, invalid limits, and omitted limits. The
archive gate installs packed packages through npm and Bun, runs both runtimes
with CJS/ESM, and compiles TypeScript 7 without platform declarations.

**Measured performance:** a sequential Node 24.22.1 / Bun 1.4.0 run on
2026-10-26 used seven alternating samples of 50,000 calls after warmup. Values
are median nanoseconds per call; the benchmark checks equal results first.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| Numeric parsing | 8 → 9 | 7 → 7 |
| Bare integer strings | 64 → 84 | 39 → 65 |
| Body-limit strings | 134 → 136 | 97 → 120 |
| Decimal unit strings | 158 → 180 | 91 → 156 |
| Decimal PB strings | 149 → 230 | 94 → 203 |
| Default formatting | 288 → 137 | 266 → 100 |
| Fixed-decimal formatting | 144 → 175 | 245 → 110 |
| Explicit-unit formatting | 291 → 287 | 252 → 180 |
| Grouped formatting | 625 → 296 | 514 → 208 |

Default/grouped formatting took approximately **52–62% less time**. Parsing
regressed in these samples, most visibly the exact fractional PB path (54% more
time on Node, 116% more on Bun); fixed-decimal formatting took 21% longer on
Node. These are microbenchmarks, not an application throughput result. Source,
commands, and the error contract are in [the package README](packages/vbytes).

## viconv-lite

**Encoding coverage and dependency:** preserves all 414 supported encoding names
and aliases from iconv-lite 0.7.3, all 81 single-byte mapping tables, and all
multibyte data. `safer-buffer` is replaced by native Node/Bun Buffer APIs, reducing
the external dependency count from one to zero. This is a derivative with
targeted changes; the upstream mapping tables are retained byte for byte. The
published npm archive and its integrity were checked against all 27 fixture files.

**Chunk correctness:** GB18030 decoding can lose a low surrogate, and Big5
decoding can lose a combining character, when the final byte arrives separately.
Output allocations now include pending input. Encoder allocations likewise
include pending surrogate and sequence state. UTF-7 and IMAP UTF-7 remember
whether shifted content preceded a terminator in another chunk, avoiding spurious
`+`/`&` output. CESU-8 incomplete endings no longer prepend a literal `0`, and
flushing resets their state. UTF-16BE buffers a split surrogate pair until complete.

**Ownership and streams:** automatic UTF-16/32 detection owns the input bytes it
retains and ignores empty chunks. Options are copied before encoders or streams
can modify them, permitting frozen objects and preventing later caller changes
from altering in-flight decoding. Stream collection completes once, removes its
listeners, and reports premature closure. Codec `defaultEncoding` is kept
separate from the native Transform option of the same name.

**Compatibility:** ordinary encoding/decoding results and the extension hooks
remain. Top-level encoding requires strings, decoding requires Buffer/Uint8Array,
and encoding names require strings; deprecated coercions are rejected. BOM options
are validated, only own enumerable options are copied, and recursive automatic
encoding defaults are rejected. Custom alias cycles throw. Corrected malformed
endings and chunk boundaries intentionally change output. Encoding hooks and
codec caches remain mutable; cached aliases must be cleared after definition
changes. Declarations work with TypeScript 7 without loading platform types and
infer native Buffer when the caller already has Node declarations.
The vraw-body type checks subsequently exposed an `any` inference through
`Buffer.prototype`; inference now uses `Buffer.alloc`'s return type, with
regression assertions for both packages.

**Evidence:** ordinary differential checks cover every supported alias. Exhaustive
single-byte tests exercise every byte and all 65,536 UTF-16 code units across
81 tables; multibyte tests cover a corpus containing every byte pair in seven
encodings. There are 3,200 generated malformed/chunked comparisons, split/BOM
matrices, stream lifecycle tests, and installed archive checks. The shared HTTP
gate now runs 120 requests, with this package used by real `body-parser` and
`raw-body`, including deliberately split GB18030, Big5 and UTF-7 bodies.

**Measured performance:** sequential local Node 24.22.1 / Bun 1.4.0 measurements
on 2026-10-26; median nanoseconds/call from seven alternating 50,000-call samples
after warmup. UTF-8/UTF-16LE use short strings; UTF-16BE/UTF-32BE and legacy-codec
cases use longer text. The [benchmark](packages/viconv-lite/bench/compare.cjs)
defines all inputs and checks equal results before timing.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| UTF-8 encode | 172 → 161 | 216 → 208 |
| UTF-8 decode | 314 → 307 | 182 → 174 |
| UTF-16LE encode | 181 → 140 | 100 → 94 |
| UTF-16LE decode | 313 → 283 | 129 → 119 |
| UTF-16BE encode | 1,254 → 241 | 911 → 348 |
| UTF-16BE decode | 2,160 → 2,419 | 1,859 → 1,862 |
| UTF-32BE encode | 11,457 → 5,905 | 8,502 → 6,123 |
| UTF-32BE decode | 4,723 → 4,707 | 3,772 → 3,763 |
| Windows-1251 encode | 863 → 874 | 427 → 423 |
| Windows-1251 decode | 1,039 → 1,072 | 707 → 710 |
| GB18030 encode | 2,791 → 2,798 | 2,574 → 2,420 |
| GB18030 decode | 2,951 → 2,953 | 2,340 → 2,299 |
| Alias lookup | 132 → 130 | 143 → 140 |

Native byte swapping makes UTF-16BE encoding take **81% less time on Node and
62% less on Bun**. Reading UTF-32 input code units directly takes **48% / 28%
less time**. Correct surrogate buffering costs **12% more time for UTF-16BE
decoding on Node**. Small differences in other rows may be measurement noise;
these microbenchmarks do not establish application throughput improvements.

## vraw-body

**Target and dependencies:** this replaces raw-body **3.0.2**, the version used
by body-parser 2.4.0 in the pinned Express 5.3.0 consumer graph. Raw-body **4.0.0**
was also checked on 2026-10-26: its Node 22+ ESM entry point and default TextDecoder
change the integration contract, and body-parser declares a 3.x dependency.
These comparisons do not imply the newer major has every issue in 3.0.2.
VPM retains the callable CommonJS export, Promise/callback API, and viconv-lite's
complete charset support. Direct dependencies fall from four to three, all VPM;
the full tree is `vbytes`, `vhttp-errors`, `viconv-lite` and `vstatuses`.
Native `stream.unpipe()` removes the separate `unpipe` compatibility helper.

**Read completion and cleanup:** upstream's close handler removes listeners but
never settles a read that closes before `end` without an error/abort event.
The regression test reproduces that pending callback. VPM rejects with
`request.aborted`, preserving expected/received byte counts. Already destroyed
or ended streams also fail without waiting for events that have already happened.
Every completion clears owned listeners and retained data. Source errors retain
their identity, decoder failures use the same cleanup path, registration failures
roll back, and reentrant completion does not leave listeners installed. Callback
async context is retained and its resource is explicitly destroyed after dispatch.

**Validation:** length accepts only nonnegative safe integer bytes or a string
of ASCII decimal digits; invalid values cannot disable or truncate the check.
Limits use vbytes' complete-input parser and must resolve to nonnegative safe
integer bytes. Invalid options throw synchronously before consuming data. An
excess over declared length is rejected as soon as it arrives. String/object
chunks produce controlled errors instead of miscounting character lengths or
throwing from a later Buffer operation. Modern Node readable streams emitting
Buffer/Uint8Array chunks are required; legacy EventEmitter-only streams are dropped.
Errors pause/unpipe the stream; draining, destroying and timeouts remain the caller's
responsibility. There is no default size limit. Result Buffers retain independent
storage, while concatenation reuses the byte count already tracked during reading.

**Evidence:** 28 package tests cover differential successful reads and the
intentional behavior changes, callback/Promise APIs, real file streams, byte/BOM
boundaries, failure cleanup, option snapshots and async context. Node additionally
checks async_hooks resource destruction, which Bun does not implement. The 126-check
HTTP gate exercises vraw-body through body-parser and directly, including actual
client disconnection, compressed-body failure, limit errors, raw-buffer verification,
unsupported charsets and separately delivered multibyte sequences. Packed archives
are installed with npm and Bun, then checked with Node/Bun CJS/ESM and TypeScript 7
without ambient platform declarations. Callback types distinguish successful bodies
from absent error results; dynamic encodings return a Buffer/string union.

**Performance follow-up:** the reader now validates numeric limits directly
instead of validating them in both vbytes and the reader. A single native
Uint8Array check accepts Buffer and cross-realm byte arrays while rejecting
objects that merely inherit Buffer.prototype. The smaller of expected length
and size limit is computed once, reducing two per-chunk bound checks to one;
the failure path preserves 413 precedence when a chunk exceeds both. String
parsing, early rejection, independent output storage, listener cleanup and async
resource handling are unchanged. Additional tests cover forged buffers, view
boundaries, coercion hooks and 98 combinations of size bounds and return encoding.

**Measured performance:** the initial 2026-10-26 run showed a 7% Node penalty on
small Buffer/Promise reads. That exact percentage varied in fresh runs. Profiling
identified per-chunk validation and Buffer assembly as reader overhead, while
large text reads were dominated by the decoders. The optimizations above remove
redundant checks; Buffer assembly and decoding retain their existing behavior.

The [benchmark](packages/vraw-body/bench/compare.cjs) measures complete PassThrough
reads, including stream construction, callback/Promise settlement and body assembly.
The 2026-10-27 follow-up used **three fresh processes per runtime**, sequentially,
on Node 24.22.1 and Bun 1.4.0/macOS arm64. Each process collected nine rotating
5,000-read samples after 5,000 warmup reads per implementation. All implementations'
results are checked against upstream before timing. Values below are medians of
the three process medians, in nanoseconds/read. Columns show **upstream → initial
VPM (5873356) → optimized VPM**. The [recorded results](packages/vraw-body/bench/results-2026-10-27.json)
include every process median and source hashes; the package README gives the
command to reproduce the three-way comparison.

| Case | Node upstream → initial → optimized | Bun upstream → initial → optimized |
| --- | ---: | ---: |
| Buffer 1 KiB / Promise | 971 → 981 → 956 | 1,021 → 963 → 969 |
| Buffer 1 KiB / callback | 1,041 → 1,049 → 1,042 | 1,132 → 1,016 → 994 |
| Buffer 1 KiB / callback + bounds | 1,093 → 1,107 → 1,047 | 1,183 → 1,129 → 1,133 |
| Buffer 64 KiB / one chunk | 4,229 → 4,101 → 4,103 | 4,373 → 4,480 → 4,439 |
| Buffer 64 KiB / 64 chunks | 9,790 → 10,369 → 9,618 | 9,356 → 9,591 → 9,371 |
| UTF-8 1 KiB | 1,605 → 1,618 → 1,573 | 1,296 → 1,413 → 1,388 |
| UTF-8 1 KiB / callback + bounds | 1,561 → 1,519 → 1,514 | 1,325 → 1,251 → 1,214 |
| UTF-8 / 16 chunks | 41,463 → 41,697 → 41,603 | 20,493 → 20,776 → 20,777 |
| Shift-JIS 8 KiB | 30,185 → 30,368 → 30,460 | 24,540 → 24,683 → 24,610 |

Against initial VPM, Node's 64-chunk case takes **7% less time** (a 6.8–7.5%
reduction in each fresh process); the bounded Buffer callback case takes **5% less**
in the aggregate, and the small Promise case takes **3% less**. The optimized Node
medians are now within 1% of upstream or faster across these cases. Small differences
near 1% should not be treated as reliable gains. Bun remains mixed against upstream:
its short UTF-8 Promise case is about **7% slower**, despite improving from initial
VPM, while its small Buffer callback case is **12% faster**. These local measurements
do not establish an application throughput or security improvement.

## vqs

**Baseline and dependency reduction:** targets qs **6.17.0**, checked on
2026-10-27 and pinned within Express 5.3.0 / body-parser 2.4.0's compatible
ranges. Native Map, WeakMap and Object.defineProperty replace **two direct and
18 distinct total external runtime dependencies**. The installable package has
zero runtime dependencies and bundles its own declarations. The helper tree is
retained only in an immutable, hash-checked test/benchmark fixture.

**Correctness and explicit limits:** parse depth, arrayLimit and parameterLimit,
and stringify depth, now reject NaN, negative/fractional/unsafe numbers and
non-number values. Previously `parameterLimit: NaN` silently returned an empty
object, while a fractional depth could permit more nesting than its stated value.
Bounds at the uint32 split boundary no longer wrap to zero or a smaller count:
`parse('a=1&b=2', { parameterLimit: 2 ** 32 })` returns both fields instead of `{}`.
Serialization appends fields with a loop so wide arrays do not exceed the
runtime's function argument-count limit; a 200,000-element array is tested.

**Implementation:** native UTF-8 percent encoding preserves RFC3986, RFC1738 and
WHATWG behavior, including U+FFFD for lone surrogates. An ASCII fast path skips
encoding unchanged keys and values; malformed strings are repaired before the
codec so they do not trigger a costly exception. Plain parse keys skip numeric
index conversion, merge loops avoid per-field reduce callbacks, and tracking
maps are allocated when needed. Query nesting, duplicate handling, conflict
merging, custom encoders/decoders, filters, date handling, sparse arrays,
Latin-1/entity behavior and prototype guards retain the 6.17.0 contract.

**Compatibility:** invalid options now throw TypeError even for empty input.
Use zero instead of negative arrayLimit, and omit a bound instead of supplying
null or a non-number. Nonnegative safe integers and explicit Infinity remain
supported; parse depth also accepts false as zero. Existing finite-limit overflow
behavior is retained, including opt-in strictDepth and throwOnLimitExceeded.
Limits count nesting/fields/array elements, not HTTP bytes. Unbounded or very deep
inputs can still hit ordinary memory, string-size and recursion limits.

The fixture upgrade from 6.16.1 also brings upstream's WHATWG format, recent
prototype-copying and duplicate-limit fixes, filter-array copying and lone-surrogate
corrections. Those are upstream improvements, not VPM inventions. Removing qs's
helpers does not remove copies required by other dependencies, and no production
throughput or security outcome is inferred.

**Evidence:** 19 package tests include option matrices, 6,200 generated mixed-key
parse comparisons, all 65,536 UTF-16 code units in all formats, astral characters,
malformed escapes, custom hooks, shared/cyclic objects, ownership, prototype
protection and bound checks. At this package's introduction on 2026-10-27, the
full suite passed **411 tests on Node** and **410 with one existing async-hooks
skip on Bun**. The shared gate then passed **138 HTTP checks on each runtime**,
including extended queries and nested forms through
Express/body-parser, charset sentinels, depth rejection and parameter limits.
Both package managers install archives successfully; CJS/ESM runtime checks and
strict TypeScript 7 consumers pass without ambient Node, Undici or DOM types.

**Measurements:** 2026-10-27, macOS arm64, Node 24.22.1 / Bun 1.4.0. Values below
are **upstream → VPM nanoseconds per call**, median of nine alternating 10,000-call
samples after 5,000 warmup calls per implementation and case. The
[benchmark](packages/vqs/bench/compare.cjs) asserts output parity before timing;
[recorded samples and source hashes](packages/vqs/bench/results-2026-10-27.json)
identify the exact implementations. The baseline uses the published CommonJS
source with its actual dependencies, without substituting VPM helpers.

| Case | Node ns/call | Bun ns/call |
| --- | ---: | ---: |
| parse / short flat | 1,281 → 1,182 | 774 → 717 |
| parse / 20 fields | 9,020 → 8,097 | 5,846 → 5,479 |
| parse / nested arrays | 5,444 → 4,975 | 4,437 → 3,910 |
| parse / Unicode | 4,696 → 4,784 | 12,004 → 11,837 |
| parse / repeated conflicts | 3,869 → 3,658 | 3,426 → 3,163 |
| parse / strict limits | 5,168 → 4,881 | 4,749 → 4,481 |
| stringify / short flat | 1,252 → 626 | 819 → 421 |
| stringify / 20 fields | 9,876 → 2,659 | 6,921 → 1,739 |
| stringify / nested arrays | 5,315 → 2,860 | 5,353 → 2,190 |
| stringify / Unicode | 12,353 → 3,779 | 12,044 → 5,505 |
| stringify / WHATWG | 27,912 → 11,241 | 16,306 → 9,089 |
| stringify / lone surrogates | 1,110 → 450 | 498 → 383 |
| stringify / 100 objects | 274,918 → 140,643 | 242,705 → 122,211 |
| stringify / comma array | 6,657 → 1,997 | 3,977 → 1,600 |

Serialization takes **46–73% less time on Node** and **23–75% less on Bun** across
these cases. Parsing takes about **6–10% less on Node's other five cases**, while
its Unicode case is **1.9% slower** (4,696 → 4,784 ns). Bun parsing takes **1–12%
less time**. Small differences can vary between runs; these isolated warmed calls
do not measure application startup, HTTP throughput or tail latency.

## vrouter

**Consumer and dependencies:** replaces router 2.2.0 in Express 5.3.0. Three
runtime dependencies are all VPM packages, compared with five upstream. The
`is-promise` check is incorporated into the three callers that need it, with one
read of the returned `.then` getter and the original receiver preserved.

**Correctness:** parameter registries, memoization and result maps have null
prototypes. Prototype-shaped names work as ordinary parameters; numeric capture
merging does not mutate the matched child layer. RegExp routes snapshot source
and flags, reset global/sticky matching for each request, and preserve the
caller's lastIndex. Capture scanning correctly skips escaped parentheses,
character classes and lookarounds. Complete handler lists are validated before
publishing layers; failures leave no partial registrations. Cyclic handler arrays
fail explicitly, and deeply nested arrays are flattened without recursion.

**Caller optimization:** one middleware registration compiles its path once;
route handler layers reuse a stateless root matcher. Layer arrays/results remain
independent. Percent-free captures avoid decoding, parameter-free dispatch avoids
callback setup, and three known request fields are restored directly. A local
pathname cache avoids full URL objects for ordinary URLs and follows middleware
URL rewrites. Complex forms retain vparseurl's parse boundary and call the same
native `node:url.parse` directly, without a disposable request or redundant cache
entry. This removes vparseurl from the router's dependency list. These choices
preserve the standalone dependencies' public behavior.

**Verification:** 52 package tests on each runtime, including upstream parity,
all HTTP methods, async errors, parameter concurrency, deep dispatch, RegExp
capture/state cases, 300 generated URL comparisons and 3,361 additional complex
URL pathname comparisons. Explicit tests preserve invalid-input handling, getter
read counts and independence from mutable shared parse results. The shared gate passes
**228 HTTP checks per runtime**, including eleven new router requests through real
Express/Functions Framework consumers. The full suite passes **1,211 Node tests**
and **1,208 Bun tests with three runtime-specific skips**. Public declarations
cover **39 runtime packages**; the central inventory and README gate cover
**41 packages**. npm/Bun archive consumers check ten-file contents, three rewritten
VPM dependency versions, CJS/ESM runtime imports and TypeScript 7 without ambient
platform types. Upstream router tests are retained for reference, not counted as
executed verbatim.

**Initial performance at `692d773`, 2026-10-28:** three fresh processes per runtime, twelve ordered
samples per case, with unchanged upstream, upstream plus VPM dependencies, and
vrouter compared separately. Registering groups of 20 handlers takes **70–83%
less time** across Node 24.22.1 and Bun 1.4.0. One-parameter dispatch takes
**11–13% less on Node and 15–18% less on Bun**; a 4 KiB query passing through 20
middleware takes **72–74% less**. Bun improves across all measured dispatch
cases. Node static routes vary from **12% faster to 15% slower**, and its
absolute/full-parse URL paths take **12–36% more time**. Full parsing and its VPM
cache still cost more there. The complex-URL follow-up below removes that redundant
cache work; the original results remain available as historical evidence.
These component benchmarks include allocation/serialization, exclude network I/O,
and do not establish application throughput gains.

**Complex-URL follow-up, 2026-10-28:** the redundant fallback created a temporary
request, decorated the parsed URL and installed a WeakMap entry that could never
be reused. Calling the same native parser directly removes that work, preserves
the string-only input contract and leaves the invocation-local pathname cache
unchanged. Three fresh-process comparisons against the saved `692d773` code show
**14–20% less time for Node absolute URLs** and **16–21% less for full-parse query
strings**. Median before/after timings are **2.007 → 1.697 µs** and
**1.560 → 1.229 µs**, respectively. Against upstream within the same runs, these
are approximately parity or faster (absolute URLs range from 10% faster to 2%
slower; full-parse queries are 5–8% faster). Additional complex forms improve
8–18% against the prior VPM implementation. Ordinary-path algorithms and cache
behavior are retained. Bun's full-parse query improves 7–10%, while its absolute
URL results vary from 7% faster to 14% slower; the full raw samples are retained.
The follow-up adds four regression tests and two absolute-target HTTP checks,
reflected in the current verification counts above.

[API, compatibility differences, full table and raw benchmark evidence](packages/vrouter/README.md).

## vdepd

**Caller and dependencies:** replaces `depd` 2.0.0 in Express 5.3.0 redirect
warnings and router 2.2.0 thenable warnings. Both versions have zero runtime
dependencies. `vrouter` now incorporates the thenable check directly; the pinned
upstream fixture retains `is-promise` solely for comparison.

**Correctness and implementation:** warning policy and deduplication are private,
with frozen, detachable public methods. Proxy wrappers remove generated code and
retain function arity/name, statics, normal construction, classes, native
constructors and subclasses. Data-property setters create an own property on a
child instead of changing the prototype's shared value. Property installation
uses one definition instead of a preliminary conversion followed by wrapping.
Native Node call-site capture leaves global Error hooks untouched. Short Node
captures expand when the caller or trace requires more frames. Bun and the older Node
fallback restore descriptors in `finally` and retain compact frame data.

**Compatibility:** namespace/message warnings, per-deprecation-and-caller
suppression, environment/process policy snapshots, listener precedence, stderr
and the browser no-op entry are preserved. Intentional differences include
strict string namespaces, no mutable underscore internals, standard Error
constructor identity, corrected prototype writes, and engine-dependent stack
labels without receiver-type inference. Installed accessors throw for blocked
receiver writes even through `Reflect.set`. Trace depth is capped at 200. Bun
still requires mutable data properties for Error hooks and eagerly formats new
Errors;
Node 24's native path also works with an immutable throwing formatter. These are
wrapper and diagnostic improvements, not an application security claim.

**Verification:** 48 package tests on Node 24; 46 on Bun with two V8-specific
skips. Thirty tests apply the same public contract to upstream and VPM. Tests
also cover prototype/receiver writes, constructors, metadata, strict namespaces,
private state, deep callers, throwing capture, hook restoration and browser
behavior. Original upstream suites are retained as reference, not counted as run.
The shared HTTP gate now runs **228 checks per runtime**, with seven new
Express/router requests. npm/Bun archive installs verify eight-file contents,
CJS/ESM, browser conditions/bundling, and TypeScript 7 without ambient platform
types. Current shared test, declaration and documentation coverage is recorded in the
`vrouter` section above.

**Performance, 2026-10-28:** three fresh processes each on Node 24.22.1 and
Bun 1.4.0, with twelve alternating-order samples per case and matching source
hashes. Function-wrapper creation takes **39–40% less time on both runtimes**;
property-wrapper creation takes **48% less on Node and 17–20% less on Bun**.
Suppressed direct warnings take **24–25% less on Node** and are approximately
unchanged on Bun. Already-warned direct calls improve **18–19% on Bun**, but take
**1–7% more on Node**, up to 0.54 µs extra. First plain stderr output including
factory creation improves **12–13% / 5–7%**.

The constructor-preserving Proxy makes suppressed wrapped calls **10–14% slower
on Node** (up to 7.4 ns extra) and **6.3–7.4× on Bun** (up to 99.2 ns extra).
First event delivery including factory creation takes **10–12% more on Node**
(up to 2.83 µs); Bun factory creation takes **9–10% more** (up to 0.35 µs).
Already-warned wrapped function calls vary up to 4% slower on Node (0.35 µs).
Express/router use direct warnings rather than wrappers; normal nondeprecated
calls do not enter this warning path. These are diagnostic microbenchmarks,
with stderr captured in memory, not HTTP throughput measurements.

[API, compatibility and full benchmark evidence](packages/vdepd/README.md).

## vpath-to-regexp

**Consumer and dependencies:** replaces `path-to-regexp` 8.4.2, used by router
2.2.0 in Express 5. Both versions have zero runtime dependencies. The complete
public API includes parse, compile, match, pathToRegexp, stringify, TokenData
and PathError.

**Correctness:** compiled URL generators and matchers snapshot token graphs;
external mutations cannot change literal output or capture names. Option fields
are read once, including the delimiter shared by regex generation and wildcard
decoding. Parameter names stringify using route escapes, correcting upstream's
loss of control characters through JSON escaping and incorrect name boundaries
before astral identifier continuations or empty text tokens. Generation accepts
own parameter and wildcard entries with single reads. Invalid schema/options,
codec results, cycles and more than 128 levels of nesting fail explicitly.
Compatibility changes, callback behavior and error contracts are documented in
the package README.

**Implementation:** span-based literal parsing avoids a whole-route character
array. Private token plans replace a closure per template token. Default URL
encoding bypasses the native encoder only for its exact ASCII safe character set; surrogate errors still come from the native encoder. Default decoding
skips the native decoder for percent-free values, wildcard decoding reuses its
split array, and complete static matches avoid capture arrays. Regex lowering
and backtracking guards are retained from upstream 8.4.2; its 256-alternative
limit is checked before flattening. No global cache or generated code is used.

**Verification:** 363 package tests cover all 344 upstream data cases, error
contracts, identical regex source/flags/capture ordering, all 65,536 UTF-16 code
units in names and native-equivalent URL encoding, 4,000 generated route/input
comparisons, input mutation, getter counts, custom codec contracts and adversarial paths. Twenty HTTP checks were added for this package,
including URI errors both before and inside the application. The current shared
gate runs **228 checks per runtime**. npm/Bun archive
installs pass Node/Bun CJS/ESM and TypeScript 7 consumers, with seven-file contents
and no platform ambient declarations. Current shared test and declaration counts
are recorded in the `vrouter` section above.

**Performance, 2026-10-28:** three processes each on Node 24.22.1 and Bun 1.4.0,
with twelve alternating-order samples per case. Ordinary one-/two-parameter
matching takes **57–65% less time on Node and 30–51% less on Bun**. Default
wildcard matching takes **13–19% / 12–18% less**. Short-route parsing takes
**49–84% / 11–68% less** across six shapes, with a larger gain for the long
literal-heavy sample. URL-template construction takes **55–82% / 42–67% less**;
two-parameter URL generation takes **30–32% / 38–42% less**.

Tradeoffs remain: wildcard URL generation takes **9–14% more time on Node and
14–32% more on Bun** (up to 42 / 63 ns extra). Stringification takes **4–18% /
8–77% more** (up to 81 / 144 ns), including token validation and corrected name
serialization. Percent-decoded matches take up to 11% / 10% more (22 / 13 ns).
The 32-alternative construction case takes 2–8% / 2–7% more (1.6 / 1.3 µs).
Raw/custom-decoding timings vary, with Node maxima of 58% / 24% more (69 / 73 ns).
These are isolated operations, not HTTP throughput measurements.
[API, compatibility, full tables and all six runs](packages/vpath-to-regexp/README.md).

## vproxy-addr

**Caller and dependencies:** replaces `proxy-addr` 2.0.8 in Express 5.3.0's
client-address and trust-proxy path. Its two direct dependencies, `vforwarded`
and `vipaddr`, have no dependencies of their own. The complete tree is VPM.

**Caller specialization:** uses vipaddr's validated public parsers once per
candidate, without constructing address objects. Compilation converts IPv4
rules to private numeric masks/network values and prepares IPv6 full/partial-word
comparisons. Mapped policies and candidates become IPv4 numbers directly;
family separation avoids repeated conversion and irrelevant rule checks. This
removes repeated parsing, defensive state copying and prefix validation from the
request path while retaining the standalone address package's contract.

**Behavior:** all 88 upstream behavior tests, including 2.0.8's mapped-prefix
security safeguards, pass unchanged. VPM adds valid `/0` prefixes and zero
netmasks: IPv4/mapped and native IPv6 remain separate families. Short mapped
prefixes below 96 grant no trust. Configuration arrays use single reads of their
length/entries, reject inherited or nonstring entries, and produce an isolated
private policy. Prefixes consume the full suffix. Accidental falsy policies to
`all`, such as false or zero, throw instead of becoming unrestricted extraction;
omitted/null trust retains extraction semantics. Callback order, truthiness,
first-untrusted inclusion, unavailable socket addresses and original address text
are preserved. Dependency-level parsing/header changes are documented separately.

**Verification:** 105 package tests include all 162 prefix lengths, exact subnet
boundaries and adjacent addresses, 7,140 generated BigInt comparisons, every
short mapped prefix, 3,000 generated request/policy comparisons against both
baseline callers, and 2,000 rule-order checks. Ten proxy-trust HTTP checks contribute to
the shared Express/Functions Framework gate, now at 228 on Node 24 and Bun. npm/Bun
archives cover CJS/ESM imports, six-file contents, rewritten VPM dependency
versions and TypeScript 7 consumers without ambient platform types. Current
shared suite and declaration coverage is recorded in the vrouter section.

**Performance, 2026-10-28:** three processes each on Node 24.22.1 and Bun 1.4.0 compare the
original caller/dependencies, the original caller with VPM dependencies, and
`vproxy-addr` with those same VPM dependencies. Compared with the second baseline,
single IPv4/IPv6/mapped-candidate trust checks take **46–53% less time on Node and
49–59% less on Bun**. Three-trusted-proxy traversal takes **43–44% less on Node and
36–41% less on Bun**; 100-hop traversal takes **47–48% / about 44% less**. The
100-rule case takes **88% / 81–87% less**, eliminating the previous standalone
`vipaddr` caller regression for that case. Compilation takes **42–53% / 10–51%
less** across the six measured policies. Relative to original upstream with
original dependencies, three-trusted-proxy traversal takes **81–82% / 83–85%
less**, including the earlier dependency improvements.

Empty policies, invalid candidates, callbacks, unavailable sockets and
extraction-only paths show small or inconsistent changes against the VPM-dependency
baseline. Node extraction is up to 7% slower (9 ns extra); Bun's empty policy is
up to 12% slower (1.2 ns), unavailable socket up to 7% slower (3.4 ns), and
callback up to 2% slower (1.5 ns). These are isolated operations, not HTTP
throughput results. [Contract, full tables and all six runs](packages/vproxy-addr/README.md).

## vipaddr

**Consumer and baselines:** `proxy-addr` 2.0.8, used by Express for client-address
and proxy-trust evaluation, pins `ipaddr.js` 1.9.1. VPM also implements and compares
against current `ipaddr.js` 2.5.0. All three address libraries have zero runtime
dependencies. Together with `vforwarded`, this supplies the two dependencies
used by `vproxy-addr`.

**Correctness:** numeric prefix lengths must be finite integers within the
family's bounds. Both upstream releases can return true for an unrelated subnet
with NaN/negative lengths, and infinite lengths can keep a match loop running.
VPM rejects those inputs before matching. Constructors validate integer parts and
bytes before bitwise conversion, snapshot their input, and store private address
state; mutating exposed arrays cannot alter a later subnet decision. Custom
range matching considers own keys, and built-in range tables are frozen.
IPv4-compatible IPv6 text such as `::192.0.2.1` keeps its actual bits and family;
2.5.0 instead inserts the IPv4-mapped marker. Only true mapped `/96` addresses
are converted to IPv4.

**Implementation and compatibility:** scanners replace repeated parsing and
exception-based validation. Mapped-address checks and conversions work on numeric
parts. IPv6 formatting finds the longest zero run directly, and subnet-mask
helpers use numeric operations. VPM preserves validated legacy IPv4 number forms
from 2.5.0, while strict decimal predicates remain available. Intentional changes
include full validation in the low-level parsers/family predicates, strict dotted
IPv6 tails, a documented ASCII zone grammar, copied read-only state properties,
precise numeric prefix contracts, and base-class instances from static factories.
JSON output retains the familiar address shape; own-property reflection changes.
The 2.5.0 special-range snapshot is classification data, not a live registry or
trust policy. Both global and instance `subnetMatch` are implemented, including
custom fallback sentinels. Types cover the complete runtime API without ambient
platform declarations.

**Verification:** 87 tests combine all 67 adapted 2.5.0 tests with 20 focused
checks. Independent checks include 20,000 byte/address round trips, ASCII syntax
substitutions against Node, all 162 valid subnet masks, 5,000 generated subnet
operations checked with BigInt arithmetic, and 3,000 range classifications.
Nine HTTP checks exercise the proxy-addr interface through Express, covering
mapped/native/compatible IPv6, subnet boundaries and malformed proxy addresses.
The shared gate runs 228 HTTP checks on each runtime. Archive checks cover the
eight-file package, npm/Bun installs, Node/Bun CJS/ESM imports and TypeScript 7
consumers without platform types. The latest shared coverage is recorded in the
`vrouter` section above.

**Performance, 2026-10-28:** three fresh processes each on Node 24.22.1 and Bun
1.4.0 use twelve order-balanced samples per case against both verified releases.
Versus the caller's pinned 1.9.1, IPv4 parsing takes **77–78% less time on Node and
82–83% less on Bun**; IPv6 parsing takes about **92% / 90% less**. Unchanged
proxy-addr trust functions take **59–89% / 80–92% less time** across IPv4, native
IPv6 and mapped inputs. The 2.5.0 comparison also shows substantial gains.
These are isolated operations and compiled trust calls, not measured HTTP
throughput. Constructors retain a cost for validation and copying: **33–40%
more time on Node and 53–100% more on Bun versus 1.9.1**. Parsed-address matching
is also a little slower on Node (roughly 1–2 ns); Bun's IPv6 matching is slower
than 1.9.1 but faster than 2.5.0. Byte-array conversion now validates and combines
bytes directly, avoiding an intermediate array, and is faster than both releases
on both runtimes. [Full tables, all six runs, API and compatibility](packages/vipaddr/README.md).

## vforwarded

**Consumer and baseline:** `forwarded` 0.2.0 is a dependency of `proxy-addr` 2.0.8,
used by Express 5.3.0 for `req.ip`, `req.ips`, and trust-proxy evaluation. Both
upstream and VPM have zero runtime dependencies.

**Behavior:** VPM trims HTTP spaces and tabs, skips empty entries, and preserves
socket-first/reverse-header order. It snapshots request fields, avoids upstream’s
double read of a present socket, ignores inherited header values, and rejects
nonstring header/address values without coercion. Undefined socket addresses,
opaque address text, mutable fresh arrays, frozen requests, and legacy connection
fallback remain supported. IP validity and proxy trust remain the caller’s job.
Tab handling, inherited headers, accessor read counts, and malformed-input errors
are intentional compatibility changes, documented with the package API.

**Implementation and verification:** native comma searches skip complete tokens;
a single result array replaces a temporary list and concatenation. Sixteen tests
include 10,000 generated inputs, long chains, whitespace, getter/proxy behavior,
and source-integrity checks. Eleven added HTTP checks exercise the actual
proxy-addr/Express path under disabled, unrestricted, hop-count and subnet trust,
including IPv4-mapped IPv6, tab-separated proxies, untrusted-hop boundaries and
repeated header lines. The current shared gate runs 228 HTTP checks on Node 24 and
Bun. npm/Bun archive installations pass CJS/ESM runtime and TypeScript 7 consumers
without platform ambient declarations. The documentation gate covers 41 packages.

**Performance, 2026-10-28:** three fresh processes on Node 24.22.1 and Bun 1.4.0,
with twelve alternating-order samples per case, show one-/two-address parsing
using **40–62% less time on Node and 16–52% less on Bun**. Missing/empty headers
use **72–77% / 28–55% less**. Native searches improve the 16 KiB opaque-token case
by about **78% / 96%**. Bun’s 100-entry chain takes **6–11% more time** (125 ns in
run 1); its three-entry case varies from 12% faster to 7% slower. Node’s long
whitespace-only case is essentially tied. Corrected tab output is timed without
an upstream speed ratio. These parser measurements do not establish application
throughput. [Contract, full tables and all six runs](packages/vforwarded/README.md).

## vonce and vmerge-descriptors

`vonce` targets `once` 1.4.0, called by Express's `app.listen()`; it removes the
`wrappy` 1.0.2 dependency. `vmerge-descriptors` targets 2.0.0, used to build Express
application functions. Both replacements have zero runtime dependencies.

**Callback correctness:** upstream's metadata copier can overwrite the wrapper's
`called`, `value` and strict-error fields. VPM keeps state in closures and exposes
read-only status, so decorations cannot suppress a callback or forge its cached
result. It preserves first-call receivers, arguments, results, synchronous failure,
reentrancy and Promise identity. Enumerable string and symbol metadata retains
its descriptors without invoking accessors or treating `__proto__` as a setter.
Frozen wrappers still execute. Prototype installation remains an explicit opt-in
and refuses conflicting own methods. Mutable wrapper state, reset attempts,
metadata getter timing and descriptor flattening intentionally change.

**Descriptor completeness:** VPM copies own symbol keys, including nonenumerable
ones, as well as strings. It requires object/function endpoints and boolean
overwrite values and skips keys removed before their descriptor is read. Getter
non-execution, descriptor flags and shallow references were already strengths
of upstream and remain intact. Native errors and proxy effects still apply; a
failed merge may have already copied earlier properties.

**Verification:** 35 focused tests, including 1,000 generated comparisons for each
package, pass on Node 24.22.1 and Bun 1.4.0. The shared gate passes 160 HTTP checks
on both runtimes, including real Express startup success/error paths and a symbol
getter copied into an application. Proxy-order, symbol-snapshot and overlapping
typed-array regressions protect the optimized enumeration paths. Isolated npm/Bun archives pass Node/Bun CJS/ESM
consumers and TypeScript 7.0.2 with no platform ambient declarations. All 35 package
READMEs and the central comparison inventory are checked for coverage and links.

**Initial performance, 2026-10-27:** nine alternating-order samples compare unmodified
upstream fixtures. `vonce` construction cases take 8.2–11.5× upstream on Node and
2.6–3.2× on Bun: about 0.48–0.89 µs and 0.21–0.39 µs extra, respectively. Cached
calls are comparable. Read-only status and safe descriptor copying have a real
creation cost, though Express creates this callback at startup. `vmerge-descriptors`
is within about 6% on Bun's nonempty cases; ordinary Node copies take 10–26% more
time, while the Express-like 50-method function mixin is essentially unchanged.
Node's empty/skip-only cases take 2.9×/3.5× upstream (36/647 ns extra). These are
correctness, API and dependency improvements; no blanket performance win is claimed.

**Enumeration optimization, 2026-10-28:** three fresh processes per runtime now
compare upstream, exact VPM sources from `7744a9e`, and the optimized source, with
twelve samples in all six implementation orders. Ordinary callback metadata uses
enumerable string keys plus a symbol snapshot. Ordinary Node descriptor merges
use separate name/symbol enumeration; proxies keep one `Reflect.ownKeys` trap,
and Bun retains native combined enumeration for descriptor merging. Built-in
`node:util.types.isProxy` makes this distinction without an external dependency.
Neither callback-state protection nor sequential descriptor semantics changed.

The original five `vonce` construction cases take **10–30% less time on Node and
19–37% less on Bun** than previous VPM. Retained wrappers improve **25–35% / 34–37%**;
100 hidden metadata properties improve about **93% / 92%**. Cached-call code is
unchanged. Read-only accessors still carry a real cost: first-run creation plus
first call takes **451 ns versus 44 ns upstream on Node**, and **215 versus 121 ns
on Bun**. This reduces, but does not eliminate, the construction gap.

Node descriptor string copies/replacement/function mixins take **7–19% less time**,
and skipping existing fields **63–65% less**, than previous VPM. String copies are
now within about **1–9% of upstream** and the function mixin within **1–2%**. The
accessor/hidden-property case regresses **5–7%** (43 ns in run 1); all-symbol and
mixed-symbol cases regress **4–11% / 2–8%**. These costs remain documented rather
than weakening symbol or descriptor handling. Bun's nonempty cases stay within
about 2% of previous VPM. Both package READMEs link all three full runs and the
previous source snapshots, alongside their compatibility contracts.

[vonce API and samples](packages/vonce/README.md),
[vmerge-descriptors API and samples](packages/vmerge-descriptors/README.md).

## vcookie-signature

**Consumer and baseline:** Express 5.3.0 uses `cookie-signature` 1.2.2 to sign
cookies before `vcookie` serializes their attributes. `vcookie-signature` keeps
its `sign(value, secret)` / `unsign(input, secret)` contract, HMAC-SHA256 algorithm,
standard unpadded base64 format, and string-or-false verification result.
Both versions have zero external runtime dependencies.

**Verified changes:** verification compares only the 43-byte encoded signature
using native `timingSafeEqual`, avoiding upstream's two comparison buffers that
include the entire payload. Public format failures reject before payload hashing;
invalid key configuration still throws. Exact encoded bytes preserve rejection
of padding, base64 aliases, nonzero padding bits and Unicode truncation attempts.
Signing slices the known padding character instead of using a regex. Genuine
CryptoKeys pass through `KeyObject.from`; host restrictions/deprecations on
non-extractable conversion still apply. Exports are frozen and structural key
types compile without Node/DOM declarations. Upstream already compares safely;
this is an allocation/efficiency improvement, not stronger cryptography.

**Evidence:** 12 focused tests include an RFC 4231 known-answer vector, 1,000
generated values, cross-verification with unmodified upstream, signature/payload
tampering, malformed input, native keys and offsets, CJS/ESM, and instrumentation
confirming 43-byte comparison buffers for both matches and mismatches. Real
Express signed-cookie bytes are checked against an unaliased fixture, and HTTP
verification rejects tampering and padding.

**Measurements:** macOS arm64, Node 24.22.1 / Bun 1.4.0, 2026-10-27, nine
alternating-order samples. Median nanoseconds per call:

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| Sign short, string key | 1,532 → 1,479 | 827 → 779 |
| Verify short, string key | 1,779 → 1,664 | 1,123 → 1,005 |
| Verify Unicode | 1,994 → 1,762 | 1,143 → 1,106 |
| Verify 4 KiB | 6,092 → 3,534 | 5,110 → 3,314 |
| Verify 64 KiB stress case | 93,251 → 31,682 | 58,539 → 35,487 |

Short verification takes about **6% / 11% less time**, and 4 KiB verification
**42% / 35% less**. Node KeyObject signing is effectively tied. Large malformed
inputs benefit from skipping payload work; 64 KiB cases are stress inputs, not
representative browser cookies. No application throughput gain is established.

[API, limitations and all cases](packages/vcookie-signature/README.md),
[Node samples](packages/vcookie-signature/bench/node24.json),
[Bun samples](packages/vcookie-signature/bench/bun14.json),
[provenance](packages/vcookie-signature/PROVENANCE.json).

## vvary

**Consumers and baseline:** Express's `res.vary()` and content negotiation, plus
CORS's origin/request-header handling, use `vary` 1.1.2. `vvary` preserves the
callable response wrapper and `append(header, field)` helper, with no runtime
dependencies in either version.

**Verified improvements:** spaces and tabs are recognized consistently in both
new and existing lists; upstream rejects or duplicates tab-separated names and
misses tab-surrounded wildcards. Old and new names are validated before any
response write, even with a wildcard. Field/header-array elements and response
methods are captured once. Numbers, arbitrary coercible objects, sparse arrays
and malformed existing headers are rejected. Empty list members are ignored
around actual string-list names; an empty field string still throws. Existing
casing/formatting is preserved, new fields deduplicate case-insensitively and
wildcards collapse to `*`. No-op additions skip `setHeader`. Large merges use
a Set, while small lists avoid its allocation.

**Evidence:** 16 focused tests include 2,000 generated merges, all byte values,
tabs/wildcards, malformed names, getter substitution, response/header arrays,
no-op writes, large lists and CJS/ESM. Real Express and CORS callers pass through
VPM in the shared gate, including added tab/wildcard/error responses.

**Measurements:** same environment and nine-sample method as above. Median
nanoseconds per call:

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| Append first field | 106 → 28 | 115 → 33 |
| Append second field | 136 → 78 | 136 → 74 |
| Duplicate single field | 123 → 64 | 120 → 56 |
| Append to three fields | 224 → 255 | 186 → 325 |
| Merge 500 fields | 273,512 → 59,784 | 560,024 → 53,306 |
| Response array header | 219 → 273 | 196 → 278 |

Common single-field calls take roughly **43–73% less time on Node and 45–71%
less on Bun**. Several ordinary multi-field cases remain slower with complete
validation, up to **25% / 75%**, and the 50-field merge is about 10% slower on
Node. Large-list wins are stress results. Response benchmarks use lightweight
response-shaped objects; no HTTP throughput improvement is claimed.

[Full behavior, tradeoffs and all cases](packages/vvary/README.md),
[Node samples](packages/vvary/bench/node24.json),
[Bun samples](packages/vvary/bench/bun14.json),
[provenance](packages/vvary/PROVENANCE.json).

**Shared verification for these additions:** 159 HTTP checks pass on Node 24 and
Bun, with npm/Bun archive installations, Node/Bun CJS/ESM consumers and strict
TypeScript 7 checks. The full suite passes **505 tests on Node 24**, with **504
passing and one existing skip on Bun**. All **31 runtime packages** have
self-contained declarations.

## vcookie

**Consumer and baselines:** Express 5.3.0 calls `cookie` 0.7.2's `serialize` for
`res.cookie()` and `res.clearCookie()`. `vcookie` preserves that wire format and
also implements the four modern APIs from `cookie` 2.0.1: `parseCookie`,
`stringifyCookie`, `parseSetCookie`, and `stringifySetCookie`. Both upstream and
VPM have zero runtime dependencies. Cookie signing uses the separate
[`vcookie-signature`](packages/vcookie-signature) replacement in the shared gate.

**Verified improvements:** fresh null-prototype request maps retain names such
as `__proto__` and avoid the mutable shared prototype used by current upstream.
Serialization reads each field once, preventing getters from swapping validated
values for unchecked output. Captured Date methods accept genuine cross-realm
Dates without trusting overridden formatting methods or spoofed objects.
Safe-integer checks prevent imprecise/infinite ages. Explicit strings, booleans
and callbacks replace accidental coercion; built-in errors do not echo secrets.
Tests reproduce the current-upstream getter/date behavior; these are configuration
hardening improvements, not a claim of a demonstrated remote vulnerability.

**Compatibility:** legacy and modern parsing retain their different quote,
duplicate and custom-decoder-error contracts. Modern serialization retains
2.0.1's broader characters and encoding; the legacy adapter preserves 0.7.2's
stricter characters and `encodeURIComponent`. Strict validation rejects numeric
strings, truthy nonboolean flags, nonstring encoder/decoder results, invalid
options, spoofed Dates and unsafe ages. Modern ages must be integers; legacy
finite fractions are floored. The package README lists the complete differences.

**Evidence:** 22 focused tests include 1,500 generated headers, all byte values,
Unicode, malformed inputs, prototype isolation, getter substitution, Date
spoofing and CJS/ESM imports. At this package’s introduction the shared gate ran
**153 HTTP checks** on Node 24
and Bun, including real Express plain/Unicode/JSON/signed cookies, custom
encoding, attributes, age conversion, clearing and invalid-cookie responses.
Installed npm/Bun archives pass Node/Bun imports and strict TypeScript 7 without
platform ambient types. At that point all **29 runtime packages** had self-contained types.

**Measurements:** macOS arm64, Node 24.22.1 / Bun 1.4.0, nine alternating-order
samples per case on 2026-10-27. Median nanoseconds per call:

| Case | Baseline | Node upstream → VPM | Bun upstream → VPM |
| --- | --- | ---: | ---: |
| Express-style serialize with path | 0.7.2 | 148 → 148 | 111 → 111 |
| Serialize all attributes | 0.7.2 | 687 → 655 | 288 → 294 |
| Parse five cookies, legacy | 0.7.2 | 482 → 536 | 328 → 376 |
| Parse five cookies, modern | 2.0.1 | 473 → 535 | 350 → 353 |
| Stringify Set-Cookie, plain | 2.0.1 | 81 → 89 | 74 → 59 |
| Stringify Cookie, five values | 2.0.1 | 418 → 409 | 255 → 168 |

Express's usual serialization is essentially tied. Legacy parsing costs more
in every measured case: about 1–11% on Node and 11–22% on Bun. Modern Node
parsing generally costs more too; modern Bun serialization shows the largest
improvements. These results do not establish an application-level speedup.
Near-parity values should be treated as noise, not claimed as wins.

[Full API, tradeoffs and all benchmark cases](packages/vcookie/README.md),
[Node samples](packages/vcookie/bench/node24.json),
[Bun samples](packages/vcookie/bench/bun14.json), and
[verified source provenance](packages/vcookie/PROVENANCE.json).

## vcontent-disposition

**Consumer and baseline:** Express 5.3.0 uses `content-disposition` 2.0.1 in
`res.download()` and `res.attachment()`. The current 3.0.0 release is also retained
as an exact source fixture and benchmark baseline. Both upstream and VPM have
zero runtime dependencies. VPM keeps CommonJS and named ESM imports on Node 20+.

**Correctness:** direct null-prototype parameter maps prevent the shared-ancestor
interference reproduced in both upstream versions. Invalid primitive inputs,
parameter values and options fail explicitly, without coercion or input contents
in VPM-generated errors. Formatting rejects case-insensitive duplicate names,
ignores inherited properties, and gives explicitly encoded values precedence over
automatic encoding even when their names use different casing. Option/value
getters are read once. Exports are immutable.

Malformed Latin-1 escapes no longer override a valid ordinary fallback, and an
already-extended parameter name cannot gain another `*` through automatic
encoding. **These two fixes already exist in upstream 3.0.0** and are carried
forward, not claimed as unique VPM improvements. Parsing otherwise retains
upstream's lenient recovery; it is not a strict syntax validator or path sanitizer.
Normal valid filename output and lone-surrogate `URIError` behavior are preserved.

**Evidence:** 23 package tests include 15,000 generated parser cases against
3.0.0, 5,000 formatter comparisons with the previous VPM implementation,
1,134 standard/custom-name parsing cases, byte/Unicode encoding, malformed
inputs, 2,496 multipart scan-boundary/recovery comparisons, single-read getters
across parameter-map sizes, all 528 standard-name casings, 6,012 additional
dense/sparse/malformed-value comparisons, long quoted values,
prototype isolation, and CJS/ESM exports. At this package’s follow-up, the shared Node/Bun gate
ran **151 HTTP checks**, including real Express downloads and attachments with
Unicode, quotes, percent sequences, and control characters, HEAD/ranges, and
completion callbacks. Installed archives are checked with npm, Bun, Node, and
strict TypeScript 7. At the performance follow-up on 2026-10-27 the full suite
passed **455 tests on Node 24**, with **454 passing and one existing skip on Bun**.
At that point all **28 runtime packages** had self-contained declarations.

**Case folding and dense escape runs:** standard names are recognized in every
ASCII casing directly in the header, while custom names retain full Unicode
lowercasing. Consecutive escapes decode as a run from the original header;
searches between runs stay bounded to the current value. Validation, first-value
and extended-value rules, and independent null-prototype maps remain intact.

In nine-sample, paired comparisons on Node 24.22.1 / Bun 1.4.0 (2026-10-27),
standard mixed-case parsing takes about **22% / 38% less time than `475b3ea`**,
and consecutive dense escapes take about **66% / 74% less time**. The expanded
20-case corpus retains sparse/plain long-value gains but exposes remaining dense
overhead against upstream and a roughly 7% Node regression for escapes separated
by single literal characters. No application-level speedup is established;
Express uses `create()` for its downloads/attachments, rather than this parser.

[Current results, full samples, provenance, and remaining costs](packages/vcontent-disposition/README.md#case-folding-and-dense-escape-runs).

**Multipart parsing follow-up (`475b3ea`, historical measurements):** reuses standard lowercase parameter-name
literals and decodes very short quoted fields while finding the closing quote.
The direct scan is limited to fewer than 32 remaining code units; longer fields
and discarded duplicates retain span searches. Validation, lenient recovery,
duplicate and extended-value rules, and fresh null-prototype maps remain intact.

Three fresh processes per runtime compare current VPM with the exact
`2097f39` source and both upstream baselines. Nine samples rotate execution order;
the table reports median process medians in nanoseconds.

| Multipart case | Node previous → now | Bun previous → now |
| --- | ---: | ---: |
| plain fields | 310 → 304 | 480 → 192 |
| short escapes | 424 → 322 | 628 → 197 |
| 31-character suffix | 419 → 414 | 660 → 281 |
| 32-character suffix | 422 → 370 | 699 → 287 |
| 127-character suffix | 426 → 376 | 698 → 296 |
| 128-character suffix | 425 → 374 | 581 → 294 |
| 8 KiB sparse escapes | 814 → 764 | 977 → 731 |
| 8 KiB plain | 746 → 696 | 868 → 631 |

The original short escaped multipart benchmark now takes 6–7% less
time than upstream 2.0.1 and 7–8% less than 3.0.0 on Node 24.
This removes the previously recorded 21–22% overhead for that case without
weakening validation or sharing result maps. Mixed-case names, long dense
escapes, and unfinished values retain costs; the full table discloses them.

[Current multipart results, all six runs, two whole-API runs, and commands](packages/vcontent-disposition/README.md#multipart-parsing-follow-up).

**First performance follow-up (`2097f39`, historical measurements):** removes the temporary array/set for two-parameter
formatting, returns directly for a single parameter, uses exact matching for standard type/name literals,
skips no-op string replacements, and copies multipart escapes directly. Custom
names retain full validation; all duplicate, own-property and snapshot rules
remain. Parsing keeps fresh null-prototype maps and the existing recovery rules,
while separating type-only parsing and avoiding an empty-map duplicate lookup.

Three fresh processes per runtime, each with nine alternating samples of
50,000 calls, compare the exact previous VPM source with the optimized source.
Median process medians in nanoseconds, **VPM `bf6666b` → VPM `2097f39`**:

| Case | Node 24 | Bun 1.4 |
| --- | ---: | ---: |
| parse type only | 64 → 56 | 44 → 38 |
| parse short filename | 175 → 164 | 191 → 123 |
| parse multipart | 378 → 378 | 412 → 293 |
| format ASCII | 105 → 72 | 64 → 52 |
| format quoted | 217 → 116 | 107 → 79 |
| format Unicode | 281 → 205 | 190 → 137 |
| format fallback pair | 238 → 131 | 152 → 76 |
| format multipart pair | 413 → 182 | 296 → 101 |
| format custom pair | 228 → 194 | 147 → 118 |
| format many fields | 648 → 495 | 405 → 370 |

Standard single-/two-parameter formatting beat upstream in the separate
2.0.1 and 3.0.0 comparisons. Short unquoted Node parsing was near parity with
both versions; Node multipart parsing still took 21% and 22% more time,
respectively.
Mixed-case/custom parsing, escaped quoted values and larger Bun formatting maps
do not all improve uniformly; the full table reports those costs. Long unescaped
quoted parsing retains its substantial gain, and all correctness checks remain.
No application-throughput gain is claimed.

[Complete follow-up tables, all ten recorded runs, and reproducible commands](packages/vcontent-disposition/README.md#performance-follow-up).

**Initial implementation measurements:** the following historical results are
from commit `bf6666b`; see the follow-up above for current behavior.

**Performance:** nine warmed, alternating-order samples of 50,000 calls,
sequentially on Node 24.22.1 and Bun 1.4.0 (2026-10-27). Nanoseconds per call,
**upstream 2.0.1 → VPM**:

| Case | Node | Bun |
| --- | ---: | ---: |
| create ASCII | 155 → 83 | 99 → 50 |
| create quoted | 315 → 224 | 184 → 125 |
| create Unicode | 614 → 411 | 385 → 270 |
| parse short filename | 152 → 175 | 189 → 195 |
| parse 4 KiB quoted | 20,345 → 381 | 23,787 → 482 |
| parse multipart | 299 → 362 | 396 → 423 |
| format fallback pair | 182 → 233 | 104 → 151 |
| decode Latin-1 short | 135 → 101 | 171 → 141 |
| decode Latin-1 sparse | 1,405 → 137 | 1,458 → 175 |

Header creation and long quoted parsing improved; short parsing and general
formatting have regressions shown above and in the complete tables. These are
utility microbenchmarks, not end-to-end download throughput measurements.
The package README includes every case and a separate 3.0.0 comparison.
[Harness](packages/vcontent-disposition/bench/compare.cjs),
[Node / 2.0.1 samples](packages/vcontent-disposition/bench/node24-v2.json),
[Bun / 2.0.1 samples](packages/vcontent-disposition/bench/bun14-v2.json),
[Node / 3.0.0 samples](packages/vcontent-disposition/bench/node24-v3.json),
and [Bun / 3.0.0 samples](packages/vcontent-disposition/bench/bun14-v3.json)
record runtime versions, source hashes, and all samples.

[Full API, compatibility choices, measurements, and provenance](packages/vcontent-disposition/README.md).

## vbody-parser

**Correctness and lifecycle:** replaces body-parser 2.4.0's signed 32-bit form
parameter conversion with validated safe integers. `parameterLimit: 2 ** 32`
retains both fields in `a=1&b=2`. Numeric bounds, booleans, media patterns,
charsets and revivers are validated at factory construction, with copied type
arrays and stable option snapshots. Unsupported charsets fail before piping.

Compressed reads register the body reader before starting the pipe and observe
abort/error/premature-close events on the original request. They stop the owned
decoder and settle once when that request fails. This closes a gap where a
decoder could wait for input after the source had disconnected. Cleanup removes
the middleware's subscriptions and specific decoder pipe. Read failures drain
an open request; aborted/destroyed requests settle immediately.

Verifier and parser errors are wrapped without modifying the thrown object,
including frozen errors, strings, null and undefined. The original value becomes
`cause`, with valid custom statuses and error metadata retained. On Bun and Node
versions with native stack accessors, the original stack is resolved and cached
on first read, avoiding eager formatting when a
handler only needs status/type. Native Error/SyntaxError identity, writable stack
overrides, frozen-wrapper reads and a captured fallback trace remain supported.
Changes to the original stack before the first read are visible; subsequent
changes do not alter the cached trace. Strict JSON
scalar rejection uses a direct SyntaxError instead of allocating and reparsing
a body-sized placeholder to manufacture an engine-specific error message.

**Compatibility:** retains the four JSON/raw/text/form factories and explicit
parser subpaths, byte limits after inflation, charset decoding, synchronous
verification, revivers, nested forms and gzip/deflate/Brotli support. Zstandard
is available when the runtime supplies it, as upstream already supports.
Malformed/coercible options now fail early; use booleans and safe integer bounds.
Callback-error identity and exact messages/stacks are not preserved; the original
is available through `cause`. Internal `lib/*` exports are excluded. The default
byte limit remains 100 KiB. Applications still control request timeouts and
validation of parsed data.

**Dependencies and evidence:** nine direct dependencies remain nine, all VPM
packages; the complete external tree contains fifteen packages. No new runtime
primitive is needed. Twenty-one focused tests cover normal upstream behavior,
limits, option mutation, charsets, corrupt/truncated compression, frozen/primitive
callback failures, lazy stack reads/overrides/fallbacks, real client disconnects,
cleanup and exports. Middleware
differential tests share VPM primitives; the benchmark below uses the full stock
upstream dependency tree. At the vbody-parser follow-up on 2026-10-27, the full
suite passed **432 tests on Node** and **431
with one existing async-hooks skip on Bun**. The shared gate then passed **141 HTTP
checks on each runtime**, including this replacement in Express and Functions
Framework. Archive installations with npm and Bun pass runtime CJS/ESM and
strict TypeScript 7 checks without ambient Node, Undici or DOM types.

**Initial measurements (commit 20181c4):** 2026-10-27, macOS arm64, Node 24.22.1 / Bun 1.4.0. The
[benchmark](packages/vbody-parser/bench/compare.cjs) sends sequential localhost
HTTP requests over keep-alive connections, consumes parsed results and checks
response parity on every request. Each value is the median of nine alternating
samples of 1,000 requests, after 1,000 warmups per implementation and case.
Values are **upstream → VPM microseconds per complete request/response**;
they include HTTP, parsing, a small response and assertion overhead.
[Node samples](packages/vbody-parser/bench/node24.json) and
[Bun samples](packages/vbody-parser/bench/bun14.json) record the source and
consumer-lock hashes. The upstream side is body-parser 2.4.0 with its complete
locked dependency tree, without VPM substitutions.

| Case | Node µs/request | Bun µs/request |
| --- | ---: | ---: |
| JSON / 1 KiB | 83.10 → 73.27 | 72.14 → 72.44 |
| JSON / 64 KiB | 256.64 → 259.25 | 223.94 → 214.16 |
| JSON / verify | 72.02 → 71.34 | 71.07 → 72.20 |
| JSON / gzip 64 KiB | 283.38 → 274.32 | 347.17 → 353.28 |
| form / flat | 74.61 → 75.91 | 74.38 → 72.45 |
| form / nested | 75.00 → 72.87 | 75.81 → 75.30 |
| text / UTF-8 13 KiB | 158.01 → 156.36 | 115.32 → 106.07 |
| raw / 64 KiB | 100.83 → 94.06 | 106.50 → 101.54 |
| JSON / malformed | 87.34 → 89.81 | 85.72 → 92.07 |

Results are mixed: successful cases range from **11.8% faster to 1.7% slower on
Node**, and **8.0% faster to 1.8% slower on Bun**. Malformed JSON is **2.8% slower
on Node and 7.4% slower on Bun**, with an additional error wrapper preserving the
original exception. This comparison does not isolate the cost of any one change.
An initial shorter run had noisier results, including Bun slowdowns that did not
repeat in the longer run; its [Node](packages/vbody-parser/bench/node24-short.json)
and [Bun](packages/vbody-parser/bench/bun14-short.json) samples are retained.
These initial figures predate the stack optimization below. No broad speedup,
production throughput improvement or security outcome is established. The
demonstrated benefits include configuration, error and stream lifecycle
correctness and a fully VPM dependency tree.

**Error-stack follow-up:** the previous wrapper allocated a native Error and
immediately read/formatted the original stack before copying it. Retaining an
independent native error and its `cause` is useful; eagerly formatting that trace
is unnecessary for handlers that only return status/type. The updated wrapper
resolves the original trace once, when `stack` is read. It retains its own captured
trace as a fallback rather than substituting a plain object for a native Error.
Older V8 versions eagerly materialize stack descriptors, making this approach
more expensive. They retain a single eager copy. The focused Node 20.20.2
comparison is essentially unchanged: **13.882 → 13.851 µs** without reading
the trace and **13.765 → 13.688 µs** with a stack read.
[Node 20 samples](packages/vbody-parser/bench/errors-node20.json) record that
compatibility path; no Node 20 speedup is claimed.

The [focused benchmark](packages/vbody-parser/bench/errors.cjs) uses an exact,
hash-checked copy of the previous helper from 20181c4 and fresh native JSON parse
failures. Nine alternating 10,000-operation samples follow 5,000 warmups per case.
On Node 24.22.1, parse-and-wrap without reading the trace improves from **15.232
to 6.828 µs (55.2%)**; Bun 1.4.0 improves from **3.939 to 2.975 µs (24.5%)**.
When the complete trace is read, Node changes **13.690 → 14.405 µs (5.2% slower)**
and Bun **4.041 → 4.400 µs (8.9% slower)**. Formatting work is deferred, not
eliminated for logging. [Node samples](packages/vbody-parser/bench/errors-node24.json)
and [Bun samples](packages/vbody-parser/bench/errors-bun14.json) record source
hashes and every sample. These are isolated error-path measurements, not HTTP
or logging I/O measurements.

The complete HTTP benchmark was rerun on the final implementation with the same
method and all nine cases. Malformed JSON now measures **96.60 → 89.83 µs on
Node (7.0% less time)** and **78.38 → 77.34 µs on Bun (1.3% less)** relative to
stock body-parser in the same run. The Bun difference is close to parity; earlier
exploratory runs showed larger gains that did not persist. Successful cases range
from **12.3% faster to 0.9% slower on Node**, and **3.3% faster to 3.5% slower on
Bun**. HTTP timings vary across runs, so absolute timings from different runs
should not be compared as an isolated effect of this change.
[Final Node HTTP samples](packages/vbody-parser/bench/node24-lazy-stack.json) and
[final Bun HTTP samples](packages/vbody-parser/bench/bun14-lazy-stack.json) include
all results and source hashes. This supports removing the previously measured
malformed-JSON regression, while retaining the error and lifecycle fixes; it does
not establish a general application speedup.

## vundici-types and vnode-types

**Declaration correctness:** `vundici-types` adds the missing `RequestInit.cache`
and Request/Response `.bytes()` declarations, permits the runtime's default
status for `Response.redirect(url)`, and requires a Blob when FormData append/set
receives a third argument. Two-argument coercible values remain supported. The
gate reproduces these gaps in undici-types 6.21.0 and verifies the corrected
signatures against Undici 6.21.3 and native Node/Bun behavior. These findings do
not imply the latest Undici major has the same gaps.

**Complete API coverage and focused loading:** all 38 upstream Undici declaration
files and 68 modern Node declaration files are retained, with source hashes and
licenses. Three legacy compiler compatibility files are omitted and recorded in
the provenance data; the modern Node API remains complete.
The new `vundici-types/web` entry point supplies Fetch, FormData, WebSocket, and
EventSource declarations to `vnode-types`. Required dispatcher/client types remain
reachable; unrelated agent/pool/mock exports are not loaded by ordinary Node
consumers. The full Undici API remains available from the root entry point.

**Compatibility:** `vnode-types` targets Node 22, based on @types/node 22.20.5;
it is not a declaration set for every Node major. The workspace's update from
22.14.1 also includes upstream maintenance improvements, not VPM inventions.
Both packages require TypeScript 7.0.2 or later. Select `vnode-types` explicitly
in `compilerOptions.types`. A small compatibility type root handles third-party
`reference types="node"` directives without installing duplicate Node declarations.
The package README documents this configuration and its limits. FormData's
stricter filename overload may reject previously accepted code that throws at
runtime. DOM projects continue to use TypeScript's standard browser globals.

**Dependency accounting:** `vnode-types` depends on `vundici-types`; the latter
requires `vnode-types` as a peer for Node APIs. This is an explicit declaration
dependency cycle, with no JavaScript runtime code. The workspace no longer uses
upstream Node/Undici declarations for its own type checks. Upstream packages
remain as test-only development dependencies in a separately locked
[comparison fixture](scripts/type-consumers/README.md), outside the workspace
and package archives. They reproduce the original gaps and check corrected
declarations against an actual Undici runtime. Replacing that baseline with VPM
would compare VPM against itself. All 39 runtime packages'
public declarations also compile without any Node, Undici, or DOM ambient types.

**Evidence:** strict type gates run on the workspace's TypeScript 7.0.2 CLI,
including CJS/ESM consumers and projects with and without DOM declarations.
Isolated archive installations check the real published-file selection and
rewritten workspace dependency versions. A reproducibility check compares every
declaration against pinned source archives plus explicit patches. No
`skipLibCheck` workaround is used. Legacy compiler dependencies, fixtures, and
version-routing metadata have been removed. Upstream declaration/runtime
comparisons use the same current compiler as VPM.

**Measurements:** with the same 18 runtime-package type consumers, upstream
Node 22.20.5, TypeScript 7.0.2, and ES2022-only strict configuration, the loaded
Undici graph shrank from **37 to 13 files**. All loaded files fell from **198 to
174**. Five alternating fresh-process samples on Node 24.22.1/macOS arm64 had
median compiler-reported memory of **69,277 → 67,686 KiB** (about 2% lower),
check time of **0.049 → 0.048 seconds**, and total compiler time of **0.067 →
0.065 seconds**, excluding process startup. Those millisecond differences do not
establish a compilation speedup or any application runtime improvement. See the
[method, raw measurements, and adoption guide](packages/vnode-types/README.md).

## Reading and extending this record

Benchmark tables identify the runtime, date, inputs, and sampling method. Most
measure individual utility calls; `vsend`, `vserve-static` and `vbody-parser` measure sequential localhost HTTP
requests. Neither establishes production throughput, tail latency, or application
memory use. Known regressions belong beside gains. A correctness fix or easier
auditing does not by itself establish that an exploitable vulnerability was fixed.

Packages are currently available from this repository as standard package
archives. Registry publication, automatic replacement of installed dependencies,
and native VPM support in `bun install` remain future work. Applications benefit
only after adopting and validating the replacements they use.

When adding or changing a package, update its row and detail section here in the
same change. Record the exact upstream baseline, concrete differences, relevant
tests or measurements, and compatibility costs. Keep aspirations in the project
roadmap and demonstrated improvements in this document.
