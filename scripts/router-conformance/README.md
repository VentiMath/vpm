# Router conformance fixture

Runs router **2.2.0**'s upstream Mocha suite against `vrouter`. The seven test
files and their support helper are vendored unmodified in
[`packages/vrouter/test/fixtures/upstream`](../../packages/vrouter/test/fixtures/upstream),
with SHA-256 hashes in the package's [provenance](../../packages/vrouter/PROVENANCE.json).

```sh
npm --prefix scripts/router-conformance ci --ignore-scripts
node scripts/router-conformance/run.cjs
bun scripts/router-conformance/run.cjs
node scripts/router-conformance/run.cjs --upstream
bun scripts/router-conformance/run.cjs --all-runtime-tests
```

The runner verifies each fixture hash, copies the tests into a temporary
checkout and redirects only the `require('..')` entry to vrouter (`--upstream`
uses the original router instead). Assertions are unchanged. All **694 tests**
pass on Node. On Bun, one test is pending: Bun's HTTP server answers its raw
`OPTIONS *` request with 400 before any handler runs, for router and vrouter
alike. `--all-runtime-tests` runs it anyway.

The npm dependencies are router's declared test tools (Mocha 10.2.0, Supertest
6.3.3, run-series, finalhandler) plus router 2.2.0 for `--upstream`. They are
test infrastructure, outside the workspace and every runtime archive.
