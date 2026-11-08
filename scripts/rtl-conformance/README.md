# RTL middleware conformance

Controls: stylis-plugin-rtl 2.1.1 (current and app), cssjanus 2.3.1/2.3.0, Stylis 4.3.6 and independently implemented VPM Stylis 4.4.0.

The nine public upstream tests from commit `6c590ec0409177048004683319d1330542c37dbf` are retained unchanged under `upstream/`, with their MIT license and hashes. `build.cjs` removes only the imports and TypeScript annotations so `run.cjs` can supply either engine/plugin and compare the original snapshot strings. No upstream runtime is copied into the package.

`run.cjs` also checks 4,800 seeded combinations across both engine implementations and both CSSJanus versions. In 1,600 RTL+layer cases, the original wrapper leaves the known `.nested{margin-left:3px}` fixture unchanged after the app mutates its parent to a layer. The test asserts that negative control explicitly and expects VPM's corrected right margin. Other expected output is unchanged.

`pipeline.cjs` reproduces the `RootThemeProvider` middleware order/layer mutation with synthetic CSS. Private callsite path/commit/hash is recorded in package provenance. Chrome checks eight LTR/RTL snapshots, inherited CSSJanus corrections, the nested-layer negative control and modern native layers. No live app accounts, settings or data are used.

```sh
npm --prefix scripts/rtl-conformance ci --ignore-scripts
bun scripts/rtl-conformance/build.cjs
node scripts/rtl-conformance/run.cjs
bun scripts/rtl-conformance/run.cjs
node scripts/rtl-conformance/archives.cjs
```

The archive gate verifies packed bytes, fresh/frozen npm and Bun installs with the exact CSSJanus foundation, Node/Bun runtime contracts, CJS/ESM identity, TypeScript 7 NodeNext/Bundler consumers and Chrome. Source-only tests/benchmarks are excluded from the package.
