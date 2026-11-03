# Accessibility isolation comparison fixtures

Pinned aria-hidden 1.2.6, Radix menu 2.1.16, React 19.1.0, jsdom and esbuild are
comparison fixtures, not VPM runtime dependencies.

```sh
npm --prefix scripts/aria-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/aria-conformance/run.cjs
node scripts/aria-conformance/callers.cjs
node scripts/aria-conformance/archives.cjs
node scripts/aria-conformance/browser.cjs
```

Repeat the first two scripts with Bun. Fourteen scenarios run on each original
and VPM implementation, with explicit expectations for repairs. Four additional
VPM scenarios cover nested shadow roots, invalid-marker atomicity, foreign-realm
inert detection and shared markers across modes. Server imports and empty lists
are checked separately. The tests are independently authored; no upstream-suite
pass is claimed.

The caller fixture bundles the unchanged Radix menu and intercepts only its
aria-hidden import. Both versions must invoke `hideOthers`, hide outside content,
keep live regions visible and restore attributes after unmount. This verifies a
real caller rather than imitating its effect.

Archive checks pack the package, install it with npm and Bun, then verify shared
CJS/ESM identity on both runtimes, server safety, TS7 readonly target types and a
standalone browser bundle. Chrome independently verifies native inert blocking
focus, undo restoring focusability and ARIA live-region exclusions for both
versions. Set `CHROME_BIN` if Chrome is not in a standard location.

[Performance measurements](../../packages/varia-hidden/bench/results/README.md)
use isolated processes and identical-source controls. No accessibility API or
screen-reader performance claim is made.
