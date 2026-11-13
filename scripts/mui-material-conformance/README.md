# Material component conformance

The independent button, typography, link and SVG icon components target Material 9.5.0 and the APIs used by VentiMath's app-pinned 7.2.0. Controls and React 19.3.1 are locked in the sibling [System fixture](../mui-system-conformance/README.md); no additional dependency tree or vendored upstream implementation is created. The full VPM styling closure is used on the candidate side. Application source is inspected locally, while committed examples use synthetic contest/navigation controls.

- `contract.cjs`: 72 comparisons of native, link and custom-root semantics, disabled accessibility, button types and selection attributes against both controls, on Node and Bun.
- `text-contract.cjs`: 182 text/link/icon markup and accessibility comparisons against both controls, including SVG child geometry and custom roots.
- `text-browser.cjs`: 32 current/app theme and viewport comparisons, computed typography and icon sizes, RTL alignment, responsive styles, link hover/keyboard actions, accessibility-tree names, ref cleanup, stable focused DOM and hydration. It renders unchanged ArrowBack, OpenInNew and Print modules from locked current/app icon packages. Production and development builds run separately. `application-scene.jsx` also renders the actual shared-toolbar pattern: IconButton as a Motion button, inherited variants through a wrapper, native disabled/default type, activation, theme rerenders, focus and cleanup. Material 7’s missing native custom-root defaults are asserted separately; VPM follows Material 9.
- Package tests: explicit undefined defaults, disabled custom roots, accessible loading indicators, escaped content, controlled selection ownership, group defaults, class hooks and explicit rejection of unsupported ripple customization. Text/icon cases also check escaped content, inherited-property isolation, root ARIA precedence and accessible titles on decorative SVG children (20 tests total).
- `browser.cjs`: actual keyboard activation, click/cancellation, disabled/loading callbacks, exclusive and multiple selection, action focus, stable DOM across parent rerenders, SSR hydration, ripple cleanup and 32 theme/viewport combinations. Theme fixtures cover light/dark, CSS variables, RTL caches and app-shaped size/gradient/icon overrides. It compares rendered RGBA color channels (normalizing equivalent relative-color/`rgba` spellings), spacing, explicit dimensions and style hooks. Selected toggles must retain a nontransparent highlight in every theme; intrinsic text width and generated style identifiers are not equality gates.
- Two current/app differences are asserted before comparison: Material 9 keyboard activation produces click events while 7 forwards key events; a programmatic click on a disabled link is rejected by VPM/9 but reaches the 7 callback. Only these known legacy observations are normalized in the final action comparison. Older variant/color override keys remain supported by VPM; the shared fixture supplies the equivalent current root callback too.
- `types.cjs`: strict TypeScript 7 NodeNext and Bundler consumers, including router components, native and anchor refs, responsive styles and negative option/ref checks.
- `archives.cjs`: recursively packed VPM closure with pinned archive locations, fresh/frozen npm and Bun installs, all public CJS/ESM entries, exact runtime/declaration bytes, Node/Bun SSR and strict consumers. The installed npm closure also repeats the full browser comparisons. No registry fallback for internal names or upstream Material runtime.

```sh
npm --prefix scripts/mui-system-conformance ci --ignore-scripts --legacy-peer-deps
npm --prefix scripts/motion-utils-conformance ci --ignore-scripts
node --test packages/vmui-material/test/*.test.cjs
bun test packages/vmui-material/test/*.test.cjs
node scripts/mui-material-conformance/contract.cjs
bun scripts/mui-material-conformance/contract.cjs
node scripts/mui-material-conformance/text-contract.cjs
bun scripts/mui-material-conformance/text-contract.cjs
node scripts/mui-material-conformance/types.cjs
node scripts/mui-material-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/browser.cjs
node scripts/mui-material-conformance/text-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/text-browser.cjs
node scripts/mui-material-conformance/archives.cjs
```

Recorded benchmark reports predate the custom native-root correction; they are historical measurements, not a new performance claim for that fix.

The benchmark driver uses production bundles and the balanced process harness. Separate processes, four AB/BA comparison pairs, two identical-source controls and validation outside timing limit order/JIT contamination. It measures repeated button-family and text/link/icon SSR, not page interactions or application load time. Source hashes and all raw samples accompany the report.

The text benchmark prepares its theme and 12-element trees before timing. Current Material 9.5.0 and app Material 7.2.0 are independent controls; all four compiled bundles, VPM runtime sources, fixture lockfile and harness inputs are hashed. Results: [buttons](../../packages/vmui-material/bench/results/README.md), [text and icons](../../packages/vmui-material/bench/text/README.md).
