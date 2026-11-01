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
Testing Library 13.0.0-alpha.5, Enzyme 3.11.0, React 18 (the lockfile's
`react18`, `react18-dom` and `react18-test-renderer` aliases of
18.0.0-rc.0-next-aa8f2bdbc-20211215, installed without enforcing peers as Yarn
does), @types/react 18.3.12, and the packages the tests
import besides the ones under test: @emotion/css 11.13.5, @emotion/server
11.11.0, @emotion/css-prettifier 1.2.0, @emotion/jest 11.13.0 and
@emotion/babel-plugin 11.13.5, @types/react 19.2.14 (as `types-react-19`),
and stylis-plugin-rtl 2.1.1 (with cssjanus
2.3.0, overridden to the version VentiMath installs) for VentiMath's cache
configuration.

```sh
npm --prefix scripts/emotion-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/emotion-conformance/run.cjs --upstream
node scripts/emotion-conformance/run.cjs
node scripts/emotion-conformance/run.cjs --upstream --mode=production
node scripts/emotion-conformance/run.cjs --mode=production
node scripts/emotion-conformance/run.cjs --upstream --react=18
node scripts/emotion-conformance/run.cjs --react=18
node scripts/emotion-conformance/regressions.cjs
node scripts/emotion-conformance/compare-serialize.cjs
node scripts/emotion-conformance/compare-cache.cjs
node scripts/emotion-conformance/types.cjs
```

Repeat the regressions and the comparisons with Bun; Jest runs on Node.

`run.cjs` runs the suite the way upstream's `test:dist` does, against built
packages (`jest.dist.js`), with upstream's Babel configuration (its Emotion
Babel plugin for `*.test.js` files). `--mode=development` uses `jest.config.js`,
which resolves the packages' development builds; `--mode=production` uses
`jest.prod.js` and runs the tests gated to production builds. `--react=18`
adds upstream's `test:react18` configuration (`jest-react18.config.js`), which
maps React, React DOM and the test renderer to React 18. Without
`--upstream`, every Emotion package VPM provides replaces the original for
every importer (the tests, the remaining originals, @emotion/css and
@emotion/server); `--vpm=hash,memoize` selects some. One test file,
`get-label-from-stack-trace.js`, imports a module from upstream's sources
that no package publishes, and is not run.

In development, 285 tests pass and 8 are gated to production; in production, 5
pass; under React 18, 288 pass (311 snapshots). The same holds with VPM's packages: currently vemotion-hash,
vemotion-memoize, vemotion-unitless, vemotion-weak-memoize, vemotion-sheet,
vemotion-utils, vemotion-serialize, vemotion-is-prop-valid,
vemotion-use-insertion-effect-with-fallbacks, vemotion-cache, vemotion-react
and vemotion-styled: all twelve, so no original Emotion package runs (the
companion packages @emotion/css and @emotion/server run on VPM's too). 305 and 11 snapshots
match.

`compare-serialize.cjs` runs 20,000 generated style arguments (objects with
nested selectors and at-rules, fallback arrays, numbers, booleans, null, custom
properties and vendor keys; arrays; template literals; functions of props;
serialized styles; keyframes; labels; registered class names) through
@emotion/serialize and vemotion-serialize, in the production build and with the
`development` condition, and requires the same name, styles, keyframes,
messages and errors. The inputs leave out what VPM changes (below). There are
no differences.

`compare-cache.cjs` inserts 10,000 generated styles (nesting, selectors
starting with `:`, `&`, commas, at-rules, keyframes, placeholders, labels,
comments, `@import`, unsafe pseudo-classes, vendor and directional properties)
into @emotion/cache and vemotion-cache on the server, where `insert` returns
the CSS, as a class and as global styles, in regular and compat mode, with no
plugins, the default prefixer, and VentiMath's two configurations from its
`RootThemeProvider` (its `wrapInLayer('mui')` plugin, after stylis-plugin-rtl
for right-to-left). The original runs on stylis 4.4.0 (from the stylis
fixture), the version vemotion-cache uses, and stylis-plugin-rtl on stylis
4.4.0 beside it and on vstylis beside VPM. The CSS, inserted state and messages
must be the same in production and development; the declarations whose
prefixes VPM changes are left out (see below). There are no differences.

`hook-order.cjs` (run by `regressions.cjs`) renders a styled component whose
`theme` prop comes and goes, with React 16.14 and react-test-renderer, from a
tree linking VPM's packages beside the fixture's React (Node's
`--preserve-symlinks`), and collects what React reports.

`types.cjs` compiles an application using each VPM package's API (subclassing
`StyleSheet` as MUI does, the cache and style types, VentiMath's cache plugin,
and a TSX component using the `css` prop through `jsxImportSource`, `Global`,
`ClassNames`, theming and `keyframes`, and a TSX component using styled
shorthands, `shouldForwardProp`, styled components and `withComponent`, each
with two expected type errors) against
the originals' and VPM's declarations with DOM types and React 18.3 and 19
types (`@types/react` 18.3.12, the lockfile's, and 19.2.14), under TypeScript
7.1, 5.8 and 5.9.

`regressions.cjs` reproduces each change with the originals: two styles
differing by characters whose UTF-16 code units share a low byte get the same
class name, `gridArea` and `lineClamp` numbers are serialized with `px`,
`undefined` results are recomputed by memoize, unitless properties written in
kebab-case are serialized with `px`, `width: [100, '50%']` becomes a selector
block, styled elements drop current HTML attributes such as `commandFor` and
`shadowRootMode`, the cache's prefixer invents declarations
(`-webkit-box-flex-wrap`) and writes `-ms-flex-item-align:flex-start` and
`justify-content: space-between` without `-ms-flex-pack`, a styled component
whose `theme` prop comes and goes changes the order of its hooks, and @emotion/utils's
declarations, installed with only its declared dependencies, fail to compile
because they import the undeclared `@emotion/sheet`.
