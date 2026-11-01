# Emotion conformance

Baseline: **Emotion 11.14**: @emotion/react 11.14.0, @emotion/styled 11.14.1,
@emotion/cache 11.14.0, @emotion/serialize 1.3.3, @emotion/sheet 1.4.0,
@emotion/utils 1.4.2, @emotion/hash 0.9.2, @emotion/memoize 0.9.0,
@emotion/unitless 0.10.0, @emotion/weak-memoize 0.4.0,
@emotion/is-prop-valid 1.4.0 and @emotion/use-insertion-effect-with-fallbacks
1.2.0, the latest releases checked November 1, 2026. From the
`@emotion/styled@11.14.1` tag (commit
`49229553967b6050c92d9602eb577bdc48167e91`), `upstream/` retains the tests of
hash, weak-memoize, sheet, cache, react and styled (with their snapshots), the
repository's Jest configurations (`jest.config.js`, `jest.dist.js`,
`jest.prod.js`), Babel configuration, `test-utils` and
`babel-preset-emotion-dev` packages, and the license. Files carry a `.txt`
suffix and are verified against `SHA256.json` before use.

The fixture pins the originals and the test tools at the versions in the
repository's lockfile: Jest 29.7.0 with jsdom, Babel 7.18.9 (presets and
plugins at the lockfile's versions; `babel-preset-current-node-syntax` 1.0.1 and
`cheerio` 1.0.0-rc.3 are overridden to the lockfile's, as later releases need a
newer Babel and `TextDecoder`), React 16.14.0, react-test-renderer 16.8.6,
Testing Library 13.0.0-alpha.5, Enzyme 3.11.0, and the packages the tests
import besides the ones under test: @emotion/css 11.13.5, @emotion/server
11.11.0, @emotion/css-prettifier 1.2.0, @emotion/jest 11.13.0 and
@emotion/babel-plugin 11.13.5.

```sh
npm --prefix scripts/emotion-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/emotion-conformance/run.cjs --upstream
node scripts/emotion-conformance/run.cjs
node scripts/emotion-conformance/run.cjs --upstream --mode=production
node scripts/emotion-conformance/run.cjs --mode=production
node scripts/emotion-conformance/regressions.cjs
node scripts/emotion-conformance/compare-serialize.cjs
node scripts/emotion-conformance/types.cjs
```

Repeat the regressions and the serialize comparison with Bun; Jest runs on Node.

`run.cjs` runs the suite the way upstream's `test:dist` does, against built
packages (`jest.dist.js`), with upstream's Babel configuration (its Emotion
Babel plugin for `*.test.js` files). `--mode=development` uses `jest.config.js`,
which resolves the packages' development builds; `--mode=production` uses
`jest.prod.js` and runs the tests gated to production builds. Without
`--upstream`, every Emotion package VPM provides replaces the original for
every importer (the tests, the remaining originals, @emotion/css and
@emotion/server); `--vpm=hash,memoize` selects some. One test file,
`get-label-from-stack-trace.js`, imports a module from upstream's sources
that no package publishes, and is not run.

In development, 285 tests pass and 8 are gated to production; in production, 5
pass. The same holds with VPM's packages: currently vemotion-hash,
vemotion-memoize, vemotion-unitless, vemotion-weak-memoize, vemotion-sheet,
vemotion-utils and vemotion-serialize, with the original packages above them. 305 and 11 snapshots
match.

`compare-serialize.cjs` runs 20,000 generated style arguments (objects with
nested selectors and at-rules, fallback arrays, numbers, booleans, null, custom
properties and vendor keys; arrays; template literals; functions of props;
serialized styles; keyframes; labels; registered class names) through
@emotion/serialize and vemotion-serialize, in the production build and with the
`development` condition, and requires the same name, styles, keyframes,
messages and errors. The inputs leave out what VPM changes (below). There are
no differences.

`types.cjs` compiles an application using each VPM package's API (subclassing
`StyleSheet` as MUI does, the cache and serialized style types) against the
originals' and VPM's declarations with DOM types, under TypeScript 7.1, 5.8 and
5.9.

`regressions.cjs` reproduces each change with the originals: two styles
differing by characters whose UTF-16 code units share a low byte get the same
class name, `gridArea` and `lineClamp` numbers are serialized with `px`,
`undefined` results are recomputed by memoize, unitless properties written in
kebab-case are serialized with `px`, `width: [100, '50%']` becomes a selector
block, and @emotion/utils's
declarations, installed with only its declared dependencies, fail to compile
because they import the undeclared `@emotion/sheet`.
