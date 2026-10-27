# Upstream type comparison fixture

This private, separately locked test project supplies the unchanged baselines
used to verify `vnode-types` and `vundici-types`. Its packages are test-only
development dependencies. This directory is outside the root `packages/*`
workspace and is not included in VPM package archives.

| Package | Why it is installed here |
| --- | --- |
| `@types/node` 22.20.5 | Original Node declarations used for API-coverage and compiler-graph comparisons. |
| `undici-types` 6.21.0 | Original declarations used to reproduce the Fetch signature gaps corrected by VPM. |
| `undici` 6.21.3 | Actual JavaScript runtime used to check that the corrected Fetch signatures describe working behavior. |

These versions are pinned to the recorded comparison baselines. Replacing them
with VPM packages would compare VPM against itself and remove the evidence that
the original declarations have the reported gaps. Updating a baseline requires
reviewing the corresponding provenance, regression checks and measurements.
`vundici-types` contains declarations, so it cannot replace the runtime `undici`
used by these tests.

VPM's ordinary development compiler uses TypeScript 7 with `vnode-types` and
`vundici-types`. [`check-platform-types.cjs`](../check-platform-types.cjs)
explicitly checks that upstream Node/Undici declarations are absent from the VPM
compiler graph. [`check-public-types.cjs`](../check-public-types.cjs) separately
checks that runtime-package declarations need no ambient Node, Undici or DOM
types. [`check-type-archives.cjs`](../check-type-archives.cjs) verifies that
installed VPM type archives work without upstream declarations.

From the repository root, the comparison gate is:

```sh
npm --prefix scripts/type-consumers ci --ignore-scripts
node scripts/sync-types.cjs --check
npm run test:types
```

The first command installs these test dependencies here, without adding them to
the workspace. The synchronization check verifies source provenance and recorded
patches; it does not switch the development compiler back to upstream types.
