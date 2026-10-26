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

Every package includes TypeScript declarations, CommonJS and ES module import
support, an explicit Node.js 20+ baseline, tests exercised on Node.js and Bun,
and documented origins and licenses. Consumers do not need a separate types
package. Test fixtures and benchmarks stay out of installable archives.

Most replacements preserve their runtime dependency counts. Both versions of
each utility have zero external runtime dependencies, except
`on-finished` / `von-finished`, `debug` / `vdebug`, and `mime-types` /
`vmime-types`, which each declare one,
`finalhandler` / `vfinalhandler`, which each declare six, and `http-errors` /
`vhttp-errors`, which declare **five and one**, respectively.
`von-finished` replaces `ee-first` with `vee-first`, and `vdebug` replaces `ms`
with `vms`. Upstream `debug` also tries to load its optional peer `supports-color`;
`vdebug` uses built-in terminal detection instead. Built-in Node.js modules are
not external packages.

`vmime-types` replaces `mime-db` with `vmime-db`, completing VPM counterparts for
the supporting utilities used by modern `send` 1.2.1 and `serve-static` 2.2.1.
The replacements for
`send` and `serve-static` themselves remain future work. Older Express 4 uses a
different static stack, including `mime` 1.x, and has not been migrated.

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
content encoding/language/range headers. Header arrays are copied before draining.
Statuses must be integers from 400 to 599, and unknown codes receive a defined
phrase. Empty or unavailable pathnames get a readable fallback.

**Compatibility:** retains the callback API, production message hiding, HTML
formatting, HEAD behavior, HTTP/2 handling, and asynchronous error reporting.
Repeated accepted calls do not write again, but later errors are still passed
to `onerror`, so Express and connect keep logging them. Invalid error callbacks
fail at construction. All six
dependencies have VPM counterparts; their documented differences also apply.

**Evidence:** [29 tests](packages/vfinalhandler/test), including 480 differential
normal-response combinations and real HTTP/1 and HTTP/2 connections on Node and
Bun. Tests reproduce the upstream conflicting-framing failure and verify the
corrected response, upload draining, abort cleanup, and connection reuse. Optional
integration checks passed with Express 4.22.1 and 5.2.1 on both runtimes.

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
Combined Express 4/5 checks exercised all three replacements under Node and Bun.

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
constructors took 14–40% more time**. Full Express 4/5 integrations exercise JSON
errors, upload limits, and final responses on Node and Bun.
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
2,000 generated valid tag lists. Express integrations verify real 304 and forced
reload responses. Single tags and dates were close in benchmarks; matching long
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
Twenty-three real HTTP checks passed in Express 5.2.1 on Node and Bun, including
send/serve-static, negotiation, downloads, and JSON parsing. Content-Type from an
extension measured about **4.4× faster on Node and 12.3× faster on Bun**;
parameterized headers were **63–105% slower**, and full-path lookup was **13%
slower on Node**. These are microbenchmarks, not application throughput results.
[Full API, validation, benchmarks, and installation](packages/vmime-types/README.md).

## Reading and extending this record

Benchmark tables identify the runtime, date, inputs, and sampling method. They
measure individual calls, not HTTP throughput, tail latency, or application
memory. Known regressions belong beside gains. A correctness fix or easier
auditing does not by itself establish that an exploitable vulnerability was fixed.

Packages are currently available from this repository as standard package
archives. Registry publication, automatic replacement of installed dependencies,
and native VPM support in `bun install` remain future work. Applications benefit
only after adopting and validating the replacements they use.

When adding or changing a package, update its row and detail section here in the
same change. Record the exact upstream baseline, concrete differences, relevant
tests or measurements, and compatibility costs. Keep aspirations in the project
roadmap and demonstrated improvements in this document.
