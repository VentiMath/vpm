# Shallow-equal verification

The retained MIT test source is pinned to shallow-equal 3.1.0 commit
`782329b14436c306490c94cb46544b626d23673a` and hash checked before execution.
`run.cjs` removes the implementation imports and compiles TypeScript syntax with
esbuild; all 31 original cases and assertions run with the supplied implementation
and a small describe/it/expect adapter, on Node 24 and Bun.

```sh
npm --prefix scripts/shallow-equal-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/shallow-equal-conformance/run.cjs --upstream
node scripts/shallow-equal-conformance/run.cjs
node scripts/shallow-equal-conformance/callers.cjs
node scripts/shallow-equal-conformance/archives.cjs
```

Repeat runtime comparisons with Bun. Five focused package tests cover strict
values, sparse indices, own keys, inherited accessors and invalid input kinds.
`callers.cjs` runs the actual React Autosuggest 10.1.0 lifecycle methods through
six suggestion transitions, plus its SSR output, with legacy 1.2.1/current
3.1.0/VPM comparisons intercepted and counted. React 19.1.0 stays unchanged.
Lifecycle instances are driven directly; this is not a full mounted interaction
suite or an application adoption claim.

Packed npm/Bun consumers verify every supported CJS/ESM import, legacy subpaths,
browser bundling and strict TypeScript 7 declarations without ambient Node types.
