# vmui-material

Independent Material UI **9.5.0** controls over VPM System, targeting the components VentiMath uses. **This package is partial:** it implements ButtonBase, Button, IconButton, Fab, ButtonGroup, ToggleButton, ToggleButtonGroup, Typography, Link, SvgIcon, Box, Paper, Divider, Icon, FormControl, FormLabel and FormHelperText, plus `createSvgIcon` and the resolved-theme bridge. It is not a replacement for the whole `@mui/material` dependency yet.

```js
import { Button, ToggleButton, ToggleButtonGroup } from 'vmui-material';
import IconButton from 'vmui-material/IconButton';
```

The button contract covers native buttons, links and custom router roots; keyboard activation, focus-visible actions and ref cleanup; disabled and loading controls; icons, variants, colors and sizes; grouped defaults; controlled exclusive/multiple toggles; and theme defaults, slot overrides, variants and responsive `sx`. Theme creation remains with the existing caller. VentiMath's current theme disables ripples; basic local ripple feedback is also available, with owned timers cleaned up on unmount. Custom TouchRipple props reject explicitly. Ripple animation is independently designed, not pixel-identical to upstream. Color states use CSS relative colors so translucent theme colors and variable opacity retain the correct alpha; browser support for relative colors is required.

Current Material and the app's 7.2.0 are separate controls on React 19.3.1. VPM follows Material 9 when keyboard activation dispatches a real click and when disabled links reject programmatic clicks; Material 7 forwards keyboard events and permits that disabled-link callback. VPM also preserves the app's older `containedPrimary`-style override keys, alongside current root callbacks. Material 9 no longer applies those legacy color/variant keys itself.

Custom component roots default to native button semantics, including `type="button"` and native `disabled`, matching Material 9. Set `nativeButton={false}` for a custom nonbutton root that needs ARIA button semantics. Material 7 lacks those native defaults for custom roots. The shared external-link toolbar’s `IconButton component={motion.button}` pattern is checked with inherited variants, activation, theme changes, focus and ref cleanup.

The app-shaped Chrome fixture checks light/dark themes, CSS-variable themes, RTL styles, narrow/wide layouts, custom gradients and icon dimensions, keyboard interactions, loading, toggle selections, hydration and focus preservation. These are component checks, not full application acceptance or Safari/Firefox certification. Generated markup and ripple styling are not required to be byte-identical.

Typography covers semantic variants, custom roots, truncation, spacing and physical alignment in RTL. Link retains native navigation, button and router semantics, underline states and keyboard focus. SvgIcon covers accessible titles, decorative icons, SVG child geometry, theme sizing and forwarded refs. `createSvgIcon` supports unchanged Material icon modules: ArrowBack, OpenInNew and Print from both current 9.5.0 and app-pinned 7.2.0 are checked in Chrome. FuseSvgIcon uses styled Box with SVG sprite references and an Icon fallback; those are separate from SvgIcon. The `utils` entry currently exposes only `createSvgIcon`.

For existing callers, Typography retains Material 7’s `paragraph`, direct System props and CSS/palette-path colors that Material 9 dropped. Explicit root ARIA attributes take precedence over SVG child attributes; a supplied title makes a decorative child accessible unless the root explicitly hides it. Unknown typography variants and icon sizes cannot read inherited object properties.

Input components, remaining surfaces and display components, navigation, menus/overlays, full Material theme creation and the remaining app-used exports still need implementation. No upstream Material implementation is bundled, and no app dependency or release has been changed by this work. Runtime dependencies are the VPM System closure, with React as a peer.

The earlier button and text/icon benchmarks predate the custom native-root correction. The earlier button measurements found Node icon-button SSR about 20% slower than both controls. The new Typography/Link/SvgIcon measurements are inconclusive on Node and Bun: process-pair variation and identical-source controls do not establish a speedup or regression in any case. Raw samples, including large control differences, are retained. These are isolated SSR costs, not application interaction measurements.

[Conformance](../../scripts/mui-material-conformance/README.md), [button benchmarks](bench/results/README.md), [text/icon benchmarks](bench/text/README.md), [Box benchmarks](bench/box/README.md), [surface/icon benchmarks](bench/surfaces/README.md), [form benchmarks](bench/forms/README.md) and [provenance](PROVENANCE.json) record the measured scope. Supported runtimes are Node 24, Bun 1.4.4 and modern browsers.

