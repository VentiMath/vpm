# VPM improvements

A central record of what VPM changes, why those changes matter, and the evidence
behind them. Comparisons use the specific upstream versions below. They do not
imply that every VPM package is faster, that upstream packages are insecure, or
that these replacements have already improved application performance.

## Latest stable upgrade roadmap

Latest stable upstream versions set the compatibility target. Backend and
frontend consumers determine the API scope and order of work; runtime facilities
are reused where they satisfy those requirements. The comparison versions below
record verified coverage, including older application compatibility; they do not
establish parity with every upstream API. The roadmap records known gaps, not a
completed freshness audit of the entire catalog.

The Google authentication stack was checked against npm's `latest` tags on
October 29, 2026. Its HTTP, metadata, logging and core authentication caller paths
now have current comparison targets:

| Order | VPM package | Verified comparison baseline | Latest stable target |
| --- | --- | --- | --- |
| Complete | vgoogle-logging-utils | 2.1.1, plus adapted 0.0.2 coverage | [google-logging-utils 2.1.1](https://www.npmjs.com/package/google-logging-utils) |
| Caller paths verified | vnode-fetch | 2.7.0 API; Gaxios 7.1.3/8.3.2 transport checks against node-fetch 3.3.2 | [node-fetch 3.3.2](https://www.npmjs.com/package/node-fetch), scoped to tested callers |
| Complete | vgaxios | 8.3.2 API; Google Auth 10.6.1/11.3.2 callers | [gaxios 8.3.2](https://www.npmjs.com/package/gaxios) |
| Complete | vgcp-metadata | 9.2.3 API; Google Auth 10.6.1/11.3.2 callers | [gcp-metadata 9.2.3](https://www.npmjs.com/package/gcp-metadata) |
| Core caller paths verified | vgoogle-auth-library | 11.3.2; selected credential and token APIs | [google-auth-library 11.3.2](https://www.npmjs.com/package/google-auth-library) |
| Caller paths verified | vyocto-queue / vp-limit | Queue 1.2.2, limiter 7.3.3; Storage 8.4.0 batches replacing p-limit 3.1.0 | [yocto-queue](https://www.npmjs.com/package/yocto-queue), [p-limit](https://www.npmjs.com/package/p-limit), checked October 30, 2026 |
| Caller paths verified | vpromisify / vprojectify | Both 6.2.1; Storage 8.4.0 wrappers and request decoration | [promisify](https://www.npmjs.com/package/@google-cloud/promisify), [projectify](https://www.npmjs.com/package/@google-cloud/projectify) |
| Caller paths verified | vpaginator | 7.2.0; Storage 8.4.0 listing APIs | [@google-cloud/paginator 7.2.0](https://www.npmjs.com/package/@google-cloud/paginator) |
| Caller paths verified | vduplexify | 4.1.3; Storage 8.4.0 and google-gax 6.14.0 streams | [duplexify 4.1.3](https://www.npmjs.com/package/duplexify) |
| Complete | vretry-request | 9.1.0; Cloud Storage 8.4.0/google-gax 6.14.0 caller paths | [retry-request 9.1.0](https://www.npmjs.com/package/retry-request) |
| Caller paths verified | vteeny-request | 11.1.1 upstream suite and Storage 8.4.0 callbacks/downloads/multipart uploads | [teeny-request 11.1.1](https://www.npmjs.com/package/teeny-request) |
| Complete | vstream-events | 1.0.5; teeny-request 11.1.1 and current Storage/gax callers | [stream-events 1.0.5](https://www.npmjs.com/package/stream-events), used by teeny-request 11.1.1 |
| Complete | vagent-base | 9.0.0 API, current ESM proxy caller and retained 7.1.4 coverage | [agent-base 9.0.0](https://www.npmjs.com/package/agent-base), required by current http-proxy-agent 9.1.0 |
| Caller paths verified | vhttp-proxy-agent | 9.1.0 upstream suite; teeny-request 11.1.1/Storage 8.4.0 callers replacing 7.0.2 | [http-proxy-agent 9.1.0](https://www.npmjs.com/package/http-proxy-agent) |

The Gaxios upgrade now uses native fetch for ordinary calls, with explicit stream,
redirect, size and deadline handling. Node agents, proxies and client certificates
use the VPM transport. A general node-fetch 3 package alias remains disabled;
the exercised caller paths do not require one.

Google Auth 11 is the direct target; implementing versions 9 and 10 first is not
a prerequisite. Its current manifest uses gaxios, gcp-metadata,
google-logging-utils, jws, base64-js, and ecdsa-sig-formatter. It no longer depends
on gtoken. Existing `vgtoken` work remains useful for older callers, while its own
latest stable 8.0.0 compatibility remains unverified. The `json-bigint` 1.0.0
dependency of current gcp-metadata still matches the existing comparison baseline.
`vgoogle-auth-library` uses four VPM dependencies; native Base64 conversion and
VPM JWS verification remove the other two helpers. Dedicated external-provider
suites and live cloud deployment remain outside its verified scope.

`vagent-base` now covers 9.0.0, including structural delegation and the current
ESM proxy caller. `vhttp-proxy-agent` covers the 9.1.0 ordinary forwarding API
and verifies teeny-request 11.1.1/Storage 8.4.0 callers still using 7.0.2. Automatic
Negotiate and `onProxyAuth` are explicitly unsupported; the optional native
Kerberos helper is omitted. These features were not found in application calls.
`vteeny-request` now covers the 11.1.1 callback/download API and actual Storage
multipart uploads, using four VPM dependencies throughout. It uses `vnode-fetch`
on Node 24 and Bun for Node streams and proxy agents; a node-fetch 3 alias is
still unnecessary for these caller paths.

Recheck stable versions when each step begins. Updates need pinned upstream
conformance and consumer tests, types, benchmarks, and documented intentional
differences before their latest-version parity is considered complete. Existing
version-scoped integration aliases remain limited to their tested baselines.

## Package comparison

| VPM package | Compared with | Main improvements |
| --- | --- | --- |
| [vyocto-queue](packages/vyocto-queue) | yocto-queue 1.2.2 | Zero dependencies; constant-time FIFO operations, current live iteration/draining semantics, direct private-state initialization and CommonJS/ESM entry points. |
| [vp-limit](packages/vp-limit) | p-limit 7.3.3; 3.1.0 Storage caller coverage | VPM-only queue; avoids queue allocations for free slots, forwards wrapper arguments directly, preserves async context and current rejection safeguards. |
| [vpromisify](packages/vpromisify) | @google-cloud/promisify 6.2.1 | Zero dependencies; safe method wrapping, captured options, settled callbacks, thenable handling and unambiguous falsy rejections. |
| [vprojectify](packages/vprojectify) | @google-cloud/projectify 6.2.1 | Zero dependencies; literal token substitution, own-data traversal, null-prototype records, cycles and deep inputs. |
| [vpaginator](packages/vpaginator) | @google-cloud/paginator 7.2.0 | VPM-only dependency; isolated queries, nonmutating pages, backpressure, cancellation, validated limits and current Storage listings. |
| [vduplexify](packages/vduplexify) | duplexify 4.1.3 | Zero dependencies; native streams, settled teardown, preserved falsy end values, nonmutating options, explicit premature-close errors and current Storage/gax callers. |
| [vteeny-request](packages/vteeny-request) | teeny-request 11.1.1 | Four VPM dependencies; total deadlines, canceled connections, ordered multipart completion, immutable request options, bounded isolated proxy pools and safe error messages. |
| [vhttp-proxy-agent](packages/vhttp-proxy-agent) | http-proxy-agent 9.1.0; 7.0.2 caller coverage | Two VPM dependencies, prepared absolute requests, preserved streamed bodies, bounded TCP/TLS connections, credential-safe diagnostics and isolated configuration. |
| [vstream-events](packages/vstream-events) | stream-events 1.0.5 | Zero dependencies; independent once-only read/write notifications, exact method results and receivers, reentrant restoration and validation before mutation. |
| [vretry-request](packages/vretry-request) | retry-request 9.1.0 | Zero dependencies; cancelled backoff, once-only attempt settlement, monotonic retry budgets, bounded timers, isolated stream events and safe transport teardown. |
| [vgoogle-auth-library](packages/vgoogle-auth-library) | google-auth-library 11.3.2 | Four VPM dependencies; isolated JWT caches, shared forced refreshes, per-owner private-key parsing, strict ID-token verification and private debug messages. |
| [vgcp-metadata](packages/vgcp-metadata) | gcp-metadata 9.2.3 | Entirely VPM runtime tree; first-success endpoint races, finite deadlines, direct requests, credential-safe errors/logs, bounded bulk reads and endpoint-aware availability caching. |
| [vjson-bigint](packages/vjson-bigint) | json-bigint 1.0.0 | Zero dependencies; exact numeric wrappers/native bigints, strict JSON syntax, bounded parsing, exact prototype-key policies, reentrant serialization and safe replacers. |
| [vgoogle-logging-utils](packages/vgoogle-logging-utils) | google-logging-utils 2.1.1 / 0.0.2 | Current activation/stdout behavior, structured filtering and protected message fields, public custom-backend support, stable logger identity, correct chaining, inert disabled loggers and isolated sink failures; zero dependencies. |
| [vgtoken](packages/vgtoken) | gtoken 7.1.0 | Shared forced refreshes, cached RSA key imports, validated expiry, bounded exchanges, credential-safe errors and POST-body revocation on the VPM HTTP/signing stack. |
| [vgaxios](packages/vgaxios) | gaxios 8.3.2 | Native fetch by default, modern Headers/Response APIs, isolated error state, bounded retries/streams/redirects and VPM transport for Node agents, proxies and mTLS. |
| [vnode-fetch](packages/vnode-fetch) | node-fetch 2.7.0 | Native URL handling, checked limits, cross-origin credential isolation, reliable stream cancellation and byte-preserving body collection. |
| [vuuid](packages/vuuid) | uuid 9.0.1 | Native name hashing, nonmutating random input, checked byte/clock/buffer bounds and exact UUID validation; zero dependencies. |
| [vextend](packages/vextend) | extend 3.0.2 | Own enumerable strings and symbols, inherited-target isolation, cycle/shared-reference preservation and lazy iterative merging. |
| [vis-stream](packages/vis-stream) | is-stream 2.0.1 | Rejects null internal stream state and avoids duplicate pipe probes in duplex/transform checks. |
| [vhttps-proxy-agent](packages/vhttps-proxy-agent) | https-proxy-agent 7.0.6 | Bounded CONNECT parsing and deadlines, linear fragmented-header buffering, isolated TLS policies, cancellation cleanup, safe header snapshots and preserved tunnel bytes. |
| [vagent-base](packages/vagent-base) | agent-base 9.0.0 / 7.1.4 | Structural delegation with guarded dispatch, CommonJS and ESM exports, zero dependencies, bounded async connects, cancellation cleanup, queue failure recovery, delegation-cycle rejection, private JSON errors and exact byte collection. |
| [vjwks-rsa](packages/vjwks-rsa) | jwks-rsa 3.2.2 | One dependency, native public-key import, shared concurrent retrieval, immutable cached keys, bounded HTTP requests, exact IDs and algorithm agreement. |
| [vjsonwebtoken](packages/vjsonwebtoken) | jsonwebtoken 9.0.3 | Two dependencies, finite claim/time validation, reliable callbacks, direct HMAC key import and bounded public-key reuse. |
| [vjws](packages/vjws) | jws 4.0.1 | Exact byte payloads, UTF-8 headers, canonical compact parsing, algorithm agreement, bounded header reuse and linear stream collection using vjwa. |
| [vjwa](packages/vjwa) | jwa 2.0.1 | Zero dependencies, native ECDSA signature format, canonical encodings, explicit key/algorithm matching and bounded public-key reuse. |
| [vfunctions-framework](packages/vfunctions-framework) | @google-cloud/functions-framework 5.0.2 | Entirely VPM runtime tree, portable types, isolated request context, exact buffer-view logging, thenable handling, Bun event support, and corrected timeout lifecycle. |
| [vread-package-up](packages/vread-package-up) | read-package-up 11.0.0 | Zero dependencies for raw manifest lookup, explicit boundaries, descriptor checks and cleanup, strict UTF-8, and errors without source contents. |
| [vminimist](packages/vminimist) | minimist 1.2.8 | Coherent transitive aliases, boolean-alias fixes, own-property configuration, reserved positional arrays, validated snapshots, and non-variadic argument tails. |
| [vcors](packages/vcors) | cors 2.8.5 / 2.8.6 | Compiled static policies, isolated RegExp state, once-only callbacks, dynamic denial cache variation, validated headers, coherent preflight framing, and one dependency instead of two. |
| [vexpress](packages/vexpress) | express 5.3.0 | Entirely VPM dependency tree, exact binary-view responses, coherent framing, validated settings/registration, nonmutating options, once-only view completion, and specialized response paths. |
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

## Current verification

The root suite contains **2,373 tests**: all pass on Node 24, and Bun passes
2,370 with three documented runtime-specific skips. All 70 runtime packages'
public declarations compile without ambient Node, Undici or DOM types, under
TypeScript 7 and under the TypeScript 5.8 and 5.9 compilers downstream
applications use. The
catalog covers **72 packages**, including two declaration-only packages.

Runtime verification and performance work target Node.js 24 and Bun. Packages
include their own TypeScript declarations and provide CommonJS and native ES
module imports. CI runs the package and integration suites on these same two
runtimes. Separate archive gates verify npm/Bun installation,
exported files, module imports and TypeScript 7 consumers. Test fixtures and
benchmarks are excluded from installable archives.

The [Express conformance suite](scripts/express-conformance/README.md) adds
1,261 upstream tests on Node 24, with documented expectation changes for VPM
behavior. Bun runs 1,255 with six upstream-reproduced runtime limitations.
The [Functions Framework suite](scripts/framework-conformance/README.md) adds
105 upstream tests on each runtime, with no assertion changes or skips.
The [JWT suite](scripts/jwt-conformance/README.md) adds 512 cases on Node and
509 on Bun, with three documented Bun limitations. The
[JWKS suite](scripts/jwks-conformance/README.md) adds 88 cases on each runtime
without skips, with one timeout-code correction. The
[router suite](scripts/router-conformance/README.md) adds router 2.2.0's 694
unchanged tests on Node; Bun runs 693, with one upstream-reproduced `OPTIONS *`
limitation. These upstream suites are separate from the root test count.
The [Agent suite](scripts/agent-conformance/README.md) adds all 16 current and 15 older upstream
cases on both runtimes, with documented fixture adaptations and current ESM
proxy caller checks. The
[HTTPS proxy suite](scripts/https-proxy-conformance/README.md) adds all 18 local
upstream cases on each runtime, also checked against upstream itself.
The [Google HTTP fixture](scripts/google-http-conformance/README.md) adds 90
extend assertions (one obsolete intrinsic-removal test skipped), 47 is-stream
assertions, 45 UUID tests, 214 Fetch tests (two conditional tests pending) and
133 applicable Gaxios 8 tests (three private/packaging cases excluded), 45 gtoken tests, 27 logging suite entries across two versions, 18 json-bigint tests
and 77 metadata tests on both runtimes. Its documented adaptations are also checked
against the published upstream implementations. The [Google Auth suite](scripts/google-auth-conformance/README.md)
adds 545 selected upstream tests on each runtime, with original upstream controls
and 17 focused VPM regression/consumer tests in the root suite. The
[retry-request suite](scripts/retry-request-conformance/README.md) adds all 30
upstream tests on each runtime, upstream controls, deterministic timer checks and
current Cloud Storage/google-gax caller checks; 30 VPM regression tests are in the
root suite. The [stream-events suite](scripts/stream-events-conformance/README.md)
adds all four upstream tests on both runtimes, independent bug controls and
teeny-request download checks; 21 focused VPM tests are in the root suite.
The [teeny-request suite](scripts/teeny-conformance/README.md) adds all 116 active
upstream cases on both runtimes, with two retained upstream skips, explicit
control outcomes and Cloud Storage multipart caller checks. Its 28 focused
regression tests are in the root suite. The
[duplexify suite](scripts/duplexify-conformance/README.md) adds all 16 upstream
cases and 37 original assertions on both runtimes, plus one VPM premature-close
assertion. Its 32 focused root tests and current Storage/gax callers exercise
buffering, dynamic attachment, pending-operation settlement and cancellation.

The [paginator suite](scripts/paginator-conformance/README.md) adds all 65
upstream cases on both runtimes and original controls, plus current Storage
listing checks. Its 28 focused regression tests are in the root suite.

The [Cloud utility suite](scripts/cloud-utils-conformance/README.md) adds 27
promisify and five projectify upstream cases with original controls on both
runtimes, plus actual Storage wrapper/decorator checks. Its 36 focused tests
are in the root suite.

The [Queue and concurrency suite](scripts/queue-limit-conformance/README.md) adds
all seven queue and 30 limiter upstream cases with original controls on both
runtimes. Its 23 focused tests are in the root suite; actual Storage batch methods
exercise six limiters and 125 tasks, also checked with upstream 3.1.0 and 7.3.3.

## Dependency scope

The Express application stack is implemented throughout: `vexpress` has 28 direct
and 39 total external runtime dependencies, all VPM packages.
`vfunctions-framework` uses five direct and 42 total external VPM packages.
`vcors` uses only
`vvary`. Built-in Node modules are not external dependencies.

| Replacement | Upstream direct dependencies | VPM direct dependencies |
| --- | ---: | ---: |
| `vyocto-queue` | 0 | 0 |
| `vp-limit` | 1 | 1 (all VPM) |
| `vpromisify` | 0 | 0 |
| `vprojectify` | 0 | 0 |
| `vpaginator` | 1 | 1 (all VPM) |
| `vduplexify` | 4 | 0 |
| `vteeny-request` | 4 | 4 (all VPM) |
| `vstream-events` | 1 | 0 |
| `vretry-request` | 1 | 0 |
| `vgoogle-auth-library` | 6 | 4 |
| `vgtoken` | 2 | 2 |
| `vgaxios` | 3 | 3 |
| `vnode-fetch` | 1 | 1 |
| `vjwks-rsa` | 5 | 1 |
| `vjsonwebtoken` | 10 | 2 |
| `vjws` | 2 | 1 |
| `vjwa` | 3 | 0 |
| `vhttp-errors` | 5 | 1 |
| `viconv-lite` | 1 | 0 |
| `vraw-body` | 4 | 3 |
| `vqs` | 2 | 0 |
| `vonce` | 1 | 0 |
| `vrouter` | 5 | 3 |
| `vcors` | 2 | 1 |
| `vread-package-up` | 3 | 0 |
| `vfunctions-framework` | 7 | 5 |

`vnode-fetch` replaces the three-package legacy URL subtree with native URL
support and retains `viconv-lite` for the optional legacy conversion API.
`vgaxios` has seven total external runtime dependencies, all VPM packages.
`vgtoken` adds service-account exchanges using `vgaxios` and `vjws`; its entire
10-package external runtime tree is VPM.
Other runtime replacements retain their direct dependency counts. `vqs` removes
an 18-package transitive tree from that branch; packages elsewhere may still need
some of those helpers. `vdebug` uses built-in terminal detection instead of
loading the optional `supports-color` peer. `vrouter` handles thenables internally.
`vread-package-up` removes a 20-package installed transitive branch, including
declaration-only packages, by supporting raw metadata without npm normalization.

The complete external VPM trees contain 13 packages for `vsend`, 15 for
`vserve-static` and `vbody-parser`, and four each for `vrouter`, `vtype-is`,
`vaccepts` and `vraw-body`. Each package README describes its own dependencies.

## The target dependency graph

Targets come from a Cloud Functions gen 2 backend. The reproducible
[consumer fixture](scripts/consumers/package.json) pins Functions Framework 5.0.2,
Firebase Functions 7.4.0, Express 5.3.0, body-parser 2.4.0, router 2.2.0,
send 1.2.1, serve-static 2.2.1, cors 2.8.6 and qs 6.17.0. This is an isolated
compatibility target; changing it does not upgrade or deploy an application.

Parent versions determine consumer compatibility baselines; latest stable
upstream releases determine the forward-looking API target. Express 5.3.0 and
body-parser 2.4.0 use content-type 2.1.0, shared with type-is and negotiator. Older callers
passed a request object where 2.x requires a string, so overriding their parser
alone would lose charset information. Firebase Functions 7.4.0 removes the
previous Express 4 branch. Platform types have their own documented baselines.

The fixture also includes Firebase Admin and JWT consumers: `vjsonwebtoken`
validates claims, expiry durations reach `vms`, signatures reach `vjwa` through `vjws`, and proxy agents
reach `vdebug`. `vhttps-proxy-agent` uses `vagent-base` for the pinned HTTP CONNECT transport
used by `vgaxios` for Node-agent and proxy requests. Current Gaxios 7.1.3/8.3.2
are aliased; older Gaxios 6 callers remain version gaps. `vnode-fetch` replaces Fetch 2.7.0;
`vextend` and UUID 9’s `vuuid` are version-scoped aliases too. `vis-stream`
remains available, but is no longer called by the upgraded HTTP client.
Google `JWTAccess` signing also runs through `vjws` and `vjwa`. The separate
Google Auth 11.3.2 fixture is aliased to `vgoogle-auth-library` for current headers,
project lookup and Storage-style signing; installed version 9 callers remain uncovered.
Firebase Admin's JWKS fetcher and public-key verifier use `vjwks-rsa`.
The wider frameworks, authentication libraries and Google SDKs still contain upstream dependencies.
A complete VPM Express tree does not mean the entire backend has been replaced.

Uncovered versions are reported rather than silently substituted. In this graph,
`form-data` 2.5.5 arrives through `@types/request` under `retry-request` and brings
mime-types 2.1.35 and mime-db 1.52.0. That branch is not exercised by the runtime
gate. `agent-base` 6.0.2 under older `https-proxy-agent` 5.0.1 and
`http-proxy-agent` 5.0.0 also remains uncovered; the 7.1.4/9.0.0 replacement is not
substituted across that API boundary. Separate development fixtures can also retain older HTTP utility versions.

### The integration gate

[`scripts/integration.cjs`](scripts/integration.cjs) runs **246 HTTP checks per
runtime**, plus **six Functions Framework startup-option scenarios** and **122
raw-manifest comparisons**. It substitutes matching package versions inside its
own process, serves Firebase `onRequest` handlers and Express applications through
`vfunctions-framework`, and exercises a direct parser application. Its coverage includes:

- Routing, parameters, wildcards, mounted applications, async errors, HEAD/OPTIONS,
  proxy trust, IPv4/IPv6 addresses and deprecation warnings.
- JSON, forms, raw/text bodies, compression, charset conversion, request limits,
  disconnected streams, malformed inputs and query parsing.
- Response negotiation, status/framing rules, headers, cookies and signatures,
  downloads, static files, ranges, validators and redirects.
- CORS reflection, allow/deny decisions, repeatable RegExp policies, duplicate
  callbacks, cache variation and preflight framing.
- CommonJS, ESM and nested-package handler loading through the framework, followed
  by an HTTP request to each loaded handler. These three requests are included in
  the HTTP count.
- Framework CLI/environment precedence, option types and errors, application
  startup callbacks, symbol descriptors, JWT expiry durations and debug output.
- All 12 signed JWT algorithms through `vjsonwebtoken`, including synchronous and
  callback-based signing, Unicode key IDs, tamper rejection, claim boundaries and
  asynchronous key resolution, plus offline Google `JWTAccess` signing through
  `vjws` and `vjwa`.
- Firebase Admin JWKS retrieval, cache reuse, signature verification and unknown-key
  rejection through its actual consumers, plus JWT key resolution via `vjwks-rsa`.

- Actual HTTP and TLS tunnels through `vhttps-proxy-agent` in place of
  `https-proxy-agent` 7.0.6, using `vagent-base`, including keep-alive reuse and a `gaxios` request. These seven
  requests are separate from the 246 HTTP application checks.

- Actual teeny-request multipart uploads and Google HTTP JSON requests, multipart
  uploads and retries exercise the new HTTP-client aliases. These five requests
  are separate from the 246 application checks.
- Current Cloud Storage 8.4.0 callback/download retries and multipart uploads
  exercise `vteeny-request` through five additional attempts with
  `vretry-request`. The original teeny caller separately verifies both proxy
  protocols against `vhttp-proxy-agent`; alias scope and controls remain explicit.
- Google auth’s actual `JWT.authorize()` and `fetchIdToken()` methods exchange
  synthetic access/ID tokens through `vgtoken` and `vgaxios`, with native RSA
  verification of each emitted assertion. These two local requests are also
  separate from the application HTTP count.

The gate checks that every configured target is installed and exercised. VPM
exports are instrumented before consumers load, so calls through VPM dependencies
count too. It checks the single shared content-type 2.x copy and its four callers.
Version mismatches remain visible in its report. The VPM framework directly uses
its own reader, removing the previous dynamic-import loader adapter. The upstream
ESM reader remains intact for differential checks; installed fixture files are
unchanged.

Consumer configuration affects reachability. Functions Framework disables ETags
on its own app, so validator tests also use application responses and static files.
Firebase handles errors thrown by plain handlers itself; finalhandler is exercised
through Express applications. Framework body parsing runs before handlers, so
parser-specific limits are also checked in a direct application.

## vyocto-queue and vp-limit

`vyocto-queue` implements the current **1.2.2** queue API without dependencies.
Its private state is initialized directly rather than calling a subclass override
during construction. FIFO operations, live linked iteration, partial draining and
empty-queue reference cleanup preserve current upstream behavior.

`vp-limit` targets **7.3.3**, including mutable concurrency, options-object creation,
`rejectOnClear`, `map` and `limitFunction`. Free slots bypass queue records and
intermediate promises. Queued work preserves the submitting async context; task
failures release capacity and iterator failures retain rejection observers.
The default clear operation intentionally leaves discarded promises unresolved;
callers awaiting them should opt into `rejectOnClear`. Neither implementation
bounds pending work or cancels active I/O.

All 37 retained upstream cases and 23 focused cases pass on Node 24 and Bun.
Storage **8.4.0** uses the replacement in delete, permission-change, upload and
download batches; installed p-limit 3.1.0 and current 7.3.3 provide caller controls.
See [queue measurements](packages/vyocto-queue/bench/results/README.md) and
[limiter measurements](packages/vp-limit/bench/results/README.md) for paired
results, fresh-process variation and identical-upstream controls. These local
operation costs do not establish application or cloud-transfer throughput gains.
Limiter task cases take 23–41% less time on Node and 17–42% less on Bun. Most
queue operations remain near upstream; Bun draining takes about 19% less time.
Tiny queue creation and roundtrip results are noisy, including regressions, and
are retained with controls rather than claimed as wins.

## vpromisify and vprojectify

Both target the current **6.2.1** packages without runtime dependencies.
`vpromisify` preserves callback delegation and promise tuples while snapshotting
options, skipping prototype accessors, preflighting immutable methods and
ignoring inherited wrapper flags. Callback conversion assimilates thenables,
reports synchronous throws asynchronously and wraps falsy rejection reasons
with `ERR_FALSY_VALUE_REJECTION` instead of passing a success-shaped error.

`vprojectify` substitutes project IDs literally, handles null-prototype records
and uses iterative traversal for deep/cyclic graphs. It visits own enumerable
data fields, preserving ordinary record identity and cloning arrays; accessors,
streams, byte views and class instances are opaque. Mutations are not
transactional if a later field fails.

All 32 upstream cases and 36 focused cases pass on Node 24 and Bun. Actual
Storage **8.4.0** checks verify 36 callback/promise wrapper invocations and seven
project substitutions across metadata, existence, error, query, JSON, URL and
multipart paths. See [vpromisify measurements](packages/vpromisify/bench/results/README.md)
and [vprojectify measurements](packages/vprojectify/bench/results/README.md) for
paired timing results, controls and remaining tradeoffs. Node promise conversion
takes 19–22% less time, and nested project substitution 45–46% less; the latter
improves 11–15% on Bun. Remaining costs include Node wrapper creation (+32%,
about 7 ns), Bun class wrapping (+52%, about 1.7 microseconds per 20 methods),
Bun flat-record substitution (+21%, about 24 ns), and tiny unchanged-input
checks. These are local operations, not application throughput measurements.

## vpaginator

Targets **@google-cloud/paginator 7.2.0**, with `vextend` as its only dependency.
It snapshots pages without mutating them, respects readable high-water marks,
validates limits, ignores duplicate or late callbacks, and cancels pending
request handles when supplied. Query snapshots omit inherited fields, stream
options cannot override lifecycle methods, and wrapping is idempotent.

Current Storage **8.4.0** bucket, file and HMAC-key callers pass with promises,
callbacks, manual pagination, object streams, limits and errors. All 65 upstream
cases and 28 focused cases pass on Node 24 and Bun. Storage does not return its
listing HTTP handles: pagination cancellation prevents future pages but cannot
abort those in-flight HTTP calls. At most one request and one page snapshot are
retained alongside the readable queue; automatic aggregation retains all records.

[Paired performance results](packages/vpaginator/bench/results/README.md) retain
three comparison processes and an identical-upstream control for each runtime.
Query preparation takes 21–34% less time on Node and about 60–61% less on Bun.
One-page aggregation takes 4–7% / 19–26% more, ten-page aggregation 23% / 31%
more, and 128-object delivery 32% / 45% more (Node / Bun). The slow-consumer
stress case is effectively unchanged on Node and 15% slower on Bun. Controls,
process variation and absolute timings are retained. No application throughput
claim is made.

## vduplexify

Targets duplexify **4.1.3**. Native Node 24/Bun streams replace all four runtime
dependencies: readable-stream, inherits, end-of-stream and stream-shift. The
adapter retains independent attachment, replacement, nested corking, drain
backpressure, 16 KiB/16-object defaults, and constructor/subclass APIs.

`end(false)`, `end(0)` and `end('')` preserve object-mode values. Frozen options
work and `.obj` respects an explicit watermark. Destruction settles pending
writes and finalization callbacks, removes adapter listeners and destroys a
shared source/sink only once. `destroy:false` preserves caller ownership even
for streams attached after destruction. Premature close now reports
`ERR_STREAM_PREMATURE_CLOSE`; invalid attachments fail before replacing the
current stream. Native lifecycle overrides are rejected.

Normal completion preserves the pending HTTP response after upload writes
finish. Explicit `autoDestroy:true` opts into native completion destruction;
the default retains upstream's error-only destruction behavior. Byte chunk
boundaries may coalesce through native `read()`. See the [package API](packages/vduplexify/README.md)
for finalization, ownership and null-attachment semantics.

All upstream cases run with the documented premature-close assertion addition.
Current Storage download/multipart and google-gax retry, client, bidirectional
and cancellation callers run with published controls, keeping VPM retry and
transport implementations constant. These checks cover actual SDK code against
local services; they do not establish full SDK parity or production adoption.

[Paired benchmarks and identical-upstream controls](packages/vduplexify/bench/results/README.md)
cover setup, transfers, a one-byte buffer stress case, replacement and a real
google-gax bidirectional wrapper. Node construction takes 43–46% less time and
ordinary transfers take 23–37% less. Bun construction takes 26–39% less; ordinary
transfer differences are small. The one-byte-buffer stress case remains 31%
slower on Node and 10% on Bun; Node sink replacement is 10% slower and the Bun
gax wrapper is 13% slower. Gax controls are noisy, so precise end-to-end speed
claims are unwarranted. All samples, controls and process variation are retained.

## vteeny-request

**Target:** teeny-request 11.1.1 callback/download API and Cloud Storage 8.4.0
multipart uploads. Four upstream dependencies become four VPM dependencies:
`vnode-fetch`, both proxy agents and `vstream-events`. The complete runtime
subtree uses VPM packages; this does not imply application deployment.

The replacement uses one Node-stream transport on Node 24 and Bun. It enforces
a total deadline through redirects and response consumption, closes connections
when downloads are canceled, and destroys stalled or future multipart inputs
when uploads fail. Multipart supports arbitrary sequential parts and completes
string-only bodies. Upstream supports two parts and leaves two-string uploads
unfinished. Headers, exact byte views, defaults and pool options are snapshotted;
query fields append to existing parameters and fragments are removed. Error
messages omit request URLs, credentials and response excerpts.

Agent caching includes the proxy, protocol and configuration instead of only the
destination protocol. The cache is bounded to 64 entries, preserves active
requests during eviction/closure and enables proxy keep-alive for `forever`
requests. Statistics continue to count requests awaiting headers, including
correct settlement across `resetStats()`. Optional size limits bound callback
and stream consumption. Callback text decoding avoids retaining an extra copy
of every byte chunk while preserving UTF-8 boundaries and immutable output.

**Verification:** 28 focused tests, all 116 active upstream cases on Node 24 and
Bun, and real Storage callback retries, download retries and streamed multipart
uploads. The completion-aware upstream harness retains two skipped tests and
requires the published Node control to reproduce two original assertion
mismatches; see the [fixture explanation](scripts/teeny-conformance/README.md).
Types, packed imports, exact archive contents and composed integrations are
checked separately. Older teeny majors and the full `request` API are not targets.

**Measurements:** [paired requests and controls](packages/vteeny-request/bench/results/README.md)
show about 55%/37% less time for HTTP proxy calls on Node/Bun and about 94%
less for TLS proxy calls, primarily from honoring keep-alive. Node direct-call
medians favor VPM, but noisy controls limit precise claims. Bun direct callback
medians retain overhead, and upload/download differences are inconclusive across
processes. Defaults creation adds about 2 µs on Node and 0.5 µs on Bun for
validation and snapshots. The report includes every sample and control.

## vhttp-proxy-agent

**Target:** http-proxy-agent 9.1.0, with explicit migration coverage for
teeny-request 11.1.1 and Cloud Storage 8.4.0 paths still using 7.0.2. Two direct
VPM dependencies replace three upstream dependencies; the optional native
Kerberos peer is unnecessary for these callers. Automatic Negotiate and
`onProxyAuth` are rejected explicitly, so this is scoped forwarding compatibility.

Absolute request targets and headers are prepared at registration, avoiding a
second buffered-request rewrite after connecting. Delayed agent delegation
verifies the existing header prefix and preserves queued UTF-8/binary body bytes
and pending-byte accounting. Origin-form paths remain bound to the requested
authority, including paths beginning with `//`; custom Host headers do not
redirect the target. Dot segments and escapes are preserved, fragments removed.

Configuration is validated and copied; empty and zero header values survive,
case variants share authentication decisions, and providers run once per request
without mutation. TCP/TLS establishment has a finite default deadline, and
cancellation or destruction closes the pending socket. TLS readiness follows
certificate verification. Diagnostic events redact proxy credentials, query and
fragment; logs omit request/header contents. HTTP destinations have an explicit
protocol, avoiding unnecessary stack inspection on each request.

**Verification:** 23 focused tests and all 16 pinned upstream cases pass on both
Node 24 and Bun. Published upstream passes the same suite. Eight real
teeny-request/Storage callback and streaming paths exercise HTTP/TLS forward
proxies, Basic authentication and exact bodies; the 7.0.2 control passes too.
Root integration instruments and exercises the replacement, while archive gates
check packed dependencies, files, CJS/ESM exports and standalone declarations.
See the [API and intentional differences](packages/vhttp-proxy-agent/README.md)
and [conformance fixture](scripts/http-proxy-conformance/README.md).

**Measurements:** the [paired benchmark report](packages/vhttp-proxy-agent/bench/results/README.md)
records construction, request preparation, complete HTTP/TLS proxy requests,
streamed bodies and queues against 9.1.0. Node keep-alive traffic and queued
batches take about 21–22% less paired time; Bun TLS-proxy keep-alive and queues
improve about 10%/9%. Construction adds 0.5–2.0 microseconds depending on runtime
and options. Bun dynamic headers add 63 ns, and complete GETs with a new agent
remain 3.3% slower. Controls and process variation are reported alongside every
case. These local transport measurements do not demonstrate an
application-wide performance improvement or application adoption.

## vstream-events

Targets stream-events 1.0.5 and removes its `stubs` dependency. Read and write
notifications have independent once-only state: upstream shares a mutable
counter, leaving one direction emitting repeatedly. VPM preserves exact method
results instead of replacing them with `emit()`'s boolean result when listeners
are present. Original functions are restored before invoking user code, so
reentrancy cannot duplicate notifications or overwrite application replacements.
Readable-only and writable-only objects are supported, with both methods
validated before mutation. Explicit redecoration remains supported.

All four upstream tests and 21 focused package tests pass on Node and Bun.
Current teeny-request 11.1.1 preserves lazy reading and exact download bytes;
Cloud Storage 8.4.0 and google-gax 6.14.0 retry caller paths also pass with the
replacement. Independent controls reproduce the two upstream notification bugs.

Native chunk/object stream benchmarks take 22–32% less time on Node 24 and
28–30% less on Bun. Native PassThrough setup costs 73 ns more on Node and 14 ns
more on Bun in raw medians; Node's paired setup regression is 59.3%. HTTP
processes vary too much to establish a throughput improvement. See
[all samples and controls](packages/vstream-events/bench/results/README.md) and
the [package contract](packages/vstream-events/README.md), including restoration,
exceptions, descriptors and redecoration behavior.

## vretry-request

Targets retry-request 9.1.0. Direct option snapshots eliminate its `extend`
dependency while ignoring inherited fields, retaining undefined defaults and
validating numeric bounds. Callbacks settle once, and abort cancels both active
requests and queued retries. Streams isolate attempts, discard rejected bodies
and completion events, retain backpressure and fail explicitly on premature
closure. Retry budgets use a monotonic clock; exhausted budgets deliver the last
response/error instead of hanging. The transport still owns active-request and
body timeouts.

Teeny-request 11.1.1 attaches a response-body pipeline during its response event.
Destroying that source earlier in the same dispatch crashes current Cloud Storage
download retries with `ERR_STREAM_UNABLE_TO_PIPE` on both Node and Bun. VPM
immediately detaches the discarded attempt and defers teardown to a microtask,
allowing pipeline attachment to finish. Independent upstream controls reproduce
the failure, while VPM passes the retry. Cloud Storage 8.4.0 callback/download
paths and google-gax 6.14.0's retry-request stream branch are checked; the SDKs'
other retry engines remain outside this package's scope. The integration alias
covers 9.1.0 only, leaving older installed callers for migration.

Paired callback overhead is 39–52% lower on Node 24 and 33–42% lower on Bun.
HTTP differences are within measurement noise. Node's 32-chunk and Bun's 16KiB
stream medians are each +4.2%, with substantial stream/control variation and all
outlying processes retained. See [benchmark samples and controls](packages/vretry-request/bench/results/README.md)
for exact times, process ranges and limits. The
[package README](packages/vretry-request/README.md) records retry counting,
cancellation, timeout semantics and intentional differences.

## vgoogle-auth-library

Targets Google Auth 11.3.2's credential and token flows used by backend SDKs:
application-default discovery, service-account JWTs, OAuth refresh credentials,
Compute, ID tokens, impersonation, authenticated requests and Cloud Storage-style
signing. Its four dependencies and their runtime trees are VPM packages. Native
Base64 conversion and VPM JWS verification remove two direct dependencies.

JWT caches distinguish claims and scope boundaries, invalidate rotated credentials
and isolate returned headers. Forced token refreshes coalesce, key-file issuers
are supplied before signing, malformed expiry values reject, and revocation uses
a POST body with correct promise/cache lifecycle. ID-token verification enforces
canonical JWS, algorithm/key agreement and finite numeric timestamps. Verification
errors and default debug messages omit token and request payloads.

Across three paired runs, Node signing for new audiences improves 33.6%, forced
JWT exchanges with stub transport 33.1%, RSA ID-token verification 46.3% and local
authenticated HTTP 23.5%. Bun improves the two signing cases 13.0%/14.1% and
verification 22.3%; local HTTP is near parity. Remaining small costs include
OAuth2 construction (+87 ns Node, +155 ns Bun) and Node cached JWT headers (+48 ns).
See [all samples and controls](packages/vgoogle-auth-library/bench/results/README.md).

Dedicated external-provider suites, browser bundling and live cloud deployments
are outside the current verification claim. Version 9/10 callers are not blindly
aliased to version 11; Headers and SDK upgrades need explicit consumer checks.
Current Storage and gax retry paths are now checked with `vretry-request` 9.1.0
compatibility; the replacement removes its upstream `extend` dependency.

## vgcp-metadata

Cloud metadata retrieval now uses `vgaxios`, `vgoogle-logging-utils` and
`vjson-bigint`, completing its runtime dependency tree with VPM packages.
Requests have a finite total deadline, response-byte limits, direct routing and
mandatory flavor verification. Detection accepts the first valid endpoint success
and cancels the loser. A quick DNS or IP failure cannot hide the other endpoint's
success. Redirect/body-limit/TLS failures are not retried; transient failures keep
bounded retries. No-response retry counts correctly honor zero.

Logs and returned Gaxios errors omit metadata bodies, request URLs, headers and
nested errors. Status codes remain available to Google Auth callers. Availability
results are shared within a host/configuration snapshot. Bulk reads validate all
entries first, bound concurrency, reject duplicates and use null-prototype output.
Residency heuristics no longer disable timeouts.

The 9.2.3 upgrade adds Fetch Headers/tuple input, Cloud Run Worker Pool detection,
bounded normalization of nested native-fetch/Bun errors, and the current DEBUG
logging namespace. Unknown failures in a raced endpoint cannot be hidden by a
normal network failure in the other. No runtime dependency was added.

Twenty-six focused tests and all 77 current upstream entries pass on Node and Bun,
with documented adaptations for intentional timeout and diagnostic differences.
Google Auth 10.6.1/11.3.2 Compute tokens, project lookup, universe fallback and
status-dependent errors use the native-fetch VPM stack in local HTTP checks.
The older Google Auth integration remains covered. These are compatibility tests,
not production deployment or live-cloud validation.

Compared with current 9.2.3, Node HTTP JSON/text take 18.0%/15.6% less paired
time. Bun HTTP remains slower by 63.6%/33.9% (about 55/32 microseconds); these
complete paths include VPM’s additional bounds and lifecycle checks. Cached Node
availability adds about 0.64 microseconds for configuration-aware reuse. Stubbed
JSON and text processing improve on both runtimes.
[Full benchmark evidence](packages/vgcp-metadata/bench/results/README.md) includes
all samples, process variation and identical-upstream controls.

## vjson-bigint

The exact-number JSON codec removes `bignumber.js`. Immutable `ExactNumber`
values preserve decimal spelling and string conversion; native bigint mode
continues to serve CloudEvents. Arithmetic methods are intentionally absent.
Strict numeric/whitespace syntax, input/depth/number limits, exact forbidden-key
matching and source-free SyntaxErrors strengthen parsing. Per-call serialization
state handles reentrant callbacks, boxed values, cycles and well-formed surrogate
escaping; strings returned by a replacer cannot be injected as raw numeric JSON.

All 18 upstream tests run with explicit identity/error-message adaptations, plus
17 focused tests and 1,000 generated comparisons. Actual CloudEvents bigint parsing,
installed archives and public declarations pass on Node and Bun.

Metadata-object parsing takes 31% less time on Node and 32% less on Bun; native
bigint event parsing improves 52%/64%. Remaining costs include Node ordinary
serialization (+14%), bigint serialization (+30% Node/+15% Bun), and real Node
SyntaxErrors versus upstream plain-object throws (+235%, about seven microseconds).
Small-object Bun parsing is variable (+7% pooled paired change). These are
microbenchmarks, not application speed claims. [Full evidence](packages/vjson-bigint/bench/results/README.md)

## vgoogle-logging-utils

The dependency-free logging replacement emits standalone JSON from its default
structured backend, honors custom backends' public interface, preserves logger
identity and event sinks when switching backends, and returns the callable from
`.on()`. Disabled placeholders are inert. Sink failures are isolated without
printing their exception contents; each event tap still gets its own chance to run.
Filter snapshots are copied, explicit changes invalidate cached decisions, and
the debug adapter uses `enable()` instead of changing `NODE_DEBUG`.

All 20 focused tests, 17 unchanged upstream 2.1.1 entries and ten 0.0.2 entries
pass on Node and Bun. The old suite has one updated VPM expectation for explicit
backend activation. Each upstream suite has an empty entry; focused coverage
verifies the missing backend-replacement behavior. The internal upstream Temporal
helper is outside the exported API. Current upstream activation rules, the `true`
wildcard alias and structured stdout output are supported; the initial VPM version
used stderr for structured output and required the flag even with an explicit backend.

Against 2.1.1, formatted Node-style output takes 66% less time on Node 24 and 19%
less on Bun; disabled invocations take 85%/98% less. Default structured output
improves 1%/5%, and custom structured output 3%/7%. Node retains small costs for
isolated taps (+6 ns) and filtered backend calls (+4 ns). Cached lookup improves,
but its Node identical-upstream control differs by 12%, limiting precise claims.
Bun's tiny lookup/disabled-call timings are JIT-specific microbenchmarks.
[Full evidence](packages/vgoogle-logging-utils/bench/results/README.md) includes
three processes, controls and source hashes per runtime.

## vgtoken

`vgtoken` replaces gtoken 7.1.0 with two VPM dependencies, `vgaxios` and `vjws`.
It preserves Google auth's promise/callback methods and token getters while
coalescing concurrent forced refreshes, caching imported RSA keys, and preventing
older requests from overwriting newer configuration or clearing a newer flight.

Token data and claims are copied and frozen. Expiry must be a nonnegative safe
integer; absent expiry remains uncached. The issuer, RSA key, assertion audience
and issuance/expiry relationship are checked before sending. Credential files are
bounded regular UTF-8 files. Errors retain safe codes and HTTP status while
omitting transport configuration and remote descriptions. Exchanges have a
30-second default deadline, a 1 MiB response limit, and no redirects. Per-waiter
cancellation preserves shared requests until the last waiter leaves. Revocation
uses a POST form body, cancels old refreshes, and preserves client configuration.
See the [package README](packages/vgtoken/README.md) for intentional API differences
and custom-transporter responsibilities.

All 37 focused cases and all 45 adapted upstream cases pass on Node and Bun.
The integration gate exercises google-auth-library 9.15.1's real authorization
and ID-token clients with verified assertions and a local HTTP server.

On Node 24, repeated signed refreshes take **52% less time** and cache hits **66%
less** than upstream; on Bun the reductions are **31%** and **75%**. The eight-call
forced-refresh workload takes 94%/91% less time because VPM shares one exchange.
Local HTTP refreshes take 32%/6% less time. Creating a fresh client for every
exchange remains **2.2% slower on Node**; Bun's +0.4% result crosses zero across
processes. These are package/local-server measurements, not Google service or
application latency claims. [Raw measurements and controls](packages/vgtoken/bench/results/README.md)
retain all paired rounds and source hashes.

## vextend performance follow-up

The merger now allocates cycle bookkeeping only when a nested record needs it.
Up to eight identities use a bounded list; larger graphs promote to a Map.
Finished parents need no traversal frame, and primitive values avoid object
classification. Ordinary new target fields skip a redundant ownership check;
proxy targets retain the original trap order. Symbols, inherited-target
isolation, cycles, aliases, getter ordering and deeply nested inputs remain
covered by 16 focused tests and 90 upstream assertions on Node and Bun.

The [paired report](packages/vextend/bench/results/README.md) includes a verbatim
previous-VPM snapshot for a direct before/after comparison. Node operation times
fall 12% for shallow fields, 29% for flat deep merges, 22% for HTTP options and
12% for 50 nested records. Bun's flat and larger deep cases fall 33% and 10%;
its shallow and HTTP-option cases are inconclusive because of process/control
variation. Relative to upstream, Node HTTP options still take 10% more paired
time and shallow merging remains over twice as costly. The package retains
correctness work that upstream does not perform. The vgaxios report below was
also refreshed with this implementation; application-wide gains are not claimed.

## vnode-fetch and vgaxios

The Google HTTP client targets Gaxios 8.3.2. `vgaxios` uses native fetch by
default and lazily selects `vnode-fetch` for Node agents, proxies, client
certificates and `compress: false`. It has three direct VPM dependencies and
uses native UUID generation; the is-stream dependency is gone. `vnode-fetch` removes the
legacy URL subtree while retaining Fetch 2’s Node-stream contract and the
legacy text conversion method through lazily loaded `viconv-lite`.

The transport validates size/deadline/redirect settings, includes pool queue time
in the request deadline, rejects premature response closure, preserves bytes
from reused producer buffers, and cleans up cancelled or failed streams without
losing keep-alive reuse. Cross-origin redirects strip credentials even when only
the destination port changes. Request/header and body-consumption timeouts are
separate phases; manually consumed response streams remain caller-owned.
Both timeout types carry `ETIMEDOUT`, including when the transport timer fires
before a metadata caller's own timer.

The client snapshots defaults and plain error state, honors default limits,
keeps query parameters before fragments, preserves falsy and byte-view bodies,
and encodes native FormData. Multipart headers are validated before lazy upload
streams start. Retry settings and counts are checked, expired budgets prevent
another attempt, and backoff is cancellable. One-shot streams are not replayed.
Native requests have one deadline covering headers and body consumption,
including successful streams. Each retry has a fresh signal; the original caller
signal still cancels backoff. Custom adapters/fetch implementations and decision
callbacks must honor their cancellation contracts. Proxy TLS never receives destination client
certificates; owned agents have an explicit disposal method.

**Verification:** 23 Fetch and 33 client focused tests, 214 Fetch upstream tests
and 133 applicable Gaxios 8 tests on Node and Bun, real consumer HTTP/proxy
integration, public declarations and installed archives. Google Auth 10.6.1 and
11.3.2 perform real OAuth refresh/authenticated request flows against local
servers. The two conditional Fetch skips, three upstream-specific Gaxios
exclusions and intentional expectation changes are recorded in the
[compatibility fixture](scripts/google-http-conformance/README.md).

Another 24 caller checks cover Gaxios 7.1.3 and 8.3.2 with VPM and published
node-fetch 3.3.2 on Node 24 and Bun. Native Fetch probes confirm ordinary request
support and explicitly check the differences in agents, streams and bounds.
This evidence supports the Gaxios upgrade, not an unrestricted Fetch 3 alias.

**Performance:** [Fetch results](packages/vnode-fetch/bench/results/README.md)
and [client results](packages/vgaxios/bench/results/README.md) retain all paired
samples, three fresh processes, controls and source hashes. Against Fetch 2.7.0, refreshed Bun
JSON/gzip/streamed-POST medians take 14%/7%/9% less time. Node HTTP changes range
from about 1% less to 1% more time, within process/control variation. Safe
32-chunk body collection costs 4.53 → 7.64 µs on Node and 4.69 → 7.59 µs on Bun.
These Fetch measurements do not compare native Fetch or Fetch 3.

The current client report compares Gaxios 8.3.2's installed default against
VPM's native fetch default, with separate explicit Node-agent rows. The client
uses the modern Headers, URL and Response interfaces, preserves AIP error
causes, and redacts copied failures only after the last retry. Its native wrapper
retains redirect and byte-limit checks that raw native fetch does not provide.
Node default JSON GET/POST take 22%/11% less paired time, while multipart takes
8% more. Copying constructor defaults adds 0.51/0.26 microseconds on Node/Bun.
Bun ordinary HTTP differences mostly overlap process/control variation; its
agent JSON/gzip paths take 16%/18% less time. See the report for all controls.

## vhttps-proxy-agent

Replaces `https-proxy-agent` 7.0.6 with HTTP CONNECT transport through HTTP and
HTTPS proxies. Its two direct dependencies are `vagent-base` and `vdebug`; the
complete external tree also includes `vms`. This preserves the upstream direct
count while moving the transport entirely onto VPM packages.

CONNECT headers have a configurable 16 KiB cumulative limit, including interim
responses. Fragmented input is scanned once and joined only at a complete header
block, avoiding repeated prefix copying. Strict status/field validation preserves
Latin-1 values in prototype-free maps. Informational responses are skipped, all
successful 2xx responses establish a tunnel, and bytes coalesced after successful
headers are returned to the tunnel.

A configurable 30-second connection deadline closes the real pending socket.
Request cancellation, agent destruction and parser errors also release it and
allow queued work to continue. Proxy TLS settings remain separate from the
origin's verification policy and SNI. Validated header providers are not mutated;
reserved headers are handled case-insensitively. Configuration snapshots isolate
caller mutations. Debug/error text excludes credentials and proxy header content.
Failed CONNECT responses use an isolated replay stream that discards destination
writes, preserving credential isolation on both runtimes.

**Verification:** 33 focused tests and all 18 pinned upstream cases pass on Node
24 and Bun. The upstream control also passes all 18 with the same TLS fixture
updates. The integration gate routes real HTTP/TLS tunnels and `gaxios` through
the new agent. Packed archives verify dependencies, exports and TypeScript
consumers. The [API guide](packages/vhttps-proxy-agent/README.md) records limits,
configuration changes, failed-response replay boundaries and older-version scope.

**Performance:** the [paired benchmark report](packages/vhttps-proxy-agent/bench/results/README.md)
records all 14 cases, three processes and an identical-upstream control per runtime.
Fragmented parsing is substantially faster; strict validation and configuration
snapshots retain costs for single-chunk parsing and construction. Full request
measurements include the VPM base class and native HTTP/TLS transport.

## vagent-base

Targets `agent-base` 9.0.0, retains 7.1.4 coverage, and keeps zero dependencies and
native HTTP/TLS socket pools. Subclasses still return a socket or delegate agent
synchronously or through a promise. The consumer gate exercises `vhttps-proxy-agent` in place of
`https-proxy-agent` 7.0.6, including the actual `gaxios` consumer.

Failed, cancelled and timed-out connects release their reserved pool slots and
resume queued work. Queued connector callbacks keep the originating async context.
Destroying the agent settles active and queued requests, and sockets returned
after cancellation are destroyed. Invalid results and delegation cycles fail
explicitly. A configurable 30-second default deadline applies while a connector
promise is pending; it does not cover the queue, socket handshake or response.

Structural delegates with `addRequest()` no longer need native Agent inheritance.
Their method is read once and dispatched with the correct receiver; throwing
getters or methods settle the request and release queued work. Cancellation
ignores late shared delegates without destroying them. VPM retains CommonJS and
named ESM exports alongside upstream 9's ESM API.

Configuration is snapshotted and validated. Modern runtimes use structured call
sites for automatic HTTP/HTTPS inference without calling custom error formatters.
Body collection supports exact typed-array windows and UTF-8 strings, copies
before producers can reuse chunks, and offers an explicit byte limit. JSON
rejects malformed UTF-8 without including response contents in the error.

**Verification:** 36 focused tests, all 16 current and 15 older pinned upstream
cases on Node and Bun, published http-proxy-agent 9.1.0 ESM caller checks, older
proxy/client integration, self-contained declarations, and installed archive
consumers. The [API guide](packages/vagent-base/README.md) documents compatibility,
limits and the older-runtime stack fallback. The older
callback-style agent-base 6 callers remain outside its compatibility claim.

**Performance:** the [current paired benchmark report](packages/vagent-base/bench/results/README.md)
compares agent-base 9.0.0 on Node 24/Bun, with three fresh processes and controls
per runtime. Node HTTP keep-alive and fresh synchronous connections take about
7%/8% less time. Bun fresh synchronous connections take 14% more and structural
delegation 20% more; other transport results vary substantially. Construction
adds 390/165 ns on Node/Bun, while byte snapshots and sanitized JSON failures
retain documented costs. This is a compatibility and lifecycle improvement,
not a claim of uniformly faster execution. The older 7.1.4 measurements remain
available separately without relabeling their samples.

## vjwks-rsa

Replaces `jwks-rsa` 3.2.2 with one direct dependency, `vdebug`, instead of five.
Native public-key import replaces `jose`; private cache and limiter implementations
replace `lru-memoizer` and `limiter`. Self-contained declarations remove the runtime
`@types/jsonwebtoken` dependency. The complete external runtime tree is `vdebug`
and `vms`.

Concurrent signing-key lookups share one pending endpoint fetch/import, including
requests for different IDs. Frozen key records export PEM once and cache positive
lookups with bounded LRU retention and monotonic expiry. The rolling-minute
limiter counts actual endpoint attempts and rejects immediately when exhausted.
Neither failed lookups nor whole completed key sets are cached, so key rotation
remains observable after a lookup expires or a new ID is requested.

HTTP retrieval bounds response bytes and key counts, validates UTF-8/JSON,
rejects incomplete responses and enforces a deadline even while a server keeps
streaming. Imported keys require canonical encodings, correct coordinate lengths,
public signing purpose and matching algorithm families. Duplicate usable key IDs
reject the set; empty IDs remain distinct from missing IDs. Middleware adapters
check token/key algorithm agreement and settle error hooks once, including thrown
errors and rejected promises. Canonical field checks inspect unused base64url bits
directly instead of decoding and re-encoding fields before native import.

The [API guide](packages/vjwks-rsa/README.md) documents limits, immutable options,
zero-age cache behavior and other deliberate compatibility changes. Custom fetcher
byte limits and cancellation remain the caller's responsibility. Node supports
all tested key families; Bun 1.4.0 rejects native secp256k1 and Ed448 JWK imports,
which are skipped with explicit capability tests.

**Evidence:** 36 focused tests pass on Node and Bun. The
[pinned upstream suite](scripts/jwks-conformance/README.md) passes all 88
JavaScript cases on both runtimes, with one timeout-code correction and no skips.
The integration gate exercises Firebase Admin's actual JWKS fetcher and signature
verifier plus `vjsonwebtoken` key resolution. Installed npm/Bun archives pass
CommonJS, ESM and TypeScript 7 checks without ambient platform types.

**Performance:** the [complete benchmark report](packages/vjwks-rsa/bench/results/README.md)
retains three fresh processes per runtime, twelve paired rounds per process,
long warm-ups, identical-code controls and source hashes.

| Operation | Node 24 time change | Bun time change |
| --- | ---: | ---: |
| Client construction | −94% | −86% |
| Cached Promise / callback lookup | −99% / −99% | −94% / −91% |
| Express cached key provider | −99% | −84% |
| Eight concurrent custom-fetcher key misses | −65% | −89% |
| Eight concurrent local HTTP key misses | −66% | −84% |
| Fresh RSA import and PEM export | +7% | −24% |
| Missing-key rejection | +17% | −62% |

The two Node regressions add about 2.8 µs and 1.9 µs per operation, respectively;
validation and deadline checks remain enabled. Node's sequential HTTP and
multi-key import results vary within the scale of the controls, so no improvement
is claimed. Bun's sequential local HTTP and eight-key imports take about 29% and
22% less time. These are package measurements, not application latency promises.

## vjsonwebtoken

Replaces `jsonwebtoken` 9.0.3 with two direct dependencies, `vjws` and `vms`,
in place of ten. The seven Lodash helpers and legacy semver feature gates are
removed. Native crypto remains responsible for signing and verification.

The implementation validates finite `iat`, `exp`, `nbf`, clocks and tolerances;
honors zero timestamps and zero maximum age; rejects malformed algorithm and
issuer lists; and makes RegExp audience checks repeatable without changing the
caller's `lastIndex`. Signing snapshots own properties and rejects top-level
payload serialization hooks. UTF-8 applies to object JSON and verified payloads.

Callback signing uses a direct operation and one next-tick completion. Claim
conflicts cannot report an error and then continue to return a token. Key
resolvers receive independent headers, use snapshotted options and complete only
once. An explicit signing algorithm must match the serialized header. Unsigned
tokens require explicit `none` and no key; bypassing asymmetric key validation is
unsupported. The [API guide](packages/vjsonwebtoken/README.md) records intentional
compatibility changes, including strict claim types and callback error timing.

**Evidence:** 35 focused tests on Node and Bun cover all 12 signed algorithms,
malformed inputs, time boundaries, key confusion, native import formats,
CryptoKeys, mutation and callback behavior. The
[upstream conformance suite](scripts/jwt-conformance/README.md) passes 512 cases
on Node and 509 on Bun, with three restricted-RSA-PSS import cases pending only
on Bun. Eleven expectation changes implement documented corrections; the original
skipped unsigned callback case is enabled. The runner preserves the original
archive and records Bun's EC fixture encoding adaptation. The HTTP/authentication
integration gate and installed npm/Bun archives also exercise the replacement.

**Performance:** the [harness](packages/vjsonwebtoken/bench/compare.cjs) compares
upstream, upstream using VPM dependencies, and the new implementation. Three fresh
processes per runtime use twelve balanced rounds; identical-code controls, all
samples and source hashes are retained in the
[complete report](packages/vjsonwebtoken/bench/results/README.md).

| Operation | Node 24 time change | Bun time change |
|---|---:|---:|
| HS256 sign / verify with string secret | −66% / −74% | −55% / −55% |
| HS256 callback sign / resolver verify | −73% / −76% | −60% / −56% |
| RS256 / PS256 verify, warm public PEM | −48% / −48% | −30% / −28% |
| ES256 verify, warm public PEM | −22% | −8% |
| HS256 sign / verify, 64 KiB JSON | −18% / −37% | −31% / −36% |
| Decode complete token | −40% | −50% |
| RS256 / ES256 verify, uncached PEM Buffer | +3% / +3% | −7% / −3% |
| PS256 verify, uncached PEM Buffer | +32% | −3% |

Ordinary HMAC keys avoid a failed asymmetric import on each operation. A private
cache holds at most 16 complete public PEM strings of at most 16 KiB each; mutable
buffers, private PEM, certificates and shared secrets are not cached by input
identity. Native key metadata is weakly held. Cold RSA-PSS retains `vjwa`'s
modulus-length validation cost, also visible in the bridge. No correctness guard
was removed to improve the result.

Node HMAC verification with an existing KeyObject remains 10% faster than
upstream but 14% slower than the bridge (about 0.49 µs) with VPM's additional
option/claim validation. Controls range from −4.5% to +3.1% on Node and −5.4% to
+18.1% on Bun; Bun's largest control variation is callback signing. Small changes
are uncertain, and the report includes per-process results. These measurements
are operation timings, not application throughput claims.

## vjws

Replaces `jws` 4.0.1 with one runtime dependency, `vjwa`. Native Buffer operations
remove `safe-buffer`; the complete external runtime tree is now that single VPM
package. JWT claims and authentication policy remain the caller's responsibility.

**Verified changes:** UTF-8 headers preserve non-ASCII key IDs, raw byte payloads
retain their exact bytes and view offsets, and empty payloads/secrets work across
sync and stream APIs. Signing selects the algorithm from the exact serialized
header, avoiding mismatches from getters or `toJSON`. Verification requires an
explicit algorithm matching the header, exactly three canonical compact segments
and a valid UTF-8 JSON object header. Unknown critical extensions and unsupported
unencoded-payload modes are rejected. `decode`/`isValid` remain unauthenticated
operations, and malformed JWT JSON still throws when decoded.

Stream inputs copy chunks on receipt and concatenate once, replacing upstream's
repeated copying of the entire accumulated body. Native readable outputs support
cancellation and async iteration; legacy upstream stream inputs also work.
Source errors, premature closes, invalid chunks and optional per-input byte limits
settle once and clean up owned listeners. Manual completion waits for both inputs.
Two private, bounded header caches reuse validated metadata and serialized headers;
decoded objects are always fresh, and payloads/keys are not cached by this package.

**Verification:** 50 focused cases plus all 31 upstream cases against each
implementation (112 package tests) pass on Node 24 and Bun. The original upstream
test source is retained; the runner's native key generation, assertion adapter
and one structurally valid input substitution for its invalid-key test are
documented in [provenance](packages/vjws/PROVENANCE.json). The integration gate
exercises all 12 signed algorithms through real `jsonwebtoken`, including its
callback API and Unicode headers, plus Google `JWTAccess` signing. Installed npm
and Bun archives are checked through CJS, ESM and TypeScript consumers.

**Performance:** the [follow-up harness](packages/vjws/bench/followup.cjs) compares
upstream `jws`+`jwa`, `vjws` at `adc9cb4`, and the optimized implementation. Both
VPM variants use the same `vjwa`. Twelve rounds use all six orders twice; three
fresh processes per runtime and identical-code controls retain every sample and
source hash. The [summary](packages/vjws/bench/summarize-followup.cjs) verifies
current hashes and reproduces the results. The [initial comparison](packages/vjws/bench/results/README.md)
remains available to distinguish inherited crypto costs.

The optimization removes source-stream Writable/pipe intermediaries while keeping
native public inputs and output. A lazy 64 KiB scratch buffer is cleared after
validation; Node uses checked byte counts, while Bun keeps exact round trips for
its different decoder behavior. Header metadata and common parsing paths avoid
unnecessary work. The new differential checks cover every byte value, wide
character aliases, scratch-block boundaries, shared/paused streams and key forms.

Paired elapsed-time changes on Node 24.22.1/Bun 1.4.0, macOS arm64:

| Workload | Node vs before | Bun vs before | Node vs upstream | Bun vs upstream |
| --- | ---: | ---: | ---: | ---: |
| Stream sign, one tiny chunk | −32% | −35% | −22% | +5% |
| HS256 verify, 64 KiB | −10% | −4% | +18% | +20% |
| HS256 verify, varying header | −3% | −9% | +9% | −2% |
| Decode 64 KiB | −16% | −2% | −66% | −63% |
| Stream sign, 256 KiB in 1,024 chunks | −33% | −9% | −90% | −95% |

The remaining large-token validation costs roughly 11 µs on Node and 15 µs on Bun;
upstream verification skips these encoding checks. Varying-header verification on
Node still adds about 0.26 µs for validation and parsing. Tiny-stream overhead is
removed on Node and reduced to about 5% on Bun. Uncached Node RSA/EC PEM verification
remains 7–8% slower and PSS about 40% slower; these costs are inherited from `vjwa`.
Key matching and exact PSS signature length remain enforced.

Controls span −4.7% to +1.5% on Node and −5.2% to +13.4% on Bun. Small differences
and the smaller Bun improvements should be read cautiously. Unchanged Bun signing
measured a +10.8% paired difference against before with similar pooled medians;
no new signing improvement is claimed. All samples, including noisy crypto cases,
are retained in the [complete follow-up report](packages/vjws/bench/results/followup/README.md).
The [API guide](packages/vjws/README.md) documents compatibility boundaries. These
measurements do not establish application throughput.

## vjwa

Replaces `jwa` 2.0.1 with zero runtime dependencies. Native `Buffer`,
`timingSafeEqual` and ECDSA P1363 signatures remove `safe-buffer`,
`buffer-equal-constant-time` and `ecdsa-sig-formatter` from this package's tree.
Those packages can still exist under other upstream callers.

**Verified changes:** canonical signature encodings reject padding, whitespace,
alternate alphabets and nonzero unused bits. Signing enforces key families and
the correct P-256/P-384/P-521 curve; verification rejects mismatches. RSA-PSS uses
digest-length salts. Exact byte views honor offsets and lengths. Factory results
have independent public containers, and key-import options are read without
mutation. No cryptographic algorithm is implemented in JavaScript.

WeakMaps reuse validated native key operations. A bounded cache stores at most
16 complete public PEM strings of at most 16 KiB each. Private PEM, mutable
buffers and import options are parsed on each call. Callers can prepare native
KeyObjects once to avoid repeated import costs without adding a private-key cache.

**Coverage:** 40 focused tests plus all 65 upstream tests against each of the
original and replacement implementations, totaling 170 cases on Node and Bun.
They include OpenSSL interoperability, RFC 7515 Appendix A vectors, removed/added
RSA signature zero prefixes across all six RSA/PSS algorithms, and
1024/2050/4096/8192-bit modulus sizes. The shared
consumer gate adds all 12 signed JWT algorithms and tampering through
`jws`/`jsonwebtoken`, plus offline Google `JWTAccess` signing. Archive/type checks
cover npm/Bun installations and CJS/ESM consumers without ambient platform types.

**Compatibility:** malformed ECDSA lengths now return `false`. Wrong signing
key families/curves throw; mismatched verification keys return `false`. Byte
views are bytes rather than JSON objects. Extractable CryptoKeys and native key
import options are supported; non-extractable CryptoKeys are rejected. Bun's
native inability to import restricted RSA-PSS keys remains visible; ordinary
RSA keys work for PS256/384/512. Upstream's explicit `none` operation, JSON input
coercion and runtime-accepted key sizes remain. Algorithm allowlists, key-strength
policy and JWT claim validation remain caller responsibilities. The
[API guide](packages/vjwa/README.md) records these boundaries and test adaptations.

**RSA follow-up, 2026-10-28:** the dominant uncached Node cost was reading
`asymmetricKeyDetails` on every newly imported RSA key. A native diagnostic
measures import alone at 12.09 microseconds, import plus key type at 12.48, and
import plus key details at 26.49. Bun's corresponding times are 2.44, 2.47 and
2.51 microseconds, explaining why the original regression was specific to Node.

Ordinary PKCS#1 verification already checks the modulus-sized signature in native
crypto. Removing the duplicate metadata lookup preserves that check. RSA-PSS
still gets an explicit length check: Node's native verifier can accept a valid
PSS signature after its leading zero is removed. Oversized RSA strings also get
an explicit length check before decoding; inputs on the metadata-free path decode
to at most 768 bytes. Native decode/encode round trips retain exact canonical
base64url checks. Key-family validation, PSS restrictions, import errors and the
16-entry public cache remain. No private-key or mutable-buffer cache was added.

The [follow-up harness](packages/vjwa/bench/rsa.cjs) compares unmodified upstream,
a frozen `c3bc17f` implementation and the new code on Node 24.22.1/Bun 1.4.0,
macOS arm64, Apple M1 Pro. It measures 24 operations plus the native diagnostic:
12 rounds cover all six variant orders twice; three fresh processes give 36
paired observations per operation. Separate identical-code controls, source
hashes and every sample are retained in [eight reports](packages/vjwa/bench/results/rsa).
The [summary](packages/vjwa/bench/summarize-rsa.cjs) reproduces the values and
checks the frozen/current source hashes with `--verify-current`. Negative changes
mean faster; percentages use paired ratios, not ratios of independently pooled
medians. The native diagnostic row is not a package before/after comparison. The complete
earlier run is retained in `initial-fixtures/`; the
[report notes](packages/vjwa/bench/results/rsa/README.md) explain the untimed
test-fixture correction that prompted a rerun with final source fingerprints.

| Operation | Node vs upstream | Bun vs upstream |
| --- | ---: | ---: |
| RS256 verify, uncached PEM Buffer | +6.9% | −1.0% |
| RS256 verify, rotating PEM cache misses | +6.6% | −0.5% |
| RS384 / RS512 verify, uncached PEM Buffer | +5.2% / +6.1% | −0.8% / −0.7% |
| RS384 / RS512 verify, rotating PEM cache misses | +7.8% / +8.3% | +3.2% / +1.8% |
| RS256 verify, warm PEM cache | −49.9% | −27.7% |
| RS256 verify, KeyObject | −0.7% | −6.6% |
| PS256 verify, uncached Buffer / rotating PEM | +37.3% / +41.0% | +0.8% / +1.6% |
| ES256 verify, uncached Buffer / rotating PEM | +6.3% / +7.5% | +1.1% / +0.0% |
| RS256 sign, private PEM | +0.2% | −0.3% |
| HS256 sign / verify, KeyObject | −6.8% / −7.2% | −18.3% / −11.6% |

Node RS256 Buffer verification falls from **61.98 to 45.99 microseconds**
(upstream 43.40); rotating PEM falls from **62.71 to 47.03 microseconds**
(upstream 43.89). These are **25.7% and 25.1% faster than previous VPM**, respectively.
The three Buffer reports show +5.0%, +6.5%, +7.4% against upstream; rotating
reports show +5.6%, +7.7%, +6.5%. Across all three RSA hashes, uncached verification
improves 25–26.5%. The remaining 2–4 microseconds of RSA overhead has not been
eliminated; VPM still imports a key explicitly and validates the key family and
canonical signature. The rotating corpus uses 20 encodings of one public key,
not a deployed key-rotation workload.

**Remaining costs and variation:** uncached PS256 retains its metadata check and
its Node cost; ES256 retains curve validation. Neither is improved materially by
this change. Identical-code controls span −4.4% to +2.7% on Node and −4.8% to
+5.0% on Bun, so small differences are not robust wins. Bun RS256's warm PEM case
is +0.2% against previous VPM, and its rotating case is +1.0%. One Bun RS384
KeyObject report is +30.4% against upstream versus −7.7%/−7.6% in the other two;
the aggregate is −6.8%. All observations are retained. These local operation
timings do not establish deployed authentication throughput or startup performance.

<details>
<summary>Initial measurements before the RSA optimization (2026-10-28)</summary>

**Initial performance:** Node 24.22.1 and Bun 1.4.0 on macOS arm64. Each of
42 workloads has three fresh-process reports, ten alternating pairs per report
(30 pairs total), plus an identical-code control per runtime. Outputs are retained
and checked, and all samples remain in the [eight raw reports](packages/vjwa/bench/results).
The [summary script](packages/vjwa/bench/summarize.cjs) reproduces paired medians,
per-report changes and calibration values. Negative percentages mean faster.

| Operation | Node change | Bun change |
| --- | ---: | ---: |
| Factory creation | −81.7% | −93.8% |
| HMAC signing, KeyObject, HS256/384/512 | −7.7% to −12.6% | −12.2% to −22.9% |
| HMAC verification, KeyObject, HS256/384/512 | −5.4% to −13.1% | −6.7% to −21.1% |
| HS256 sign / verify, string secret | −13.4% / −9.5% | −13.1% / −11.4% |
| RS256 / PS256 verify, warm PEM cache | −49.9% / −48.9% | −28.8% / −26.0% |
| ES256 sign / verify, KeyObject | −2.7% / +2.5% | −7.2% / −0.6% |
| ES256 verify, warm PEM cache | −18.3% | −3.5% |
| RS256 / PS256 / ES256 sign, private PEM | +2.3% / +1.8% / +4.8% | −0.1% / −0.1% / −3.7% |
| RS256 verify, uncached PEM Buffer | +44.5% | −0.8% |
| RS256 verify, rotating PEM cache misses | +43.8% | +2.3% |
| ES256 verify, uncached PEM Buffer | +7.9% | +0.9% |
| ES256 verify, rotating PEM cache misses | +8.6% | +1.7% |
| HS256 sign / verify, 64 KiB | −1.3% / −1.9% | −1.3% / −2.3% |

**Original costs:** Node's uncached RS256 PEM verification increases from
43.07 to 62.25 microseconds with a Buffer, and from 44.32 to 64.54 microseconds
when cycling 20 PEM encodings beyond the 16-entry cache. Explicit native key
import and metadata validation add work absent from upstream's direct verification
path. ES256's corresponding costs increase by about 7 microseconds. Prepared
KeyObjects avoid repeated import; the retained reports show their separate costs.
The rotating corpus uses different encodings of one public key to force cache
misses, not a deployed key-rotation workload.

RSA/PSS signing with KeyObjects and larger-curve ECDSA operations are generally
within 1% of upstream. Node RS512 verification is +2.3%, and mismatched RS256/ES256
signature verification is +2.5%/+1.4%; all remaining cases are retained in the
reports. Factory creation saves roughly 0.16 microseconds on Node and 0.10 on Bun,
so its large percentage should not be read as an application-wide speedup.

Identical-code paired medians range from −5.0% to +2.0% on Node and −4.3% to
+4.1% on Bun across workloads. These are calibration observations, not confidence
intervals; small changes need caution. One Node ES256 private-PEM report reversed
direction (−22.1%, versus +4.9%/+4.4% in the other two), and Bun HS256 verification
also varied between reports. No samples were discarded. These are local operation
benchmarks, not deployed authentication throughput or startup measurements.

</details>

## vfunctions-framework

Replaces Functions Framework 5.0.2 with an entirely VPM stack. Five direct
dependencies replace seven; the pinned upstream installed graph has 126 external
package instances, including types and the CloudEvents SDK, versus 42 external
VPM packages. Public declarations describe CloudEvent envelopes and structural
HTTP interfaces without installing either SDK or ambient Express types.

**Verified changes:** synchronous async-context initialization isolates concurrent
first requests; exact Buffer/Uint8Array views prevent logging surrounding bytes;
JSON scalars and invalid label fields no longer crash context logging. Stream
interception preserves encodings and is idempotent. HTTP wrappers catch thenables
and cross-realm promises, and event callbacks bind to the captured request domain.
The latter plus explicit synchronous error capture fixes all 24 failures
reproduced against the published upstream package on Bun 1.4.0.

Registration validates handlers, target lookup uses own properties, and event
conversion tables exclude inherited entries. Non-POST event requests return 404
before conversion. Idle-timeout cancellation follows response completion rather
than request-body completion; listeners and socket timeouts are cleaned up.
Timeout input is bounded to valid integer seconds. Global middleware avoids
unnecessary wildcard route capture.

**Coverage:** 63 package tests, all 105 upstream tests on both runtimes, the
shared 245-request Firebase/HTTP gate, CLI startup and installed npm/Bun archive
checks. The separate upstream hosted/external conformance harness was not run.
The [API guide](packages/vfunctions-framework/README.md) documents retained
framework defaults, timeout semantics, structural type limits and compatibility.

**Further HTTP work, 2026-10-28:** exact known ASCII media types are now classified
once, with ASCII-only optional whitespace and own-header lookup. The checked
body reader still validates the original header's complete parameters and charset,
framing, compression and limits. Unknown or malformed media types retain the
fully checked raw-parser fallback. Differential tests compare these decisions
against the original five-parser VPM chain, including non-ASCII whitespace,
invalid parameters, inherited headers and malformed lengths.

Internal event adapters receive the captured request domain directly, avoiding
the request-to-domain map while retaining domain-bound callbacks. Public handler
argument counts and concurrent event contexts are tested. The server reuses its
completion callback and omits the timeout middleware when timeout is disabled;
active timeout cancellation and cleanup remain unchanged.

The [steady-state harness](packages/vfunctions-framework/bench/steady.cjs) uses
four isolated server processes and a shared checked client. It compares upstream,
the original VPM runtime (`119f04c`), the first HTTP optimization (`f4e1f06`) and
the current runtime. Each workload receives 10,000 warmup requests per server,
then eight balanced blocks of 1,000 requests per variant. Server CPU is measured
separately from client CPU; the small per-block IPC control cost is included.
Three reports provide 24 measured blocks per variant and workload. Identical-code
calibrations run `f4e1f06` in both the before and after processes. The
[manual benchmark workflow](.github/workflows/framework-benchmarks.yml) saves all
samples and source hashes as artifacts; verified baseline archives are in the
repository. These warmed round trips are a different measurement from the earlier
fresh-process runs.

**Linux results, 2026-10-28:** [workflow run 40799052313](https://github.com/VentiMath/vpm/actions/runs/40799052313)
measured runtime commit `3bba23c` on separate Node 24.22.1 and Bun 1.4.0 workers.
Node ran on AMD EPYC 9V45; Bun ran on Intel Xeon Platinum 8370C. The
[eight retained reports](packages/vfunctions-framework/bench/results/steady)
contain all six comparison runs and both identical-code calibrations. Their
source, harness, fixture and lockfile hashes identify the measured inputs.

These are median paired changes in HTTP round-trip time across the 24 blocks;
negative means faster. “Previous VPM” is `f4e1f06`. Different runner hardware
precludes comparing absolute Node and Bun timings.

| Request | Node vs upstream | Node vs previous VPM | Bun vs upstream | Bun vs previous VPM |
| --- | ---: | ---: | ---: | ---: |
| GET | −4.3% | +4.8% | −16.2% | −7.6% |
| Deep path | −10.6% | −1.7% | −14.5% | +1.0% |
| JSON | −14.2% | −4.6% | −14.8% | −3.4% |
| Form | −9.8% | −0.4% | −7.4% | +3.5% |
| JSON, mixed-case type and charset | −3.5% | −4.8% | −5.9% | −2.9% |
| Form, mixed-case type and charset | +11.4% | +7.4% | −12.6% | −2.2% |
| Async JSON | −13.6% | −7.3% | −6.6% | +5.0% |
| CloudEvent | −13.4% | −6.6% | Not comparable | −0.01% |

**Measurement limits and remaining gaps:** the originally flagged Node JSON
charset and Bun JSON cases have faster medians in this run. However, identical
code produced apparent round-trip changes ranging from **−18.0% to +15.5% on
Node**, and **−6.0% to +13.2% on Bun**, across workloads. These ranges describe
the calibration; they are not confidence intervals or proof that a measured
slowdown is harmless. Even separate CI workers did not provide enough stability
to certify every reported difference as an implementation effect.

Node forms with mixed-case type/charset retain an observed **11.4% gap against
upstream**. Their three report medians were −4.3%, +26.4% and +11.4%; against
previous VPM they were +16.8%, +21.6% and −7.9%. The other slower comparisons
against previous VPM are Node GET, Bun deep paths, Bun forms and Bun async JSON,
as shown above. Against original VPM `119f04c`, the remaining slower round-trip
medians are Node GET (+2.6%), Node form charset (+1.0%) and Node async JSON
(+3.6%); all Bun medians are lower.

Server CPU is a separate metric, not request latency. For example, Node JSON
uses 15.8% less measured server CPU than previous VPM, while Node form charset
uses 14.0% more; its identical-code CPU calibration itself differed by 15.6%.
The [summary script](packages/vfunctions-framework/bench/summarize-steady.cjs)
reproduces every wall/CPU comparison, per-report median and calibration result.
The changes remove identifiable redundant work and pass the correctness gates,
but these results do **not** establish a universal HTTP speedup or resolution of
every performance flag. Further tuning of the remaining flags needs repeatable
profiling on controlled hardware.

<details>
<summary>Earlier startup and HTTP measurements, including the reported regressions</summary>

**Initial performance, 2026-10-28:** pooled medians of 21 fresh-process samples per
implementation (three reports, seven alternating pairs each), Node 24.22.1 and
Bun 1.4.0 on macOS arm64. Startup includes package loading, option parsing, real
handler loading and server readiness; process launch and fixture creation are
excluded. OS filesystem caches are warm.

| Startup operation | Node upstream → VPM (ms) | Bun upstream → VPM (ms) |
| --- | ---: | ---: |
| CJS handler, listening | 73.03 → 53.24 | 62.03 → 51.19 |
| CJS handler, first response | 80.74 → 61.19 | 70.59 → 63.67 |
| ESM handler, listening | 71.66 → 50.56 | 54.25 → 46.35 |
| ESM handler, first response | 80.11 → 58.87 | 61.76 → 53.74 |

Listening takes **27–29% less time on Node** and **15–18% less on Bun** in the
pooled medians. First response takes **24–27% less on Node** and **10–13% less on
Bun**. Bun CJS startup varies substantially between reports; these are local
measurements, not deployed cold-start guarantees.

Each HTTP sample includes 200 warmups and 1,000 checked sequential keep-alive
round trips. The client and server run in the same process.

| HTTP workload | Node upstream → VPM (µs/request) | Bun upstream → VPM (µs/request) |
| --- | ---: | ---: |
| GET | 158.15 → 157.22 | 111.56 → 107.76 |
| Deep path with query | 148.66 → 146.39 | 107.39 → 101.90 |
| JSON body | 161.23 → 162.58 | 127.01 → 116.25 |
| Form body | 167.52 → 160.25 | 123.84 → 126.62 |
| Structured CloudEvent | 155.20 → 149.76 | No valid upstream comparison |

HTTP differences are small and variable. Node JSON is about **1% slower** and
Bun forms about **2% slower** in the pooled medians. Some per-report comparisons
change direction, so no general request-throughput improvement is claimed. Bun
event timing is omitted because the unchanged upstream handler fails; VPM event
correctness is covered by the passing conformance suite.

[The harness and six raw reports](packages/vfunctions-framework/bench) retain
all samples, runtime information, the installed dependency snapshot, harness
hashes and hashes of the complete VPM source tree and consumer lockfile.

**HTTP optimization follow-up, 2026-10-28:** the initial Bun form result above
is a pooling artifact: VPM was faster in each of the three original reports.
Node JSON also changed direction between reports. Those measurements did not
establish a stable 1–2% HTTP penalty.

The implementation now dispatches directly to one checked body parser instead
of traversing five parser middleware layers. The original header still passes
through VPM's media-type, charset, encoding and size checks; raw-body capture,
form bounds and malformed-input handling remain intact. HTTP handlers returning
ordinary values, including `res.json(...)`, no longer allocate unnecessary
promises. Actual promises and custom thenables retain rejection handling,
once-read getters, deferred invocation and first-settlement behavior. Captured
thenable state is kept outside the common event-invocation callback.

The [follow-up harness](packages/vfunctions-framework/bench/optimize.cjs) compares
upstream 5.0.2, the unchanged VPM runtime from `119f04c`, and the optimized runtime
with the same installed dependencies. Three reports per runtime each use all six
execution orders: **18 samples per variant and workload**. HTTP warmup/request
counts and startup boundaries are unchanged. Comparisons take the median of
within-round ratios, preserving pairing rather than dividing independently
pooled medians. The [six follow-up reports](packages/vfunctions-framework/bench/results/optimized)
retain every sample and source hash; the [previous-runtime fixture](packages/vfunctions-framework/bench/fixtures)
contains the verified archive.

Elapsed-time changes below use those paired ratios; **negative is faster**.
"Previous" is the unchanged VPM runtime, not upstream.

| HTTP workload | Node vs upstream | Node vs previous | Bun vs upstream | Bun vs previous |
| --- | ---: | ---: | ---: | ---: |
| GET | -2.4% | -1.3% | -4.8% | +2.2% |
| Deep path with query | -3.6% | -1.2% | -0.2% | +6.0% |
| JSON body | -1.6% | -0.9% | +1.6% | -5.0% |
| Form body | -3.3% | +2.3% | -10.0% | -8.1% |
| JSON, mixed-case type and charset | +2.4% | +0.9% | -1.7% | +4.5% |
| Form, mixed-case type and charset | -0.9% | -6.0% | -7.4% | +1.6% |
| Async JSON handler | -3.3% | +0.1% | -5.7% | +2.1% |
| Structured CloudEvent | -3.6% | +4.0% | — | — |

The original Node JSON and Bun form workloads are ahead of upstream in these
medians, but the results do **not** establish a universal HTTP speedup. Node JSON
is 0.8–2.7% faster than upstream across the three report medians. Bun form results
range from 16.3% faster to 9.9% slower, making the pooled paired 10% reduction an
unstable estimate. Bun shows substantial run-to-run drift throughout this set.
Remaining upstream gaps include Node JSON with a charset parameter (+2.4%) and
Bun plain JSON (+1.6%). Some comparisons with the previous VPM runtime also
regress, including Node forms and CloudEvents and Bun deep paths; they remain
visible above. These small local results do not justify removing correctness
checks or claiming production throughput gains.

Startup remains ahead of upstream in all paired medians: listening takes
29–31% less time on Node and 10–17% less on Bun; first response takes about 28%
less on Node and 7–16% less on Bun. Compared with previous VPM, the paired startup
medians are 0.7–6.4% lower. Startup and HTTP raw samples remain available together.

</details>

## vread-package-up

Replaces `read-package-up` 11.0.0 for raw manifest reading with **zero external
dependencies**. Functions Framework 5.0.2 requests `normalize: false` when
choosing CommonJS or ESM. The pinned upstream branch declares three dependencies
and installs 20 distinct transitive packages, including declaration-only
packages; normalization and rich diagnostics are imported even in raw mode.

This is an intentional API simplification: **raw metadata only, behind a
required `normalize: false`**. Omitting it throws rather than handing a caller
written for upstream's normalizing default different field values. npm metadata normalization and normalized-result
types are not provided. Callers that rely on normalized fields need a separate
normalization step. No automatic replacement of those callers is claimed.

The implementation validates inclusive ancestor boundaries, checks opened file
descriptors before reading, closes them on success/failure, propagates filesystem
errors and rejects invalid UTF-8 or non-object manifests. Error messages identify
the path and reason without exposing manifest contents. There is no parsed-result
cache, and symlink-following boundaries are lexical rather than a sandbox.

The 51 package tests include both unchanged upstream lookup tests and additional
error, filesystem-race, boundary, Unicode and concurrency checks. Integration
adds 122 upstream comparisons in raw mode plus three real framework loader cases.
Archive consumers cover CommonJS, ESM and TypeScript 7. The
[API guide](packages/vread-package-up/README.md) documents the compatibility
boundary and the benchmark method.

The Bun optimization uses a fatal UTF-8 decoder for manifests of at least 4 KiB
and overlaps parsing with descriptor closure. It still waits for cleanup before
settling and preserves read/close-error precedence. No result cache or blocking
I/O is introduced. All original correctness checks remain.

Three sequential benchmark processes per runtime on Node 24.22.1/Bun 1.4.0
(macOS arm64, 2026-10-28) compare upstream, the previous VPM implementation and
the optimization in all six execution orders. Bun’s 66 KB async read takes
**10–16% less time than the previous VPM implementation** (aggregate 149.34 →
132.90 µs), but remains 14–30% slower than upstream. Small adjacent reads remain
**30–49% slower than upstream**; this is a partial improvement. The descriptor
check and explicit cleanup require separate async operations, while upstream’s
path-based reader bundles opening, reading and closing in its native read.

The larger sync Bun median improves (68.35 → 55.85 µs), but one run regresses,
so no consistent gain is established. Bun’s short malformed async case costs
1–12% more than the previous VPM build. Node’s larger sync case costs 2–4% more
than the previous build while remaining about 75% faster than upstream.
Directory skipping still costs 14–16% more than upstream on Node and 82–90%
more on Bun. [The full report](packages/vread-package-up/README.md#benchmarks)
records all cases and raw samples.

Import plus first async read still takes about **93% less time on Node and
66–70% less on Bun than upstream**, excluding process launch with a warm OS
filesystem cache. Aggregate medians are 26.44 → 1.95 ms and 19.69 → 6.39 ms.
These are reader measurements, not full application startup.

## vminimist

**Consumer and baseline:** minimist 1.2.8 parses startup arguments in Functions
Framework 5.0.2. Both implementations have zero runtime dependencies. VPM includes
its own declarations and retains the familiar CommonJS/ESM default function API.

**Corrections:** own-property dictionaries accept names such as `toString` without
inherited configuration collisions. Overlapping aliases form complete groups,
boolean aliases handle `=false` correctly, and dotted boolean classification uses
the full name. Reserved `_`/`--` arrays and prototype-navigation paths cannot be
written through options. Parsing snapshots arguments/configuration before
callbacks and does not modify caller-owned defaults. Large positional tails avoid
variadic argument limits; ordinary flat options skip dotted-path machinery.

**Boundaries:** malformed inputs/configuration are rejected explicitly. Inherited
options are ignored; structural path collisions throw. Opaque default objects
retain their identity and must be copied before caller mutation. Numeric values
still use JavaScript Number semantics; uppercase exponent E is additionally
recognized. [The API guide](packages/vminimist/README.md) details these changes.

**Verification:** 61 unchanged upstream tests plus 23 local regression tests run
on Node and Bun. Coverage includes 5,000 generated comparisons, deep paths, long
alias chains, large argument tails, getters and inherited setters. Six startup
scenarios run through the actual Functions Framework option parser with minimist
replaced. npm/Bun six-file archives pass CJS/ESM and TypeScript 7 consumer checks.

**Performance, 2026-10-28:** three fresh Node 24/Bun processes with ten alternating
samples per case. Functions Framework argument parsing takes **28–30% less time
on Node** and **48–52% less on Bun**; simple long flags take **46–51% / 62–63% less**.
Node dotted/alias cases have mixed results. Validating and snapshotting a
1,000-argument `stopEarly` input takes **15–23% more on Node** (4.23 → 4.86 µs),
while Bun takes **30–35% less**. [The full report](packages/vminimist/README.md#benchmarks)
retains all cases, samples and hashes. These are parser-call measurements, not
full startup or HTTP throughput results.

## vcors

**Baselines:** cors 2.8.5 and 2.8.6. Firebase Functions uses this middleware for
origin policies and OPTIONS handling. The comparison fixture now pins 2.8.6;
vcors replaces it before Firebase loads. Runtime dependencies drop from two
(`object-assign`, `vary`) to one (`vvary`); the per-request options copy is removed.

**Correctness:** static options/arrays are validated and snapshotted once.
Global and sticky RegExp policies have private state and stable decisions;
cyclic arrays fail explicitly and deep arrays use iterative traversal. Callback
providers settle once, including reentrant callbacks, while downstream exceptions
retain their propagation. Dynamic allow/deny decisions vary by Origin. Reflected
request headers are echoed as cors echoes them, refusing only characters a header
cannot carry, before CORS writes; inherited fields are ignored, and
middleware-generated empty preflights clear transfer/trailer/encoding conflicts.

**Boundaries:** empty allowed-header strings disable reflection; static policy
mutations require new middleware or an options delegate. Flags/statuses/max ages
have explicit contracts. Wildcard-plus-credentials behavior is preserved rather
than silently expanded to reflected origins. CORS does not authorize the handler
or remove grant headers written by earlier middleware. See the
[package API and differences](packages/vcors/README.md).

**Caller specialization:** known Vary field names can be written directly when
no header exists, and exact matches/wildcards need no merge. Other existing Vary
values go through vvary's merge, with captured values and method receivers.

**Verification:** 39 upstream tests run with unchanged assertions, plus 30 local
regressions on Node and Bun. Tests cover descriptor/getter snapshots, regex state,
large/deep/cyclic policies, callback errors and duplication, cache variation,
invalid headers and real HTTP framing. The shared Functions Framework/Firebase
gate covers these paths on both runtimes. npm/Bun six-file archives pass CJS/ESM
runtime and TypeScript 7 consumer checks without ambient platform types.

**Performance:** three fresh processes on Node 24 and Bun compare both upstream
versions with vcors, retaining raw samples and hashes. Against cors 2.8.6,
origin-reflecting GETs take **30–33% less time on Node** and **59–61% less on Bun**;
reflected-header preflights take **22% / 37–38% less**. A 250-origin allowlist
takes **87% / 85–86% less**. The [full report](packages/vcors/README.md#benchmarks)
also records setup costs: configured factory creation is 16 → 702 ns on Node
and 18 → 536 ns on Bun; construction plus one GET is 55–56% / 1–14% slower.
Callback denial does additional cache-header work (83 → 213 ns / 175 → 212 ns),
and Bun's default factory is about 4 ns slower in the aggregate. These component
measurements include synthetic HTTP objects; they are not HTTP throughput results.

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

**Negotiation correctness:** vnegotiator reads quality values exactly as
negotiator does (`parseFloat`, with an absent or empty `q` meaning 1), because
real clients send weights such as Java `HttpURLConnection`'s default `q=.2`.
Language, charset and encoding entries accept any nonempty value, and
`*/subtype` media ranges are honored. More matching media parameters now mean greater specificity; exact zero
exclusions are respected. Charset labels compare without case, while other
parameter values compare exactly and parameter `*` is literal. Equally weighted
and specific duplicate entries keep their earliest header position.

**Wrapper behavior:** vaccepts preserves extension aliases and first-original
return values. Like accepts, an empty Accept header is treated as absent.
Absent headers still validate offers, skipping unknown
extensions and malformed names. Its read-only `headers` view stays coherent
with the request used by its negotiator after header replacement. Both packages
read own lowercase header fields, accept string-array fields, avoid coercion,
and freeze their exports and method prototypes.

**Compatibility:** these target the actual consumer versions, negotiator 1.1.0
and accepts 2.0.0. They preserve callable/new-able constructors, Express-facing
methods, aliases, list/selection returns, encoding identity rules and upstream's
language fallback. The latter is not full RFC 4647 lookup. The generic parameter
parser remains tolerant: quoted numeric weights and first duplicate parameters
are retained. Exact parameter values, own-header rules, invalid offers and the
read-only headers view are documented changes. Both complete dependency trees consist of existing VPM packages, with
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
The shared HTTP gate substitutes `vbytes` into real `body-parser` and
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
gate exercises this package through real `body-parser` and
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

## vexpress

**Baseline:** Express 5.3.0 at `cf6722bf89a86905281d9160b6482e08166b5ef0`.
The recognizable Express 5 application API now runs entirely on VPM: 28 direct
and 39 total external dependencies. The locked upstream comparison graph uses
64 distinct external package names, with 68 installed copies. VPM removes 25
of those package names while retaining the framework's application boundaries.

**Application fixes:** binary views send their exact byte window, including
DataView and multi-byte typed arrays. Generated responses use coherent length,
transfer and trailer framing. Invalid ETag/query/proxy settings leave the previous
configuration intact, and proxy hop counts must be nonnegative safe integers.
Handler arrays are validated before registration, cyclic/deep arrays are handled
iteratively, and middleware groups compile their mount path once. Public route
overrides remain available. File/render options are copied, delayed file headers
are snapshotted, inherited header/default properties are ignored, and the built-in
View completes once even if an engine calls back twice or calls back then throws.

**Caller specialization:** exact canonical UTF-8 Content-Type strings avoid
repeated general parsing. Built-in ETags hash short strings directly; custom
functions keep the Buffer contract and large bodies share one encoding. Response
overrides and general parser behavior remain covered. Existing VPM dependency
differences remain deliberate and are listed in the package documentation.

**Verification:** 46 local regression tests on Node and Bun. The upstream unit
and example-acceptance suites pass **1,261 tests on Node 24**, with 19 explicit
assertion changes for VPM dependency diagnostics (messages, not outcomes) and no
skipped tests.
Bun passes **1,255 with six pending** cases that fail identically against unchanged
Express. The [isolated harness](scripts/express-conformance/README.md) explains
each adaptation and runtime limitation; comparison dependencies are test-only.
The shared Functions Framework/Firebase gate exercises Express itself as a replacement. npm/Bun package archives contain thirteen vexpress
files and pass CJS/ESM and TypeScript 7 consumer checks without ambient platform
types. Shared totals are recorded under [current verification](#current-verification).

**Performance:** the [package report](packages/vexpress/README.md#benchmarks)
compares upstream, upstream with VPM dependencies, and vexpress in three fresh
processes per runtime. Component tests and eight-client loopback HTTP tests
retain separate results. Raw samples include source hashes and the comparison
lockfile hash, and report remaining regressions and noise alongside improvements. Node 24
JSON response components take **28–31% less time**, and Bun takes **38–40% less**,
with ETags enabled. Loopback HTTP workloads improve roughly **4–8% on Node**
and **0–8% on Bun**. Initial Node application creation was **3–6% slower**, and
Bun's header-only case varies from **16% faster to 10% slower**. These measurements
are workload-specific; they do not establish production throughput.

**Application construction follow-up (2026-10-28):** the startup number measures
warm application creation after module loading. A caller-specific descriptor copy
uses direct assignment only for ordinary data properties absent from the fresh
function and its prototype chain. Accessors, symbols, special property attributes,
live prototype edits and overrides retain their behavior; proxies/custom function
prototype chains use the general copier. Settings and registration safeguards
are unchanged. Eight additional regressions and the HTTP gate exercise these
boundaries, including a real consumer using the general fallback.

Three fresh processes per runtime, with an exact saved previous factory control,
show construction taking **48–49% less time on Node 24** (25,207 → 12,881 ns)
and **9–13% less on Bun** (8,428 → 7,380 ns). It is also **46–48% faster than
upstream Express on Node** in these runs. One-route setup takes **38–39% less
on Node**. The [follow-up report](packages/vexpress/README.md#application-construction-follow-up-2026-10-28)
preserves all request controls: Node absolute-URL JSON takes 1–5% more than the
previous factory; Bun has wider variation, including up to 18% more for direct
`res.end`. These results establish a construction improvement, not a new
request-throughput claim. Cold process/import startup was not measured.

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
Registering with no handlers, including `router.use()` with no arguments, throws
upstream's `argument handler is required`; the first iterative flattener looped
forever on that call, which router's own suite exercises.

**Caller optimization:** one middleware registration compiles its path once;
route handler layers reuse a stateless root matcher. Layer arrays/results remain
independent. Percent-free captures avoid decoding, parameter-free dispatch avoids
callback setup, and three known request fields are restored directly. A local
pathname cache avoids full URL objects for ordinary URLs and follows middleware
URL rewrites. Complex forms retain vparseurl's parse boundary and call the same
native `node:url.parse` directly, without a disposable request or redundant cache
entry. This removes vparseurl from the router's dependency list. These choices
preserve the standalone dependencies' public behavior.

**Verification:** 53 package tests on each runtime, including upstream parity,
all HTTP methods, async errors, parameter concurrency, deep dispatch, RegExp
capture/state cases, 300 generated URL comparisons and 3,361 additional complex
URL pathname comparisons. Explicit tests preserve invalid-input handling, getter
read counts and independence from mutable shared parse results. The shared gate includes router requests through real
Express/Functions Framework consumers. npm/Bun archive consumers check ten-file contents, three rewritten
VPM dependency versions, CJS/ESM runtime imports and TypeScript 7 without ambient
platform types. The [router suite](scripts/router-conformance/README.md) runs
router 2.2.0's 694 upstream tests unchanged in CI: all pass on Node, and Bun
passes 693 with one `OPTIONS *` case that upstream router also fails there.

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
The shared HTTP gate exercises Express/router warning behavior. npm/Bun archive installs verify eight-file contents,
CJS/ESM, browser conditions/bundling, and TypeScript 7 without ambient platform
types. See [current verification](#current-verification) for shared coverage.

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
comparisons, input mutation, getter counts, custom codec contracts and adversarial paths. HTTP checks include URI errors both before and inside the application. npm/Bun archive
installs pass Node/Bun CJS/ESM and TypeScript 7 consumers, with seven-file contents
and no platform ambient declarations. See [current verification](#current-verification) for shared coverage.

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
the shared Express/Functions Framework gate on Node and Bun. npm/Bun
archives cover CJS/ESM imports, six-file contents, rewritten VPM dependency
versions and TypeScript 7 consumers without ambient platform types. See [current verification](#current-verification) for shared coverage.

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
Archive checks cover the
eight-file package, npm/Bun installs, Node/Bun CJS/ESM imports and TypeScript 7
consumers without platform types. See [current verification](#current-verification) for shared coverage.

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
repeated header lines. npm/Bun archive installations pass CJS/ESM runtime and TypeScript 7 consumers
without platform ambient declarations.

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
package, pass on Node 24.22.1 and Bun 1.4.0. The shared gate checks real Express startup success/error paths and a symbol
getter copied into an application. Proxy-order, symbol-snapshot and overlapping
typed-array regressions protect the optimized enumeration paths. Isolated npm/Bun archives pass Node/Bun CJS/ESM
consumers and TypeScript 7.0.2 with no platform ambient declarations.

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
misses tab-surrounded wildcards. New names are validated before any response
write, even with a wildcard. An existing header is converted and kept as vary
keeps it, so a malformed Vary set elsewhere cannot make later calls throw; only
characters Node's setHeader rejects are refused. Field-array elements and
response methods are captured once. Numeric, coercible-object and sparse-array
fields are rejected. Empty list members are ignored
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

**Shared verification:** real Express and CORS consumers exercise these packages
in the integration gate. npm/Bun archives pass Node/Bun CJS/ESM consumer checks
and strict TypeScript 7 checks. Shared totals are recorded under
[current verification](#current-verification).

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
Safe-integer checks prevent imprecise/infinite ages. The modern API requires
explicit strings, booleans and callbacks; built-in errors do not echo secrets.
Tests reproduce the current-upstream getter/date behavior; these are configuration
hardening improvements, not a claim of a demonstrated remote vulnerability.

**Compatibility:** legacy and modern parsing retain their different quote,
duplicate and custom-decoder-error contracts. Modern serialization retains
2.0.1's broader characters and encoding; the legacy adapter preserves 0.7.2's
stricter characters and `encodeURIComponent`, and its attribute coercion: a
falsy attribute is omitted, flags are truthy checks and `maxAge` is coerced and
floored, so `res.cookie(name, value, { domain: null, secure: 1 })` behaves as it
does upstream instead of failing the response. A 328-case differential against
0.7.2 `serialize` differs only for unsafe ages and array-valued domain/path. The
modern serializer rejects numeric strings, truthy nonboolean flags and fractional
ages. Both reject nonstring encoder/decoder results, spoofed Dates and unsafe
ages. The package README lists the complete differences.

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
parameter conversion with a floored count. `parameterLimit: 2 ** 32` retains
both fields in `a=1&b=2`. Options are coerced exactly as body-parser 2.4.0
coerces them (numeric strings, truthy flags, falsy type/verify, Infinity
limits), so every configuration that boots upstream boots here. The exceptions
fail at construction: NaN, negative or malformed limits and undecodable default
charsets, which upstream accepts and then enforces no limit, a truncated limit,
or a 415 on every request. Type arrays are copied and option snapshots are stable.

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
Only unusable limits and charsets fail early; a construction differential over
1,632 option values matches upstream everywhere else.
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
would compare VPM against itself. Runtime declarations are separately checked
without any Node, Undici, or DOM ambient types.

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

## Interpreting the evidence

Benchmark tables identify the runtime, date, inputs, and sampling method. Most
measure individual utility calls; `vsend`, `vserve-static` and `vbody-parser` measure sequential localhost HTTP
requests. Neither establishes production throughput, tail latency, or application
memory use. Known regressions belong beside gains. A correctness fix or easier
auditing does not by itself establish that an exploitable vulnerability was fixed.

Packages are currently available from this repository as standard package
archives. Registry publication, automatic replacement of installed dependencies,
and native VPM support in `bun install` remain future work. Applications benefit
only after adopting and validating the replacements they use.
