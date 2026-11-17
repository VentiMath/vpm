# Camelize acceptance

The pinned 1.0.1 package is a black-box comparison control; runtime source is not
used to implement VPM. `probe.cjs` checks 8,014 generated and edge inputs and 16
CSS declaration sets through unchanged css-to-react-native 3.2.0. Its isolated
caller copy resolves camelize to VPM and asserts the replacement was called.
The converter remains a dependency of current styled-components 6.6.0 and the
app's 6.1.17 at VentiMath main `7970b7e5`.

Run `node --test packages/vcamelize/test/*.test.cjs`, the same tests with Bun,
`node scripts/camelize-conformance/probe.cjs` and the same probe with Bun.
`types.cjs` verifies NodeNext/Bundler declarations. `archives.cjs` verifies exact
packed exports, declarations, tests and unchanged callers after fresh and frozen
npm/Bun installs. Upstream and caller controls remain test-only dependencies.

Run `packages/vcamelize/bench/compare.cjs` on Node and Bun sequentially after
checks complete. [Measurements](../../packages/vcamelize/bench/results/README.md).
