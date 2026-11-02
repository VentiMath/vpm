# External-store verification

Pinned controls: `use-sync-external-store` 1.7.0 (current) and 1.6.0 (app lock).
React/React DOM 19.1.0 and React Redux 9.2.0 match the actual caller generation.

```sh
npm --prefix scripts/external-store-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/external-store-conformance/run.cjs
bun scripts/external-store-conformance/run.cjs
node scripts/external-store-conformance/archives.cjs
node --test packages/vuse-sync-external-store/test/*.cjs
```

Each runtime executes 12 application-facing cases in separate processes for the
three implementations. React Redux imports are redirected to the package under
test; React itself stays the same single installed copy. Tests cover native
identity, Object.is, stable selector caching, equality bailouts, updated closures,
subscription changes, error boundaries, server snapshots/hydration, missing SSR
snapshots, StrictMode and interrupted concurrent renders.

`upstream/` preserves React's shared/native test sources at commit
`1d34f91dfde6bba84d08b683aaba164c7194dacb`, with hashes and license. They informed
the contracts. They are **not** claimed as executed unchanged: they require
React's private source-build scheduler, test utilities and legacy-React gates.
The public-runtime comparisons above are the executed evidence.

Packed consumers verify every advertised import subpath, both module systems,
native identity, browser bundling and TypeScript 7 inference. No React 16–18
compatibility, full React test-suite conformance or application deployment is
claimed.
