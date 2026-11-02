# Callback-ref comparison fixture

Pins **use-callback-ref 1.3.3**, React/React DOM 19.1.0 and react-remove-scroll
2.7.2. The retained source and both test files come from release commit
`bd99fd56601f693ecdda88e2d4455cfa03c5689d`; hashes and the original MIT license are
retained. Runtime and declarations in VPM are independently authored.

`run.cjs` verifies all hashes, redirects the original `../src` imports, supplies
Vitest's compatible `vi` as `jest`, and runs all **22 original tests** with their
assertions unchanged. Four additional groups compare falsy defaults, mutated ref
arrays, cleanup after a throwing callback and actual scroll-lock UI ref wiring.
The first three reproduce original behavior alongside the VPM corrections. Both
variants pass all **26 cases** on Node 24 and Bun. Temporary fixture directories
and ignored React peer symlinks are test scaffolding only.

The caller is unchanged react-remove-scroll UI code bundled against the selected
ref library. Its scrolling sidecar is disabled: these checks cover forwarded refs
and unmounting, not scroll containment or touch gestures. Callback-returned cleanup
functions remain outside the baseline object-ref adapter contract.

`archives.cjs` installs the packed package using npm and Bun, checks CJS/ESM
identity and SSR on both runtimes, evaluates a standalone browser bundle and
compiles positive/negative JSX consumers with TypeScript 7 in NodeNext and bundler
modes. Test tools and tslib are not shipped dependencies.

```sh
npm --prefix scripts/callback-ref-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/callback-ref-conformance/run.cjs
bun scripts/callback-ref-conformance/run.cjs
node scripts/callback-ref-conformance/archives.cjs
node packages/vuse-callback-ref/bench/compare.cjs
bun packages/vuse-callback-ref/bench/compare.cjs
```
