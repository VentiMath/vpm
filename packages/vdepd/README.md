# vdepd

Deprecation warnings for libraries. Replaces `depd` 2.0.0, used by Express 5.3.0
for redirect warnings and router 2.2.0 for non-native thenables. Zero runtime
dependencies; CommonJS, an ESM default import, self-contained TypeScript
declarations, and a browser no-op entry.

```js
const deprecate = require('vdepd')('example-library');
// Also: import depd from 'vdepd'; const deprecate = depd('example-library');

function oldMethod() { deprecate('use newMethod instead'); }
const oldAdd = deprecate.function(function add(a, b) { return a + b; }, 'use sum');
const settings = { legacy: true };
deprecate.property(settings, 'legacy', 'use current instead');
```

## Improvements

- Warning policy and deduplication state live in private closures. Callers cannot
  suppress warnings by changing `_ignored` or reset them by replacing `_warned`.
  The returned deprecator and its methods are frozen; methods can be detached.
- Function wrapping uses a Proxy instead of generating JavaScript from the
  function's argument count. Calls retain the receiver, arguments, return value
  and thrown error. Classes, native constructors, subclasses, name, length,
  prototype and static properties remain usable. The target is not frozen.
- Data-property writes through a prototype create a property on the receiver;
  upstream changes the value shared by the prototype and its other children.
  Accessor installation uses one definition, so failure cannot leave the
  preliminary data-to-accessor conversion that upstream performs.
- Node's native call-site API avoids changes to global error hooks. On Node, factory and
  wrapper creation capture only the needed frames. Node warning calls start with a
  short capture and expand when the caller is deeper or a new trace is needed.
- Bun and the older Node fallback restore error-hook state in `finally`,
  including when capture fails. Only compact frame data is retained for warning
  output; live V8 call-site objects and their receiver references are not kept.

These changes improve wrapper correctness and diagnostic isolation. They do
not establish an application security fix or an HTTP throughput improvement.

## API and compatibility

`depd(namespace)` requires a nonempty string and returns `deprecate(message?)`.
Warnings occur once per deprecation location and external caller location,
including column numbers. Changing the message at the same location does not
repeat it. Omitted or empty messages use the function/property name or an
anonymous-location label. Deduplication state is per instance and persists for
that instance's lifetime; it is not a bounded global cache.

`deprecate.function(fn, message?)` returns a wrapper with the original function's
callability and constructability. Direct construction preserves the original
`new.target`; subclass construction preserves the subclass. Static property
writes through the wrapper reach the original target. Like any Proxy, the wrapper
has its own identity and `Function.prototype.toString()` does not return the
target's original source. Static methods using private static fields retain the
usual Proxy receiver limitation; call them with the original class as receiver.

`deprecate.property(object, key, message?)` requires a configurable own property.
Keys are strings, numbers or symbols. Data properties become accessors, retaining
enumerability and writability of the owner value. Existing getters and setters
retain their receiver and are not called during installation. Read-only data and
missing accessors remain restricted. Successful inherited writes create ordinary
writable/enumerable/configurable own data properties; explicit receiver writes
respect existing own data-property flags. Blocked writes through an installed
setter throw, including `Reflect.set()` and non-strict assignment, where an
unwrapped data property can instead return false or silently fail. Freezing an
object after wrapping does not disable the already-installed setter.

`NO_DEPRECATION` and `TRACE_DEPRECATION` accept comma/space-separated namespaces,
case-insensitive exact matches, or `*`. `process.noDeprecation` and
`process.traceDeprecation` also apply. Policy is captured when the deprecator is
created, matching upstream. A listener added with `process.on('deprecation', fn)`
receives an Error with `name: 'DeprecationError'`, `namespace`, `message` and a
lazy writable `stack`, and replaces stderr output even when suppression is on.
Listener exceptions follow the runtime's `process.emit` behavior. Otherwise
stderr uses UTC timestamps and caller locations, or ANSI colors on a TTY;
tracing adds caller frames.

Intentional differences: namespace/property-key object coercion and mutable
underscore internals are unsupported. Warning objects use the standard Error
constructor identity. Exact stack spelling, eval-origin annotations, inferred
receiver type names and colors are not a byte-for-byte compatibility promise.
Stacks use runtime script locations, without source-map reconstruction. Trace
depth follows numeric `Error.stackTraceLimit`, with a minimum of 10 and maximum
of 200; invalid/non-numeric limits use 10. Factory/wrapper locations remain
available even when the application's limit is zero.

On Node 24, native capture works even with a throwing, immutable
`Error.prepareStackTrace`. Bun 1.4 implements its stack API through mutable
Error hooks, so its fallback temporarily changes them and restores them; hooks
must be writable data properties. Bun uses a consistent full capture depth to
avoid truncation seen after alternating short/full capture limits. If Bun's
built-in hook property was deleted, a textual-stack fallback extracts locations. Bun also eagerly runs the current error formatter
when constructing the Error delivered to listeners. These are documented runtime
limitations, not guarantees of hook isolation on Bun.

The browser condition and legacy `browser` metadata select a validating no-op:
warnings do nothing, function wrapping returns the original function, and
property wrapping validates but leaves the descriptor unchanged. That entry
does not import Node modules or require `process`.

## Verification and installation

The package includes 48 focused tests: 30 run the same public-contract checks
against upstream and VPM; the remainder cover corrections, stack hooks, deep
callers, browser behavior and provenance. Node 24 runs all 48. Bun runs 46, with
two explicitly skipped V8-specific checks. Upstream test sources are retained
for reference, not claimed as an executed upstream suite.

