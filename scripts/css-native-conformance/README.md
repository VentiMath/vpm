# CSS value and native conversion verification

Pinned controls: postcss-value-parser 4.2.0, css-to-react-native 3.2.0 and styled-components 6.1.17. Runtime implementations live in `packages/`; nothing from an upstream implementation is included there. The two `upstream-*` directories contain only tests, licensing and package metadata. `upstream-tests.json` records immutable revisions and file hashes.

- `parser.cjs`: 171 assertions from unchanged upstream test files (a minimal tape adapter), then 3,000 deterministic valid/malformed input checks. Recovery differences are explicit: clamp upstream out-of-bounds offsets, normalize adjacent slash whitespace ownership, and exclude overlapping `/*/` from token parity while still requiring exact source round-trip.
- `converter.cjs`: 269 unchanged upstream tests / 317 assertions; only import bindings and a small Jest assertion/spy adapter change.
- `differential.cjs`: 1,774 equal results/rejections, plus 34 explicitly classified differences in the matrix. Named colors, comment handling, `transform:none`, explicit relative shadow offsets, and stricter rejection of discarded/mixed tokens are documented in the package README.
- `caller.cjs`: unchanged styled-components native entry, real React server render, three style objects. The React Native View/StyleSheet boundary is stubbed. This proves converter integration, not a native device UI or VentiMath production usage.
- Package tests cover deep values, mutations, independent outputs, malformed input and own-property behavior. `types.cjs` checks strict NodeNext/CommonJS/ESM and Bundler declarations.
- `archives.cjs` packs the committed snapshot and invokes the release verifier. Before publication, npm installs exact archives with local helper overrides; Bun executes extracted exact archives because it resolves embedded future URLs before overrides. After publication, both must pass actual fresh/frozen URL installs, resolve the package from the unchanged parent, match every source hash, and run Node/Bun tests with no helper overrides.

VentiMath has styled-components 6.1.17 in its installed graph. Its direct source caller is the web StyleSheetManager in `FramedDemo.tsx`, not the native converter. Adoption is separate from this verification.

```sh
npm --prefix scripts/css-native-conformance ci --ignore-scripts
node scripts/css-native-conformance/parser.cjs
node scripts/css-native-conformance/converter.cjs
node scripts/css-native-conformance/differential.cjs
VCSS_NATIVE_ENTRY="$PWD/packages/vcss-to-react-native/index.cjs" node scripts/css-native-conformance/caller.cjs
node scripts/css-native-conformance/types.cjs
node scripts/css-native-conformance/archives.cjs
```