Current application priorities (reviewed at `3aa9eb28`, November 13, 2026): Material remains in shared theme/navigation, authentication, public pages and table components while many feature pages use Astryx. A static non-test source inventory found Typography imports in 164 files, Box in 99, styles in 88, Paper in 43 and Divider in 15. These are import counts, not route reachability or adoption percentages. The Box/theme boundary and SVG sprite root are covered. Paper, Divider and the Icon fallback are also covered. The shared FormControl/FormLabel/FormHelperText foundation is covered; next are InputBase and input wrappers, menus and the table’s Material peers. A complete app cutover requires those callers, including dependencies’ imports, to pass together.

The `styles` entry exposes `ThemeProvider`, `useTheme`, `styled`, `GlobalStyles`,
`useThemeProps`, `useMediaQuery` and `useColorScheme`. Pass an existing resolved
Material theme, including its CSS-variable configuration; this bridge does not
implement Material's full `createTheme` factory. `$$material` scoping and nested
callback providers keep Material separate from other styled-library themes.
Box accepts polymorphic HTML/SVG roots, refs, responsive `sx`, and the direct
System props used by the app's Material 7 callers. Browser comparisons include
the styled Box/SVG sprite pattern used by FuseSvgIcon. Its Icon fallback is now covered too. New Box SSR measurements are separate from the older reports: 12% less time on Node and 22% less on Bun than the app’s Material 7 control; versus Material 9, Node takes 10.3% more time and Bun has no established difference. This is 12-element SSR, not browser frame rate.

```jsx
import Box from 'vmui-material/Box';
import { ThemeProvider, useTheme } from 'vmui-material/styles';

<ThemeProvider theme={existingResolvedMaterialTheme}>
  <Box component="section" sx={{ p: 2, color: 'text.primary' }}>Contest</Box>
</ThemeProvider>
```

Paper covers all 25 standard elevations, outlined/square/custom variants,
polymorphic roots, dark overlays, CSS-variable themes and caller style precedence.
Default shadow geometry is standard design data observed through the public theme
API; the component logic is independent. Invalid elevations outside integer 0–24
throw, rather than silently losing the shadow. Theme-provided shadows are honored.

Divider supports native horizontal rules, vertical/flex separators, labelled
lines, alignment, inset/middle/absolute layouts and explicit presentation roles.
The legacy Material 7 light option and vertical-children class hook are retained.
Icon supplies the font-icon wrapper, palette/size options, ligature classes and
refs; the application must provide its font. Decorative icons are hidden by
default; explicit ARIA props can expose a name. This is distinct from SvgIcon.

The real Fuse fallback revealed a Box integration issue: custom roots' `color`
and `fontSize` were consumed as System styles. Box now forwards those props to
Icon, matching Material 9. Material 7 has the same collision as the earlier VPM
implementation. The browser test asserts that legacy difference explicitly;
it does not normalize it away without checking. Native Box roots still accept
legacy direct System props. The previous Box benchmark predates this custom-root
correction; the separate surface/icon report measures the current code.

The new surface/icon SSR recordings show 7.6% less time for Icon on Node and 6.8%
less for Paper on Bun versus Material 9. The other comparisons are inconclusive:
process variation is substantial, including large identical-source control
outliers. All raw samples are retained; there is no overall speedup claim.

FormControl, FormLabel and FormHelperText provide the shared form foundation.
The provider owns focus, filled and start-adornment state, while controlled
`focused` and explicit child flags take precedence. Disabling clears stale focus;
nested controls have independent state. Recognized Input/Select child props seed
filled/adornment state for server rendering. Inputs notify the context through
`useFormControl`; wrapping an arbitrary native input does not automatically track
its value. Use one input per control.

FormLabel keeps native `htmlFor`/legend behavior and an aria-hidden required
marker. FormHelperText preserves a reserved line for a single-space child.
Callers supply input IDs and `aria-describedby`; these components do not invent
associations. Theme defaults, slot overrides, variants, responsive `sx`, refs,
CSS-variable colors and RTL work through VPM System. Explicit false child options
can opt out of inherited error, disabled, required or focused state.

The browser fixture models FuseSettings and palette selection, including the
app's secondary control color, label typography and helper margins. It also
checks an unchanged upstream InputBase against the owned context through a
test-only bridge. No upstream input code ships. InputBase, Input, OutlinedInput,
InputLabel and TextField are the next implementation unit, not exports claimed
by this package today. The FormControl context and hook subpaths share one
identity across CJS/ESM consumers.

The form benchmark records **12.4% more Bun time** for the combined 12-field
FormControl/label/helper scene versus Material 9 (about 378 µs versus 337 µs).
Standalone label/helper comparisons and the app 7 comparisons are inconclusive.
Node medians are higher too, but process-pair and identical-source control spread
do not establish a direction; those noisy samples remain in the report. There
is no claimed form-rendering speedup. These are SSR costs, not browser typing or
validation latency. The older component reports remain historical measurements.
