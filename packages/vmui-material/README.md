# vmui-material

Independent Material UI **9.5.0** controls over VPM System, targeting the components VentiMath uses. **This package is partial:** its first completed unit is ButtonBase, Button, IconButton, Fab, ButtonGroup, ToggleButton and ToggleButtonGroup. It is not a replacement for the whole `@mui/material` dependency yet.

```js
import { Button, ToggleButton, ToggleButtonGroup } from 'vmui-material';
import IconButton from 'vmui-material/IconButton';
```

The button contract covers native buttons, links and custom router roots; keyboard activation, focus-visible actions and ref cleanup; disabled and loading controls; icons, variants, colors and sizes; grouped defaults; controlled exclusive/multiple toggles; and theme defaults, slot overrides, variants and responsive `sx`. Theme creation remains with the existing caller. VentiMath's current theme disables ripples; basic local ripple feedback is also available, with owned timers cleaned up on unmount. Custom TouchRipple props reject explicitly. Ripple animation is independently designed, not pixel-identical to upstream. Color states use CSS relative colors so translucent theme colors and variable opacity retain the correct alpha; browser support for relative colors is required.

Current Material and the app's 7.2.0 are separate controls on React 19.3.1. VPM follows Material 9 when keyboard activation dispatches a real click and when disabled links reject programmatic clicks; Material 7 forwards keyboard events and permits that disabled-link callback. VPM also preserves the app's older `containedPrimary`-style override keys, alongside current root callbacks. Material 9 no longer applies those legacy color/variant keys itself.

The app-shaped Chrome fixture checks light/dark themes, CSS-variable themes, RTL styles, narrow/wide layouts, custom gradients and icon dimensions, keyboard interactions, loading, toggle selections, hydration and focus preservation. These are component checks, not full application acceptance or Safari/Firefox certification. Generated markup and ripple styling are not required to be byte-identical.

Forms, typography and other display components, navigation, menus/overlays, full Material theme creation and the remaining app-used exports still need implementation. No upstream Material implementation is bundled, and no app dependency or release has been changed by this work. Runtime dependencies are the VPM System closure, with React as a peer.

Final measurements show Node icon-button SSR about 20% slower than both controls; the other differences are inconclusive. These are isolated SSR costs, not application interaction measurements.

[Conformance](../../scripts/mui-material-conformance/README.md), [benchmarks](bench/results/README.md) and [provenance](PROVENANCE.json) record the measured scope. Supported runtimes are Node 24, Bun 1.4.4 and modern browsers.
