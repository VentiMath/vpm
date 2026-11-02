# Scroll-lock comparison fixtures

Reuses the locked [sidecar fixtures](../sidecar-conformance/package.json):
react-remove-scroll 2.7.2, React 19.1.0, jsdom and esbuild.

Run `npm --prefix scripts/sidecar-conformance ci --ignore-scripts`, then
`node scripts/scroll-conformance/run.cjs` and the Bun equivalent. Eighteen newly
authored scenarios run against both implementations: SSR, disabled locks, wheel
boundaries, horizontal/RTL movement, nested scrolling, shards, portals, nested
locks, repeated wheel events, touch reversal, zoom, range controls, pointer
isolation, refs/capture handlers, StrictMode, open shadow roots and lazy sidecars.
Intentional fixes have explicit original/VPM expectations. Listener accounting
verifies one active native listener set for VPM's nested locks and complete cleanup.

The fixture switches each sidecar environment flag from server to browser after
SSR; this simulates a browser bundle in the Node/jsdom test environment. Runtime
sources and assertions are otherwise shared. No upstream test-suite pass is claimed.

`node scripts/scroll-conformance/archives.cjs` packs all VPM dependencies and uses
explicit local overrides in clean npm/Bun consumers. It checks Node/Bun CJS/ESM
identity, root/UI/sidecar imports, SSR, strict TS7 JSX types and a standalone browser
bundle that cancels wheel input, applies CSP nonce/styles and cleans up on unmount.
No original scroll runtime or tslib enters that browser bundle.

[Benchmarks](../../packages/vreact-remove-scroll/bench/results/README.md) use
fresh processes, balanced order and identical-source controls. Outside-wheel
dispatch bypasses React capture queues in both implementations, so the benchmark
does not accumulate upstream timers or compare differently drained event loops.
