# VPM improvements

A central record of what VPM changes, why those changes matter, and the evidence
behind them. Comparisons use the specific upstream versions below. They do not
imply that every VPM package is faster, that upstream packages are insecure, or
that these replacements have already improved application performance.

## Package comparison

| VPM package | Compared with | Main improvements |
| --- | --- | --- |
| [vee-first](packages/vee-first) | ee-first 1.1.1 | Once-only event dispatch, registration rollback, and cleanup under reentrant event hooks. |
| [von-finished](packages/von-finished) | on-finished 2.4.1 | Private callback queues, individual registration-time async contexts, and more reliable socket-listener cleanup. |
| [vparseurl](packages/vparseurl) | parseurl 1.3.3 | Private caches, frozen-request support, cache keys isolated from mutable results, and explicit invalidation. |
| [vencodeurl](packages/vencodeurl) | encodeurl 2.0.0 | Repairs consecutive unpaired surrogates, incomplete percent escapes, and accidental double encoding. |
| [vescape-html](packages/vescape-html) | escape-html 1.0.3 | Skips long unchanged spans while preserving the exact escaping and coercion contract. |

Every package includes TypeScript declarations, CommonJS and ES module import
support, an explicit Node.js 20+ baseline, tests exercised on Node.js and Bun,
and documented origins and licenses. Consumers do not need a separate types
package. Test fixtures and benchmarks stay out of installable archives.

Runtime dependency counts have **not** fallen for these replacements: both
versions of each utility have zero external runtime dependencies, except
`on-finished` / `von-finished`, which each have one. `von-finished` replaces
`ee-first` with `vee-first`; built-in Node.js modules are not external packages.

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
Each queued callback has its own `AsyncResource`, preserving the context in which
that callback was registered; resources are released after dispatch. Finishing
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
