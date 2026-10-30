# Retry conformance

Isolated controls pin **retry 0.13.1** and **async-retry 1.3.3**, verified as npm's
stable releases on October 30, 2026. The original packages and fake-timers are
fixture dependencies, excluded from VPM runtime dependencies and package archives.

```sh
npm --prefix scripts/retry-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/retry-conformance/run.cjs
node scripts/retry-conformance/run.cjs --upstream
node scripts/retry-conformance/regressions.cjs
node scripts/retry-conformance/callers.cjs
node scripts/retry-conformance/callers.cjs --upstream
```

Repeat with `bun`. Supported runtime checks use Node 24 and Bun. Retained source
is pinned to retry commit `b8e26ea7adda3f11c19086a762d15e95521f3e4e` and
async-retry commit `9505be1f829ea297e7aff6c731ca3d5bd7052ed7`, with per-directory
SHA-256 manifests and upstream licenses. Per-line trailing whitespace is
normalized in the retained text. npm controls have lockfile integrity hashes.

## Upstream and focused cases

`run.cjs` executes **26 retry cases and all nine async-retry cases** against each
implementation. No runtime case is skipped. Deterministic fake timers cover Date,
performance and timer scheduling; a fixed random value makes schedules repeatable.
Each subprocess must print an explicit completion marker before exiting.

The retry tests' old `fake` helper is replaced with an exact-count callback adapter
because its stack-callsite parser fails on Bun. The adapter implements every helper
API used by these tests. Two vacuous upstream loops comparing an integer with an
array are repaired to use its length; the monotonic comparison starts at index 1.
The async suite's AVA equality assertions use strict native assertions. Its sleep
helper uses the fake clock, and external Wikipedia fetches become deterministic
successful or rejected promises. This checks retry handling, not fetch behavior.

`regressions.cjs` reproduces five differences in the pinned originals and checks
VPM's corrected results: reserved error-message counts, option mutation, incomplete
reset, retries after bail and ignored zero budgets. The root suite adds **35
focused tests** covering configuration validation, finite and forever schedules,
timeouts/unref, monotonic budgets, timer overflow, stale callbacks, frozen options,
falsy failures, thenables and failing hooks. Public types and packed imports have
separate repository gates.

## Real Storage callers

`callers.cjs` loads unmodified **Storage 8.4.0** `TransferManager` and its private
XML multipart helper from the existing SDK fixture. It replaces only async-retry
in process-local module state, restoring caches afterward. Actual temporary files
and local auth-request doubles exercise **15 operations / 21 attempts** across
initiation, parts, completion, abort, exhausted errors, fatal errors, resumed
uploads and disabled retries. It checks SDK options, counts, XML, bytes, MD5,
headers and failure handling. Only backoff waits and randomization are scaled for
the test; retry counts, budgets and bail decisions come from the SDK. `--upstream`
uses its installed async-retry 1.3.3. The integration gate supplies instrumented
VPM replacements.

These checks also expose existing SDK behavior with either implementation:

- An immediately rejected part can reject before Storage attaches its batch
  handler. Terminal single-part responses therefore wait for the file stream to
  close and one immediate turn, so these tests exercise retry policy without that
  SDK observation race. No global unhandled-rejection suppression is installed.
- Resume seeks past existing bytes but restarts part numbering at 1, overwriting
  earlier map entries. The fixture verifies that existing wire behavior under both
  libraries; it does not assert successful resumed-object reconstruction.
- A successful automatic abort resolves the upload call rather than rejecting.
  The fixture retains that SDK behavior too.

These are caller-level limitations, not fixes supplied by the retry packages.
There are no cloud credentials or live service calls.

## Benchmarks

[vretry](../../packages/vretry/bench/results/README.md) and
[vasync-retry](../../packages/vasync-retry/bench/results/README.md) use alternating
paired rounds, varied inputs, retained outputs, three fresh processes and one
identical-upstream control per runtime. Reports include source hashes, raw samples
and regressions. Timer latency is reported separately from CPU work.
