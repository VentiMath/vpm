# CSS source-map comparisons

PostCSS 8.5.8 generates inline and external maps, composes a second stylesheet transform, and traces a diagnostic to its original file. CSS Tree 3.2.1 generates a map while reusing its input coordinates. The fixture installs the same callers in isolated directories and resolves their source-map dependency to VPM or each pinned upstream control. It compares CSS, source-map JSON, and diagnostic coordinates.

Run `npm ci --prefix scripts/source-map-conformance --ignore-scripts` before running `node scripts/source-map-conformance/caller.cjs`, `bun scripts/source-map-conformance/caller.cjs`, and `node scripts/source-map-conformance/archives.cjs`. The package tests also compare generation and 5,412 original-position queries over 256 mappings, including unmapped ranges, empty text, named mappings and both lookup biases.

## Position tracing

`node trace-caller.cjs` runs the unmodified Babel generator, gen-mapping and
remapping against both the control and VPM. It compares generated code, original
names, source content and positions after chaining two maps. Run
`node trace-archives.cjs` to repeat with fresh and frozen npm and Bun
installs of all three VPM archives. The fixture pins the local dependency
archives with overrides so it can run offline before a consumer release.

For the upstream flat-map suite, pass the path to
`packages/trace-mapping/test/trace-mapping.test.ts` from the
`trace-mapping/0.3.31` tag to `node trace-upstream.cjs` or
`bun trace-upstream.cjs`.

The generator check repeats the same Babel and remapping calls with
`vgen-mapping` substituted as well. Encoded, decoded and raw mappings are
compared with upstream controls. The archive check installs all four VPM
packages offline. The public writer suite runs with
`node trace-upstream.cjs /path/to/gen-mapping.test.ts` (or Bun) using the
`gen-mapping/0.3.13` tag.

The complete-stack comparison also runs Babel core 7.29.0’s unchanged merge-map module with all five VPM packages installed from archives. It checks the merged source root and emitted map against the pinned upstream stack.
The upstream public composition tests run with `node trace-upstream.cjs /path/to/remapping.test.ts` or Bun, using the `remapping/2.3.5` tag with its sibling `samples` directory. Four concatenation, Rollup and minification fixture maps are compared byte for byte.

The converter fixture copies Babel core into an isolated module tree and switches only the converter between runs. Run `node convert-caller.cjs` or `bun convert-caller.cjs`; `trace-archives.cjs` repeats both calls from fresh and frozen installs.

The jsesc fixture runs Babel generator 7.29.1 in isolated processes against both literal printers, reparses the generated JavaScript, and compares generated code and maps. Run `node jsesc-caller.cjs` or `bun jsesc-caller.cjs`. The archive check repeats the comparison with the packed package.

### Babel identifier checks

Run `node identifier-caller.cjs` or `bun identifier-caller.cjs` to exercise Babel Types against the app and current controls and the VPM candidate. The archive checks repeat this with clean consumer installs. To regenerate the identifier tables, download the [Unicode 17.0.0 core properties](https://www.unicode.org/Public/17.0.0/ucd/DerivedCoreProperties.txt) and pass the local filename to `node build-identifier-tables.cjs`. The generator verifies the SHA-256 digest.

The string-parser fixture runs unchanged Babel Types 7.29.0, 7.29.7 and 7.29.15 template builders with their respective control and the VPM helper. The archive checks repeat these comparisons after npm and Bun installs.

The gensync fixture runs Babel Core 7.29.0 against each runner in a fresh process. It compares config discovery, sync/async/callback JSX and source-map output, async plugin handling and file errors. The published gensync test suite runs with `bun test scripts/source-map-conformance/gensync-upstream.test.cjs`.

Run `node scripts/source-map-conformance/tokens-caller.cjs` or its Bun equivalent for highlighted Babel errors in JSX and TypeScript. The fixture loads each unchanged code-frame with its tokenizer resolved to the selected implementation. To run the original 694 tokenizer cases, pass a checkout of js-tokens v4.0.0 to `node scripts/source-map-conformance/tokens-upstream.cjs`.

Run `node scripts/source-map-conformance/code-frame-caller.cjs` on Node or Bun to exercise Babel with the complete VPM formatter and its dependency closure. `code-frame-upstream.cjs` accepts the original Babel v7.29.7 test/index.js file. The package tests additionally cover colored tab alignment and differing middle-line widths in source ranges.

Run `node scripts/source-map-conformance/option-caller.cjs` or its Bun equivalent for Babel’s target validation and build diagnostics with the VPM validator. Both compilation-targets 7.28.6 and 7.29.13 run unchanged. `option-upstream.cjs` accepts Babel v7.29.7’s validator.spec.js and find-suggestion.spec.js files.

## Semantic versions

`node semver-caller.cjs` and `bun semver-caller.cjs` stage unchanged Babel Core
and current/app compilation-targets with semver 6.3.2, 7.5.4, 7.8.6 or vsemver.
They compare target resolution, transforms, plugin version gates and helper
availability. The archive gate repeats these checks from fresh npm and Bun
installs and compiles CommonJS/ESM consumers.

For the installed app’s additional callers:

```sh
VPM_APP_CHECKOUT=/path/to/ventimath-private node scripts/source-map-conformance/semver-app.cjs
```

This executes the unchanged Capacitor version-warning function with stubbed
version lookups and the three jsonwebtoken runtime gates. It changes no app data.

## Bounded LRU caches

`node lru-callers.cjs` and the Bun equivalent execute unchanged Babel target
resolution, CSS declarations, DOM selector queries and path resolution with only
the LRU import substituted. The fixture asserts that get/set actually run.
Current count/size/TTL behavior is compared in 64,000 generated operations and
controlled-clock tests. `lru-archives.cjs` repeats caller checks from clean npm
and Bun installs and compiles both module formats without Node/DOM ambient types.
The runtime has no upstream dependency.
