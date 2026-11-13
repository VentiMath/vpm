# Material button conformance

The independent button family targets Material 9.5.0 and the APIs used by VentiMath's app-pinned 7.2.0. Controls and React 19.3.1 are locked in the sibling [System fixture](../mui-system-conformance/README.md); no additional dependency tree or vendored upstream implementation is created. The full VPM styling closure is used on the candidate side. Application source is inspected locally, while committed examples use synthetic contest/navigation controls.

- `contract.cjs`: 72 comparisons of native, link and custom-root semantics, disabled accessibility, button types and selection attributes against both controls, on Node and Bun.
- Package tests: explicit undefined defaults, disabled custom roots, accessible loading indicators, escaped content, controlled selection ownership, group defaults, class hooks and explicit rejection of unsupported ripple customization.
- `browser.cjs`: actual keyboard activation, click/cancellation, disabled/loading callbacks, exclusive and multiple selection, action focus, stable DOM across parent rerenders, SSR hydration, ripple cleanup and 32 theme/viewport combinations. Theme fixtures cover light/dark, CSS variables, RTL caches and app-shaped size/gradient/icon overrides. It compares rendered RGBA color channels (normalizing equivalent relative-color/`rgba` spellings), spacing, explicit dimensions and style hooks. Selected toggles must retain a nontransparent highlight in every theme; intrinsic text width and generated style identifiers are not equality gates.
- Two current/app differences are asserted before comparison: Material 9 keyboard activation produces click events while 7 forwards key events; a programmatic click on a disabled link is rejected by VPM/9 but reaches the 7 callback. Only these known legacy observations are normalized in the final action comparison. Older variant/color override keys remain supported by VPM; the shared fixture supplies the equivalent current root callback too.
- `types.cjs`: strict TypeScript 7 NodeNext and Bundler consumers, including router components, native and anchor refs, responsive styles and negative option/ref checks.
- `archives.cjs`: recursively packed VPM closure with pinned archive locations, fresh/frozen npm and Bun installs, all public CJS/ESM entries, exact runtime/declaration bytes, Node/Bun SSR and strict consumers. The installed npm closure also repeats the full browser comparisons. No registry fallback for internal names or upstream Material runtime.

```sh
npm --prefix scripts/mui-system-conformance ci --ignore-scripts --legacy-peer-deps
node --test packages/vmui-material/test/buttons.test.cjs
bun test packages/vmui-material/test/buttons.test.cjs
node scripts/mui-material-conformance/contract.cjs
bun scripts/mui-material-conformance/contract.cjs
node scripts/mui-material-conformance/types.cjs
node scripts/mui-material-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/browser.cjs
node scripts/mui-material-conformance/archives.cjs
```

The benchmark driver uses production bundles and the balanced process harness. Separate processes, four AB/BA comparison pairs, two identical-source controls and validation outside timing limit order/JIT contamination. It measures repeated button-family SSR, not page interactions or application load time. Source hashes and all raw samples accompany the report.
