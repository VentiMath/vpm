# vfunctions-framework

HTTP, CloudEvent and legacy event functions on the VPM stack, derived from
`@google-cloud/functions-framework` **5.0.2**. Supports Node.js 20+ and Bun;
performance work targets Node 24 and Bun. Includes portable TypeScript declarations.

```js
const { http, cloudEvent } = require('vfunctions-framework')

http('hello', (req, res) => {
  res.json({ message: 'Hello', executionId: req.executionId })
})

cloudEvent('created', async event => {
  console.log(event.id, event.data)
})
```

ES modules use `import { http, cloudEvent } from 'vfunctions-framework'`.
Registered functions are selected by name. Exported functions also work, including
nested targets such as `handlers.hello`, CommonJS modules, `.mjs` files and
packages with `"type": "module"`.

## Running and testing

After installing a packed package and its VPM dependencies, use the
`vfunctions-framework` executable:

```sh
vfunctions-framework --source=. --target=hello --port=8080
```

This repository currently provides workspace packages and standard package
archives; it does not claim that these names are published in a registry. To
inspect or pack this package, run `bun pm pack` in this directory. The
[archive gate](../../scripts/check-media-archives.cjs) demonstrates isolated npm
and Bun installation of the complete dependency tree.

| CLI option | Environment variable | Default |
| --- | --- | --- |
| `--source` | `FUNCTION_SOURCE` | Current directory |
| `--target` | `FUNCTION_TARGET` | `function` |
| `--port` | `PORT` | `8080` |
| `--signature-type` | `FUNCTION_SIGNATURE_TYPE` | `http` |
| `--timeout` | `CLOUD_RUN_TIMEOUT_SECONDS` | `0` (disabled) |
| `--log-execution-id` | `LOG_EXECUTION_ID` | `false` |
| `--ignored-routes` | `IGNORED_ROUTES` | Default HTTP favicon/robots exclusions |

CLI values take precedence. Signature types are `http`, `event` and `cloudevent`;
a registered handler's signature takes precedence over the configured type.
An empty ignored-routes value disables exclusions; a nonempty value is an
Express 5 route expression. `--help` prints usage. The upstream executable names
are replaced by `vfunctions-framework`.

```js
const { getFunction, getTestServer } = require('vfunctions-framework/testing')
require('./index.js') // registers hello

const handler = getFunction('hello')
const server = getTestServer('hello')
server.listen(8080)
// Close the server when the test finishes.
```

`getFunction` returns the handler or `undefined`; `getTestServer` throws for an
unknown name and otherwise returns an unstarted native HTTP server. It can be
used with an HTTP testing client. The testing subpath also supports ESM imports.

## Behavior and deliberate differences

The framework preserves JSON, text, form and binary parsing, `req.rawBody`,
execution/trace context, structured and binary CloudEvents, legacy background
events, Pub/Sub emulator requests and the upstream Google event conversions.
Callback and promise event handlers remain supported. HTTP handlers write their
own responses. CloudEvent and legacy handlers return a value or call their
completion callback; a missing result produces 204.

Changes from the pinned upstream framework:

- Five direct VPM dependencies replace seven upstream dependencies. Public types
  use structural HTTP and CloudEvent interfaces, removing `@types/express` and
  the runtime-installed CloudEvents SDK. They are not the SDK's validator or a
  reproduction of every ambient Node/Express type member.
- Concurrent first requests share one correctly initialized async-context store.
  Logging respects Buffer/Uint8Array slice boundaries, handles JSON scalars and
  invalid labels, preserves write encodings outside request context, and can be
  enabled repeatedly without wrapping streams again.
- HTTP handlers catch rejected thenables, promises from other realms and throwing
  `then` getters. Ordinary return values avoid promise allocation; actual
  thenables retain deferred invocation, once-read getters and first-settlement
  behavior. Event completion binds to the request's captured domain instead
  of the process-global `process.domain`; synchronous errors are caught explicitly.
  This fixes the upstream event-handler failures reproduced on Bun 1.4.0.
- Handler registration requires a string name and callable handler. Export lookup
  follows own properties and handles null intermediates. Existing registrations
  can still be replaced by registering the same name again.
- A timeout is an idle-socket cancellation signal, **not an execution deadline**.
  `req.abortController.signal` remains live after the request body ends; response
  completion removes listeners and clears that request's timeout. Disconnects
  abort unfinished work. Handlers must observe the signal and finish their work.
  Timeout values must be integer seconds from 0 through 2,147,483; suffixes,
  fractions and timer-overflow values are rejected.
- Non-POST requests to event endpoints return 404 before event conversion.
  Conversion tables check own event-type entries. Global middleware no longer
  performs unnecessary wildcard capture; user-handler route parameters remain.
- Body parsing dispatches directly to the matching VPM parser, replacing five
  parser middleware layers with one. Known media types receive an exact ASCII
  match with ASCII-only optional whitespace and own-header lookup; that check
  is performed once. The selected reader checks the original header's complete
  parameters, charset, framing, encoding and limits, and captures `req.rawBody`.
  Unknown or malformed media types retain the checked binary-parser fallback.

