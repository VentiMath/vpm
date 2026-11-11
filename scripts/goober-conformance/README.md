# Goober object-style conformance

Controls are Goober 2.1.19, app-pinned 2.1.18, unchanged Notistack 3.0.2 and
React/React DOM 19.3.1. The independent runtime was authored from documented
contracts and public API observations. No upstream Goober implementation was
read or copied. Notistack is inspected/executed only as the caller control.

`caller.cjs` executes the unchanged CommonJS caller with its Goober import
substituted, records all 20 CSS inputs and rejects unexpected API use. `run.cjs`
compares 240 generated CSS results, normalizing only generated class names, and
checks unchanged SSR provider rendering. Package tests cover intentional fixes
and invalid inputs separately. `browser.cjs` bundles unchanged Notistack three
times and compares computed styles for five variants, six anchors, two densities
and two widths. VPM additionally checks iframe ownership/nonce, shadow styles,
extraction, hydration and recovery after style removal.

```sh
npm --prefix scripts/goober-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/goober-conformance/check-controls.cjs
node --test packages/vgoober/test/*.test.cjs
bun test packages/vgoober/test/*.test.cjs
node scripts/goober-conformance/run.cjs
bun scripts/goober-conformance/run.cjs
node scripts/goober-conformance/types.cjs
node scripts/goober-conformance/browser.cjs
node scripts/goober-conformance/archives.cjs
```

Archives use fresh npm/Bun installs and frozen reinstalls with no dependency
overrides, verify both module systems and both runtime test suites, and compile
installed declarations. This verifies a local artifact, not a public release.

Notistack's production callers include Firebase sign-in/sign-up and calendar
create/update notifications, at app revision `47b9d38c`. The app still installs
upstream Goober. The rest of Goober's styling framework is outside this package's
explicit caller scope. Benchmarks retain all samples and report uncertainty;
primitive serialization timing is not a notification rendering latency claim.
