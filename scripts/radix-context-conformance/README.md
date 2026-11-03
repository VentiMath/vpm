# Radix context conformance

Pins current **@radix-ui/react-context 1.3.0** and the app's **1.1.2** baseline,
with React 19.2.4 and unchanged ToggleGroup 1.1.11. The current source hashes are
verified against [provenance](../../packages/vradix-react-context/PROVENANCE.json).

`run.cjs` checks default/null/optional reads, missing-provider errors, memoized
updates, scope isolation and overrides. Paired controls reproduce upstream's
stale keys when field names change but values remain equal, and unstable composed
scope identity. VPM also changes field counts without React dependency warnings.
An isolated evaluator substitutes only the context import throughout unchanged
Radix caller modules; ToggleGroup selection and hydration must behave identically.

`archives.cjs` verifies clean npm/Bun installs, CJS/ESM identity, SSR, TypeScript 7
NodeNext/Bundler with DOM types and no Node ambient declarations, and browser
bundling. React versions before 19 are outside the tested peer contract.

```sh
npm --prefix scripts/radix-context-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-react-context/test/*.test.cjs
bun test packages/vradix-react-context/test
node scripts/radix-context-conformance/archives.cjs
```

[Measurements](../../packages/vradix-react-context/bench/results/README.md) use
fresh isolated processes, balanced order and identical-code controls. Development
SSR and factory construction are measured, not browser rendering or app speed.

`direction.cjs` separately checks **@radix-ui/react-direction 1.2.0** against
`vradix-react-direction`: provider aliases, defaults, nesting, explicit overrides,
updates and hydration, then unchanged RovingFocus LTR/RTL ArrowRight behavior.
`direction-archives.cjs` checks clean mixed-module consumers and declarations.
Only the direction import is substituted in that caller; no upstream assertions
or runtime files are patched.
