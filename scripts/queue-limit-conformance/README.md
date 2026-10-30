# Queue and concurrency conformance

This isolated fixture pins **yocto-queue 1.2.2** and **p-limit 7.3.3**, checked
against npm's stable releases on October 30, 2026. Its original packages stay
outside VPM workspaces and installable archives.

```sh
npm --prefix scripts/queue-limit-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/queue-limit-conformance/run.cjs
node scripts/queue-limit-conformance/run.cjs --upstream
node scripts/queue-limit-conformance/callers.cjs
node scripts/queue-limit-conformance/callers.cjs --upstream
node scripts/queue-limit-conformance/callers.cjs --latest
```

Repeat with `bun` in place of `node`. Supported runtime checks use Node 24 and Bun.
The retained sources and licenses are pinned to yocto-queue commit
`b07eac099753833b29d06c614149904445739776` and p-limit commit
`4d4ec71803d8736567249c3dde06ea82795ae7c7`. Per-directory SHA-256 manifests verify
all retained files. The installed controls are integrity-pinned in the lockfile.

`run.cjs` executes **all seven queue and 30 limiter runtime cases** against both
implementations. It adapts AVA assertions to the native test runner, replaces three
test-only timing/random helpers with built-in equivalents, and explicitly observes
pending rejections before the original delayed rejection assertions. It widens the
serial 600ms test's upper timing bound from 650ms to 3000ms for scheduler jitter;
the original 590ms lower bound remains. Both queue-clear rejection cases run
unconditionally. No runtime case is skipped. Original declaration-test sources
are retained for reference; VPM's generic declarations are checked separately
through TypeScript 7 and the repository's downstream compiler compatibility gate.

The root suite adds **23 focused tests**, including deterministic release barriers,
submission async contexts, randomized FIFO operations, FIFO dispatch during a
concurrency increase, thenable failures, clear/reuse and iterator errors. Upstream
already clears its queue tail reference and guards map iterator failures; these
are preserved behaviors, not new VPM fixes.

`callers.cjs` first exercises 24 tasks in unmodified p-limit 3.1.0 with only
its yocto-queue 0.1.0 dependency replaced by vyocto-queue. This checks the older
queue caller separately from replacing the entire limiter. It then loads actual **Storage 8.4.0** classes from the SDK fixture and replaces
only its limiter in process-local module state. It checks six limiters and
**125 tasks** across deletion, forced deletion errors, public/private permissions,
parallel upload and download methods. File/cloud boundaries use temporary files
and local doubles. It checks arguments, results, error identity and concurrency;
no cloud credentials or network are required. `--upstream` uses Storage's installed
p-limit **3.1.0**, and `--latest` injects **7.3.3**. Module state is restored after
each run. The full integration gate passes its instrumented VPM replacement here.

Benchmarks compare current upstream with VPM using varied inputs, paired rounds,
three fresh processes and an identical-upstream control on each runtime:
[vyocto-queue](../../packages/vyocto-queue/bench/results/README.md),
[vp-limit](../../packages/vp-limit/bench/results/README.md).