The upstream 1 GiB parser limit, proxy-trust setting, disabled ETags and disabled
`X-Powered-By` header are retained. Those defaults assume the usual deployment
layer applies its own request limits and proxy boundary. Fatal process error
handling and detached asynchronous errors retain the upstream domain/process
model; this package does not promise isolation of arbitrary background work.
Cloud deployment configuration and application migration remain separate work.

## Dependencies and verification

Direct dependencies: `vbody-parser`, `vexpress`, `vminimist`, `von-finished`, and
`vread-package-up`. The complete tree contains **42 external VPM packages**.
The pinned upstream consumer installation has **126 external package instances**
reachable through its declared dependencies, including declaration-only and
SDK branches; this is an installed graph comparison, not a count of modules
loaded for every request.

The package regression suite covers request isolation, body bytes, thenables,
events, CLI startup, loaders, logging and real timeout cancellation. The verified
[upstream suite](../../scripts/framework-conformance/README.md) runs all 105
unit/integration tests on both Node and Bun without assertion changes or skips.
The [shared integration gate](../../scripts/integration.cjs) runs Firebase handlers
through this implementation. Archive checks cover npm/Bun installation, executable
packaging, CJS/ESM imports, HTTP serving and TypeScript 7 consumers.
See [current repository verification](../../IMPROVEMENTS.md#current-verification)
for aggregate counts.

## Benchmarks

[The initial harness](bench/compare.cjs) measures real CJS/ESM handler loading through
server readiness and the first HTTP response. It excludes process launch and
fixture creation. Request measurements include a sequential keep-alive client,
200 warmup requests and 1,000 checked round trips per workload. Seven alternating
fresh-process pairs form each report; three initial reports are retained per runtime.
OS filesystem caches are warm. These local measurements are not deployed cold
starts or concurrent production throughput.

[Initial raw reports](bench/results) include all samples, runtime/CPU information,
dependency source hashes and the pinned consumer lockfile hash. Event timing is
compared on Node only: the published upstream event path fails on Bun, and timing
that failure would not be a meaningful performance comparison.

The [HTTP follow-up](bench/optimize.cjs) compares upstream, the previous VPM
runtime (`119f04c`) and the current runtime in six balanced execution orders per
report. Three [reports per runtime](bench/results/optimized) retain 18 samples
per variant and workload, including mixed-case Content-Type parameters and an
async JSON handler. The unchanged previous runtime is stored as a SHA-256-checked
`git archive` of that commit's `packages/vfunctions-framework/lib` directory;
extraction happens before timing and both VPM variants use the same dependencies.
Comparisons use within-round timing ratios, then take their median, so independently
pooled timings cannot reverse the reported direction of a paired comparison.

Run from the repository root after installing the pinned consumer fixture:

```sh
OUTPUT=/tmp/framework-node.json node packages/vfunctions-framework/bench/optimize.cjs
OUTPUT=/tmp/framework-bun.json bun packages/vfunctions-framework/bench/optimize.cjs
```

Results are recorded in the [central comparison](../../IMPROVEMENTS.md#vfunctions-framework).

The [steady-state harness](bench/steady.cjs) isolates each server in a child
process and interleaves short blocks of requests from a shared client. This
avoids mixing different implementations' JIT state and measures server CPU
separately from client CPU. It compares upstream, `119f04c`, `f4e1f06` and current
VPM after 10,000 warmups per server/workload, using eight balanced blocks of
1,000 checked requests. The [manual workflow](../../.github/workflows/framework-benchmarks.yml)
saves three reports per runtime and an identical-code calibration as artifacts.
The calibration uses `f4e1f06` for both before and after; it measures benchmark
variation without a code change. Startup is excluded from this harness.

```sh
NODE_ENV=production OUTPUT=/tmp/framework-steady-node.json node packages/vfunctions-framework/bench/steady.cjs
NODE_ENV=production OUTPUT=/tmp/framework-steady-bun.json bun packages/vfunctions-framework/bench/steady.cjs
```

The [retained Linux reports](bench/results/steady) include three comparisons and
one identical-code calibration per runtime from
[run 40799052313](https://github.com/VentiMath/vpm/actions/runs/40799052313).
Reproduce their paired wall-time and server-CPU summaries without rerunning HTTP:

```sh
node packages/vfunctions-framework/bench/summarize-steady.cjs
```

The earlier fresh-process measurements remain available. Small measured
differences need to be read alongside the calibration and variation between
reports; the central comparison records remaining gaps as well as improvements.
The Linux calibration also varied substantially, so the retained results do not
certify that every HTTP path is faster.

## Provenance

Derived runtime code retains Google LLC copyright notices and the
[Apache-2.0 license](LICENSE). [PROVENANCE.json](PROVENANCE.json) records the
published archive integrity, verified source-test archive and modifications.
Test fixtures and benchmarks are excluded from the installable package.