The shared Express/Functions Framework gate runs HTTP checks on each runtime,
including requests for redirect, request-handler, parameter-handler
and error-handler warnings, with repeat-warning suppression. Archive checks
install with npm and Bun, exercise Node/Bun CJS/ESM and TypeScript 7 consumers,
verify all eight shipped files, and test browser-condition resolution plus a
browser bundle without Node globals.

```sh
bun install --frozen-lockfile
node --test packages/vdepd/test/*.test.cjs
bun test packages/vdepd/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs

cd packages/vdepd
bun pm pack --destination /tmp
```

Install the resulting `vdepd-0.1.0.tgz` using `npm install /tmp/vdepd-0.1.0.tgz`
or `bun add /tmp/vdepd-0.1.0.tgz`. Registry publication and automatic substitution
for upstream names are not provided. Engines remain Node >=24; local performance
measurements target Node 24 and Bun. The existing CI matrix also verifies older
supported Node runtimes.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

The [harness](bench/compare.cjs) compares the verified `depd` 2.0.0 fixture with
VPM. Thirteen cases separate creation, suppressed calls, deduplicated calls,
first event delivery, and plain/traced stderr. Each uses twelve alternating-order
samples after warmup, retaining 256 results and consuming them outside timing.
Normal cases use 10,000 calls per sample, suppressed calls 200,000. Stderr is
captured in memory. First-warning cases explicitly include factory creation;
event counts are verified. This measures diagnostics, not HTTP request throughput.

```sh
OUTPUT=/tmp/vdepd-node.json node packages/vdepd/bench/compare.cjs
OUTPUT=/tmp/vdepd-bun.json bun packages/vdepd/bench/compare.cjs
```

Measured 2026-10-28 on macOS arm64, Node 24.22.1 and Bun 1.4.0. Three fresh
processes per runtime use matching source/harness hashes. Raw results:
[Node 1](bench/node24.json), [Node 2](bench/node24-repeat2.json),
[Node 3](bench/node24-repeat3.json); [Bun 1](bench/bun14.json),
[Bun 2](bench/bun14-repeat2.json), [Bun 3](bench/bun14-repeat3.json).

First-process medians in **nanoseconds per call**, upstream → VPM. The ratio
ranges include all three processes; lower is better. All thirteen cases follow.

| Operation | Node 24, upstream → VPM | Bun, upstream → VPM | Node ratio | Bun ratio |
| --- | ---: | ---: | ---: | ---: |
| factory | 5,122.4 → 4,883.1 | 3,593.5 → 3,908.6 | 0.925–0.957 | 1.088–1.097 |
| wrap function | 7,269.4 → 4,412.9 | 4,845.7 → 2,904.9 | 0.597–0.607 | 0.599–0.607 |
| wrap property | 9,425.8 → 4,903.1 | 4,428.4 → 3,681.6 | 0.520–0.523 | 0.797–0.831 |
| suppressed / direct | 64.2 → 48.7 | 18.6 → 18.3 | 0.745–0.762 | 0.980–1.036 |
| suppressed / function | 54.0 → 61.1 | 15.5 → 114.7 | 1.101–1.139 | 6.283–7.402 |
| suppressed / property get | 74.5 → 54.7 | 19.6 → 18.2 | 0.734–0.738 | 0.923–0.967 |
| suppressed / property set | 120.5 → 102.4 | 21.0 → 20.0 | 0.850–0.866 | 0.916–0.955 |
| already warned / direct | 7,972.2 → 8,471.4 | 4,586.0 → 3,767.0 | 1.014–1.066 | 0.811–0.821 |
| already warned / function | 9,003.9 → 8,892.2 | 4,170.8 → 4,136.7 | 0.988–1.038 | 0.983–0.992 |
| already warned / property get | 8,997.7 → 8,580.9 | 5,406.1 → 4,760.0 | 0.948–0.959 | 0.869–0.884 |
| factory + first event | 23,320.3 → 26,141.3 | 12,261.1 → 11,763.2 | 1.105–1.121 | 0.959–0.976 |
| factory + first stderr | 17,532.1 → 15,299.9 | 9,686.1 → 9,221.2 | 0.871–0.884 | 0.926–0.952 |
| factory + first traced stderr | 21,421.1 → 19,884.3 | 9,225.0 → 8,679.9 | 0.926–0.937 | 0.910–0.941 |

Function-wrapper creation takes **39–40% less time on both runtimes**;
property-wrapper creation takes **48% less on Node and 17–20% less on Bun**.
Suppressed direct warnings take **24–25% less on Node** and are approximately
unchanged on Bun. Already-warned direct calls take **18–19% less on Bun** but
**1–7% more on Node**, up to 0.54 µs extra. First plain stderr output including
factory creation takes **12–13% less on Node and 5–7% less on Bun**.

Tradeoffs: suppressed function calls through the constructor-preserving Proxy
cost **10–14% more on Node** (up to 7.4 ns) and **6.3–7.4× on Bun**
(up to 99.2 ns extra). First event delivery including factory creation takes
**10–12% more on Node** (up to 2.83 µs), and Bun factory creation takes
**9–10% more** (up to 0.35 µs). Already-warned wrapped function calls vary up to
4% slower on Node (0.35 µs). These costs are retained and visible in the table.
Express and router use direct warnings, not function/property wrappers. Normal
nondeprecated calls do not enter this package's warning path. No application
throughput improvement is claimed.


## Provenance

MIT licensed. [PROVENANCE.json](PROVENANCE.json) records the upstream release,
verified tarball integrity, commit, and hashes of untouched comparison/reference
files. The upstream license and copyright notice are retained in [LICENSE](LICENSE).
See [the central improvements record](../../IMPROVEMENTS.md) for project-wide context.
