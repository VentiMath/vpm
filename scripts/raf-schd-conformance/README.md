# raf-schd compatibility

Pins raf-schd **4.0.3**, @hello-pangea/dnd **18.0.1** and test tooling in the lockfile.
The retained tests, source and MIT license come from upstream commit
`29b96b83cb7775b05e7b3b35bf6e9ca47d38329b`; SHA256.json verifies their bytes.
The original runtime is used only as a development comparison.

```sh
npm --prefix scripts/raf-schd-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/raf-schd-conformance/run.cjs --upstream
node scripts/raf-schd-conformance/run.cjs
node scripts/raf-schd-conformance/callers.cjs --upstream
node scripts/raf-schd-conformance/callers.cjs
node scripts/raf-schd-conformance/archives.cjs
```

Repeat the first four runtime commands with Bun. All 13 original assertions
remain. The runner redirects imports, strips Flow-compatible type annotations,
preserves module strictness and renames the removed Jest `toBeCalledWith` alias
to `toHaveBeenCalledWith`. No test is skipped or given a different expectation.

The caller runner bundles the actual pinned DND scroll listener with only the
scheduler import redirected. A deterministic frame queue and window event host
exercise binding/filtering, latest scroll reads, coalescing, stop/cancel and
restart. The bundle graph verifies the selected scheduler is present. This is
a caller test, not a full browser drag-and-drop integration test.

Archives checks both packages from this cycle (`vraf-schd` and `vlong`) in clean
npm/Bun installs, with Node/Bun CJS/ESM, browser bundles and strict TS7 consumers.

The [benchmark](../../packages/vraf-schd/bench/results/README.md) measures CPU
scheduling cycles with a deterministic frame provider. It does not measure real
frame latency. Each implementation is timed in fresh processes with balanced
order and identical-source controls.
