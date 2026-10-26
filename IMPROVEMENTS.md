# VPM improvements

A central record of what VPM changes, why those changes matter, and the evidence
behind them. Comparisons use the specific upstream versions below. They do not
imply that every VPM package is faster, that upstream packages are insecure, or
that these replacements have already improved application performance.

## Package comparison

| VPM package | Compared with | Main improvements |
| --- | --- | --- |
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

Every package includes TypeScript declarations, CommonJS and ES module import
support, an explicit Node.js 20+ baseline, tests exercised on Node.js and Bun,
and documented origins and licenses. Consumers do not need a separate types
package. Test fixtures and benchmarks stay out of installable archives.

Most replacements preserve their runtime dependency counts. Both versions of
each utility have zero external runtime dependencies, except
`on-finished` / `von-finished`, `debug` / `vdebug`, and `mime-types` /
`vmime-types`, which each declare one,
`serve-static` / `vserve-static`, which each declare four,
`finalhandler` / `vfinalhandler`, which each declare six,
`send` / `vsend`, which each declare eleven, and `http-errors` /
`vhttp-errors`, which declare **five and one**, respectively.
`von-finished` replaces `ee-first` with `vee-first`, and `vdebug` replaces `ms`
with `vms`. Upstream `debug` also tries to load its optional peer `supports-color`;
`vdebug` uses built-in terminal detection instead. Built-in Node.js modules are
not external packages.

`vsend` uses eleven direct VPM dependencies, with `vee-first` and `vmime-db`
bringing its complete external dependency tree to thirteen VPM packages.
`vserve-static` completes the modern static-file path with four direct and fifteen
total external VPM dependencies. Its dependencies are all existing VPM packages.

## The target dependency graph

VPM's targets come from [ventimath](https://github.com/johnclyde-org/ventimath-private)'s
Cloud Functions gen 2 HTTP path. The reproducible consumer fixture also tests
parent upgrades before choosing which dependencies to replace. Its current
upgrade target is Functions Framework 5.0.2 serving `firebase-functions` 7.4.0
`onRequest` handlers through Express 5.3.0, `body-parser` 2.4.0, `router` 2.2.0,
`send` 1.2.1, and `serve-static` 2.2.1. Updating this fixture does not update or
deploy the application. Every package above targets the corresponding upstream
version in this graph. `jsonwebtoken` 9.0.3 reaches `ms`, and the proxy agents
under `firebase-admin` reach `debug`.

The fixture previously pinned Express 5.2.1 and `body-parser` 2.2.2, both of
which requested `content-type ^1.0.5`. Upgrading those parents to
[Express 5.3.0](https://github.com/expressjs/express/releases/tag/v5.3.0) and
[body-parser 2.4.0](https://github.com/expressjs/body-parser/releases/tag/v2.4.0)
removes 1.x and consolidates three installed copies into one `content-type`
2.1.0 shared by Express, body-parser, type-is, and negotiator. No parser override
is needed. An override alone would be incorrect: the old body-parser passes
the request object to `parse()`, while 2.x accepts a header string, causing
the old caller to silently lose charset information. This makes 2.x the next
VPM replacement baseline. The newer
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
every VPM package into every installed copy of its upstream, inside its own
process, then serves an `onRequest` handler and an Express application through
the Functions Framework and runs 65 HTTP checks: JSON bodies and malformed
bodies, UTF-16 decoding and unsupported charset rejection, weighted Accept
negotiation with quoted commas, preservation of Content-Type parameters when
Express changes the charset, CORS preflight, `res.set('Content-Type')` with syntax upstream
tolerated, conditional requests with quoted-comma tags and forced reloads,
redirect encoding and escaping, `sendFile` and `serve-static` with ranges,
HEAD, mounted-root redirects, static redirect/405 framing, download and empty-file
callbacks, extension fallback, dotfile policy,
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
failure paths, disconnections, and HTTP/2. The shared integration gate passed
65 HTTP checks through the pinned Functions Framework/Express stack on Node and
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
multiple roots, and HTTP/2. The shared integration gate now runs 65 HTTP checks
through the Express 5 Cloud Functions stack with `vserve-static` installed by
process-local alias. Existing middleware no longer observes later configuration
mutations, and invalid options fail earlier. The `vsend` limitations still apply.

**Performance:** complete-stack GETs were **6–10% slower**, HEAD **4–15% slower**,
redirects **7–11% slower**, and missing files **5–12% slower** in one local run.
405 was close on Node and about 10% faster on Bun. A comparison using the same
VPM dependencies on both sides was mixed; no general speedup is established.
[Full API, compatibility notes, measurements, and installation](packages/vserve-static/README.md).

## Reading and extending this record

Benchmark tables identify the runtime, date, inputs, and sampling method. Most
measure individual utility calls; `vsend` and `vserve-static` measure sequential localhost HTTP
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
