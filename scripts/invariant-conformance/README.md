# tiny-invariant compatibility

Pins tiny-invariant **1.3.3**, css-box-model **1.2.1** and development tools.
Upstream commit `a6b189389aeaf2b6b2d8517bd3869ec993de4507` provides the retained
source, six runtime test cases, type/bundle tests and MIT license. SHA256.json
verifies retained bytes; the installed source must match the retained source.

```sh
npm --prefix scripts/invariant-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/invariant-conformance/run.cjs --upstream
node scripts/invariant-conformance/run.cjs
node scripts/invariant-conformance/callers.cjs
node scripts/invariant-conformance/archives.cjs
```

Repeat runtime commands with Bun. Runtime assertions remain unchanged; only the
import and type syntax are adapted. The original bundle tests assert Rollup's
exact generated source text; our semantic esbuild checks verify both libraries
without `process` in the browser host, lazy callback execution and error text.
The VPM production bundle is also checked for removal of diagnostic handling. The original type-test source is
retained as evidence; packed strict TS7 consumers independently check narrowing
and rejected message types.

The actual css-box-model source runs unchanged with only its tiny-invariant
import redirected. Valid box geometry and failures in margin, padding and border
parsing must match the original in both modes, with counters proving invocation.
Archives cover npm/Bun installation, Node/Bun CJS/ESM, browser modes and declarations.

The [benchmark](../../packages/vtiny-invariant/bench/results/README.md) uses fresh
processes, balanced order and identical-source controls. It measures local
assertion costs, not whole-application latency.
