# Tabbable conformance

The fixture pins tabbable 6.5.1 and Floating UI React 0.27.20. Upstream tests and
HTML are retained at the package's published commit
[c31b0b8](https://github.com/focus-trap/tabbable/tree/c31b0b8850c7bc720b4d1d397453ce96a552d9db).
[The manifest](upstream/provenance.json) verifies every retained file's SHA-256.
jsdom 26.1.0 matches that upstream test environment.

```sh
npm --prefix scripts/tabbable-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/tabbable-conformance/run.cjs
bun scripts/tabbable-conformance/run.cjs
node --test packages/vtabbable/test/*.test.cjs
bun test packages/vtabbable/test
node scripts/tabbable-conformance/browser.cjs
node scripts/tabbable-conformance/archives.cjs
```

`run.cjs` runs ten original unit tests unchanged against original and VPM modules.
The adapter substitutes the import and HTML loader; `jest` maps to Vitest's
compatible mock API. Six additional probes retain original failures as explicit
controls: quoted radio names without CSS.escape, external form-associated radios,
inert shadow ancestors and nested disabled legends. They also verify that radio
state refreshes between calls and Floating UI's actual focus manager uses the
selected implementation, focuses its first control and restores trigger focus.

The Chrome runner tests 18 retained HTML fixtures over five display modes, three
shadow-root policies, both root-inclusion modes and both list APIs: 1,080
comparisons. The original `shadow-dom-query` fixture has inert-shadow errors;
its excluded nodes are explicitly counted and individually checked against
native focus rejection. Six additional browser checks cover external radio
ownership, inert shadow roots/slots/attribute presence, nested-legend native focus
and iframe realms. Set `CHROME_BIN` if Chrome is not at a standard location.
This does not claim execution of the complete upstream Cypress suite.

The archive check installs the packed 6.5.1 package in clean npm/Bun consumers,
checks CJS/ESM on Node 24/Bun, bundles for browsers and compiles DOM-only TypeScript
7 consumers. No fixture dependencies ship in the package.

[Benchmark methodology and samples](../../packages/vtabbable/bench/results/README.md)
use process isolation and the same fixed visible-style provider on both runtimes.
Repeated jsdom 26 computed-style workloads stalled on Bun with both upstream and
VPM; the model excludes that engine and measures DOM traversal/ordering. Chrome
still checks actual style behavior. These are not browser rendering benchmarks.
