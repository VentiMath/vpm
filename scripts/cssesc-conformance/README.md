# CSS escaping conformance

Controls are cssesc 3.0.0, current postcss-selector-parser 7.2.1 and the app's
6.0.10. `probe.cjs` compares documented options and seeded UTF-16 strings, then
substitutes the independent escape function into unchanged parser modules for
class, namespace and quoted-attribute mutation and round trips. The two corrected
identifier cases have explicit expectations rather than suppressed failures.

`browser.cjs` verifies real Chrome identifier selection and CSS string parsing.
`archives.cjs` tests exact CJS/ESM exports, fresh/frozen npm/Bun consumers, strict
TS7 declarations and runtime/caller/browser behavior. Everything uses synthetic
CSS and local test pages. No app dependency or production-data changes.

Run `npm ci --prefix scripts/cssesc-conformance --ignore-scripts`, then the
package's Node/Bun tests, `probe.cjs`, `types.cjs`, `browser.cjs` and `archives.cjs`.
The benchmark uses isolated processes and retains all samples and control pairs.
