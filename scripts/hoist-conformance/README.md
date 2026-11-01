# Hoist statics conformance

The baseline is **hoist-non-react-statics 3.3.2**, published commit
`1b5fb0b06856f196544ff2dda54c9a15e451522e`. Its original 12 tests and BSD-3-Clause
license are retained with SHA-256 hashes. The runner changes only the target
import and transpiles JSX/module syntax; assertions are unchanged. React 19.1.0,
create-react-class, PropTypes and all comparison tools are fixture-only.

```sh
npm --prefix scripts/hoist-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/hoist-conformance/run.cjs
bun scripts/hoist-conformance/run.cjs
node --test packages/vhoist-non-react-statics/test/hoist.test.cjs
bun test packages/vhoist-non-react-statics/test/hoist.test.cjs
node scripts/hoist-conformance/callers.cjs --upstream
node scripts/hoist-conformance/callers.cjs
bun scripts/hoist-conformance/callers.cjs --upstream
bun scripts/hoist-conformance/callers.cjs
node scripts/hoist-conformance/archives.cjs
```

Seven focused groups compare descriptors, symbols, memo/forward-ref wrappers,
blacklists, prototype-named statics, inherited nonconfigurable properties,
classification getters and deep/cyclic prototype chains. Node reproduces the
original overflow at depth 12,000; Bun does not, which the test records explicitly.
The caller substitutes only the hoisting dependency beneath actual Emotion
`withTheme` and checks SSR plus custom static descriptors. It does not change the
application or replace Emotion's existing VPM helper in this work.

Archive checks install packed packages with npm and Bun, verify module identity,
build/run a browser bundle, and compile TypeScript 7 consumers in NodeNext and
bundler modes without ambient platform types. There is no DOM behavior here.

Benchmarks use one implementation per process, four balanced comparison pairs,
two identical-source controls and all retained samples. Cases cover function and
memo wrappers, an eight-level hierarchy and descriptors/blacklists. They measure
static hoisting, not application rendering.
