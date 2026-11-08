# CSSJanus comparison and RTL caller checks

Pinned controls: cssjanus 2.3.1 (current), cssjanus 2.3.0 (app), stylis-plugin-rtl 2.1.1 and Stylis 4.3.6. The independently written VPM Stylis 4.4.0 is a second parser control.

`upstream/data.json` is the unchanged 210-case public test dataset from cssjanus commit `05cc64b593e893d2c6f9a651834a48968ffd896d`. Its Apache 2.0 license, notice and SHA-256 hashes are retained beside it. No upstream runtime is copied into vcssjanus. The six new 2.3.1 background-function cases are omitted only for the 2.3.0 baseline.

`run.cjs` validates those cases/roundtrips, 3,000 seeded differential cases against both versions and 36 unchanged wrapper/layer pipelines. Two RTL pipelines have an explicitly asserted intentional difference: quoted CSS content stays literal, while upstream corrupts it. `load.cjs` substitutes only the CSSJanus dependency in the installed wrapper and reproduces VentiMath's middleware order and layer callback. The private callsite's path/commit/hash is recorded in package provenance; private source is not vendored.

`browser.cjs` checks computed CSS in native Chrome, including eight LTR/RTL snapshots across both Stylis implementations, literal content, logical-property cascade, multiple background layers and shadow offsets. It uses synthetic DOM, without live accounts, saved theme changes or application writes.

```sh
npm --prefix scripts/cssjanus-conformance ci --ignore-scripts
node scripts/cssjanus-conformance/run.cjs
bun scripts/cssjanus-conformance/run.cjs
node scripts/cssjanus-conformance/archives.cjs
```

The archive gate checks every packed file against source, fresh/frozen npm and Bun installs, Node/Bun contracts, CJS/ESM identity, TypeScript 7 NodeNext/Bundler declarations without ambient platform types, and Chrome. Tests and comparison dependencies are excluded from shipping archives.
