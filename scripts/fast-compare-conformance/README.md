# React-aware comparison fixtures

Pinned baseline react-fast-compare3.2.2, commit
`c306521de14d24169077ae1859be373ff21a8818`. Original Node suites, data and license
are retained verbatim with SHA-256 verification. Generic/ES6 datasets use the
already retained fast-deep-equal3.1.3 fixtures. Only implementation/dependency
resolution changes. Upstream:117passing; VPM:116passing. The explicitly excluded
assertion expects a console warning on cycles; VPM instead compares cycles safely.
No other original assertions are changed.

```sh
npm --prefix scripts/fast-compare-conformance ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund
node scripts/fast-compare-conformance/run.cjs --upstream
node scripts/fast-compare-conformance/run.cjs
node scripts/fast-compare-conformance/callers.cjs
node --test packages/vreact-fast-compare/test/*.test.cjs
node scripts/fast-compare-conformance/archives.cjs
```

Repeat runtime tests with Bun. React18/Preact exercise unchanged upstream tests;
React19.1 exercises the app's react-popper2.3.0 hook. Its comparator is substituted
and instrumented in isolated workers; a controlled Popper instance checks option
updates and cleanup, not layout geometry. React aliases require legacy peer
resolution only in this test fixture, not in the dependency-free package.

Focused tests compare3000 generated props, binary views, deep/cyclic graphs and
application errors. The upstream DataView hang runs only in a subprocess with a
750ms timeout. Packed npm/Bun consumers check CJS/ESM, a browser bundle and TS7
without ambient platform types.
