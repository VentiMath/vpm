# Material component conformance

The independent button, typography, link and SVG icon components target Material 9.5.0 and the APIs used by VentiMath's app-pinned 7.2.0. Controls and React 19.3.1 are locked in the sibling [System fixture](../mui-system-conformance/README.md); no additional dependency tree or vendored upstream implementation is created. The full VPM styling closure is used on the candidate side. Application source is inspected locally, while committed examples use synthetic contest/navigation controls.

- `contract.cjs`: 72 comparisons of native, link and custom-root semantics, disabled accessibility, button types and selection attributes against both controls, on Node and Bun.
- `text-contract.cjs`: 182 text/link/icon markup and accessibility comparisons against both controls, including SVG child geometry and custom roots.
- `text-browser.cjs`: 32 current/app theme and viewport comparisons, computed typography and icon sizes, RTL alignment, responsive styles, link hover/keyboard actions, accessibility-tree names, ref cleanup, stable focused DOM and hydration. The candidate uses its own scoped ThemeProvider, Box, GlobalStyles, styled, useTheme and useMediaQuery; checks include nested $$material providers, CSS variables, responsive Box styles and an SVG sprite root. It renders unchanged ArrowBack, OpenInNew and Print modules from locked current/app icon packages. Production and development builds run separately. `application-scene.jsx` also renders the actual shared-toolbar pattern: IconButton as a Motion button, inherited variants through a wrapper, native disabled/default type, activation, theme rerenders, focus and cleanup. Material 7’s missing native custom-root defaults are asserted separately; VPM follows Material 9.
- Package tests: explicit undefined defaults, disabled custom roots, accessible loading indicators, escaped content, controlled selection ownership, group defaults, class hooks and explicit rejection of unsupported ripple customization. Text/icon cases also check escaped content, inherited-property isolation, root ARIA precedence and accessible titles on decorative SVG children (36 tests total, including standalone/scoped Box themes, Paper elevation/style ownership, Divider roles, Icon ARIA and custom Box/Icon prop forwarding).
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

The text benchmark prepares its theme and 12-element trees before timing. Current Material 9.5.0 and app Material 7.2.0 are independent controls; all four compiled bundles, VPM runtime sources, fixture lockfile and harness inputs are hashed. The separate Box benchmark uses the same harness and 12-element prepared tree, with CSS-variable colors and responsive layout. [Box results](../../packages/vmui-material/bench/box/README.md). Results: [buttons](../../packages/vmui-material/bench/results/README.md), [text and icons](../../packages/vmui-material/bench/text/README.md).

## Surfaces and font icons

`surfaces-contract.cjs` compares 652 rendered root/ARIA cases against current and
app controls, including elevations 0–24, custom elements, divider orientation,
children/alignment and font-icon options. `surfaces-browser.cjs` compares 64
light/dark, narrow/wide, RTL, CSS-variable and custom-theme combinations: all
Paper elevations and overrides, divider pseudo-elements and wrapper spacing,
Icon sizing, Fuse's Box/Icon composition and a Motion Paper root. It checks refs,
retained focus, accessibility names and server-delivered hydration with extracted
critical styles in the document head. Production and development builds run
separately with matching server/client modes.

The one intentional browser difference is asserted before comparison: app
Material 7 consumes custom Icon color/fontSize in Box's System layer. Current 9
forwards them, and VPM follows 9. Native Box roots retain legacy System props.
Paper rejects invalid shadow indices; no app caller uses those values. The font
itself is application-owned, so these checks do not certify font glyph artwork.

```sh
node scripts/mui-material-conformance/surfaces-contract.cjs
bun scripts/mui-material-conformance/surfaces-contract.cjs
node scripts/mui-material-conformance/surfaces-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/surfaces-browser.cjs
```

The expanded archive check repeats the surface contracts and installed browser
candidate. [Surface/icon benchmarks](../../packages/vmui-material/bench/surfaces/README.md)
measure prepared 12-element SSR trees in the existing balanced isolated harness.
All source hashes and raw samples are retained. They do not measure browser paint
or application interaction performance. Older Box/text/button measurements are
historical after the custom-root prop correction.

The browser harness now awaits Chrome exit before deleting its temporary
profile and retries transient directory-not-empty cleanup failures. This fixes
a teardown race observed after the installed button assertions had passed.

## Form state and labels

`forms-contract.cjs` compares 1,900 SSR/context cases against Material 9.5.0 and
app 7.2.0 on Node and Bun: initial values (including zero, empty arrays and
inputProps), adornments, controlled focus, disabled/error/required states,
explicit false overrides, standalone/nested controls, class hooks and blank
helper accessibility. Five focused package tests cover escaping, required
markers, reserved lines, theme defaults and provider isolation.

`forms-browser.cjs` compares 256 theme/viewport/state combinations across both
controls, in production and development: light/dark, RTL, CSS variables, narrow
and wide viewports, app-shaped typography/margins, focused/error/disabled states,
refs and stable DOM. Unchanged upstream InputBase runs through a test-only
provider bridge. Real label activation, typing/clearing, focus callbacks,
controlled focus, disabling/re-enabling, nested state, StrictMode remounts,
accessible input names/descriptions and server-delivered hydration are checked.
The HTML server declares UTF-8 so required markers and reserved-line characters
survive delivery unchanged. No upstream runtime is copied or shipped.

Strict type consumers include form roots, refs, context/hook subpaths and negative
options. Fresh/frozen archive installs repeat the contracts and installed Chrome
fixture. CI runs these alongside the existing Material families.

```sh
node scripts/mui-material-conformance/forms-contract.cjs
bun scripts/mui-material-conformance/forms-contract.cjs
node scripts/mui-material-conformance/forms-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/forms-browser.cjs
node scripts/mui-material-conformance/forms-build.cjs
OUTPUT=packages/vmui-material/bench/forms/node-isolated.json node packages/vmui-material/bench/forms.cjs
OUTPUT=packages/vmui-material/bench/forms/bun-isolated.json bun packages/vmui-material/bench/forms.cjs
```

[Form benchmarks](../../packages/vmui-material/bench/forms/README.md) use prepared
12-element SSR trees and the balanced fresh-process harness, with four AB/BA
pairs and two identical-source controls. They measure form, label and helper
rendering separately, not typing latency or whole-app speed.
