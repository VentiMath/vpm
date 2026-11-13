# vmui-material

Independent Material UI **9.5.0** controls over VPM System, targeting the components VentiMath uses. **This package is partial:** it implements ButtonBase, Button, IconButton, Fab, ButtonGroup, ToggleButton, ToggleButtonGroup, Typography, Link and SvgIcon, plus `createSvgIcon`. It is not a replacement for the whole `@mui/material` dependency yet.

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

Forms, remaining surfaces and display components, navigation, menus/overlays, full Material theme creation and the remaining app-used exports still need implementation. No upstream Material implementation is bundled, and no app dependency or release has been changed by this work. Runtime dependencies are the VPM System closure, with React as a peer.

The recorded benchmarks predate the custom native-root correction. The earlier button measurements found Node icon-button SSR about 20% slower than both controls. The new Typography/Link/SvgIcon measurements are inconclusive on Node and Bun: process-pair variation and identical-source controls do not establish a speedup or regression in any case. Raw samples, including large control differences, are retained. These are isolated SSR costs, not application interaction measurements.

[Conformance](../../scripts/mui-material-conformance/README.md), [button benchmarks](bench/results/README.md), [text/icon benchmarks](bench/text/README.md) and [provenance](PROVENANCE.json) record the measured scope. Supported runtimes are Node 24, Bun 1.4.4 and modern browsers.

Current application priorities (reviewed at `3aa9eb28`, November 13, 2026): Material remains in shared theme/navigation, authentication, public pages and table components while many feature pages use Astryx. A static non-test source inventory found Typography imports in 164 files, Box in 99, styles in 88, Paper in 43 and Divider in 15. These are import counts, not route reachability or adoption percentages. Next work must cover the Material Box/theme boundary and Fuse sprite icons as well as Paper/Divider, then forms, menus and the table’s Material peers. A complete app cutover requires those callers, including dependencies’ imports, to pass together.
