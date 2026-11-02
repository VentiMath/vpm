# Sidecar comparison fixture

Pins use-sidecar 1.1.3, React/React DOM 19.1.0 and react-remove-scroll 2.7.2.
The official npm latest tag, source commit and integrity were verified November 2,
2026. Three original test files come from release commit
`0ceffd96208b62a66883fd472fa48a2ccd4acaa8`; byte hashes and the MIT license are
retained. VPM's runtime and declarations are independently authored.

`run.cjs` verifies source hashes and runs all **14 original tests**, unchanged
apart from import destinations and framework plumbing. A small React 19 mount
adapter implements only the original Enzyme operations (`html`, `update`,
`setProps`); both variants use the same adapter. Vitest's `vi` supplies the Jest
mock API. Native `createRequire` wrappers make tests and each implementation
share the exact same CJS environment object and React instance. Root StrictMode
coverage asserts that two loading attempts actually execute.

Fourteen additional groups cover registration cleanup, middleware, batching,
superseded/unmounted imports, cache isolation, fallback/error reporting,
StrictMode, render-prop publication and actual nested scroll locks. Original
behavior is asserted explicitly where VPM deliberately corrects it. Both variants
pass all **28 cases** on Node 24 and Bun. The bundled react-remove-scroll caller
retains its original implementation, replacing only use-sidecar. jsdom tests
cover activation/cleanup and lock counts, not browser gesture containment.

`errors.cjs` uses fresh native React processes for synchronous importer throws,
null exports and missing media. It observes original uncaught/unhandled failures
and requires VPM to report each through state and configuration without an
unhandled event. These controls are isolated from Vitest rather than suppressing
its global unhandled-error checks.

`archives.cjs` installs the archive using npm and Bun, checks CJS/ESM identity and
SSR on Node/Bun, evaluates a standalone browser bundle without process shims or
upstream helpers, and compiles positive/negative TypeScript 7 consumers in
NodeNext and bundler modes. Test dependencies never ship in the package.

```sh
npm --prefix scripts/sidecar-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/sidecar-conformance/run.cjs
bun scripts/sidecar-conformance/run.cjs
node scripts/sidecar-conformance/errors.cjs
bun scripts/sidecar-conformance/errors.cjs
node scripts/sidecar-conformance/archives.cjs
node packages/vuse-sidecar/bench/compare.cjs
bun packages/vuse-sidecar/bench/compare.cjs
```
