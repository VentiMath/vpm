# vmui-material

Independent Material UI **9.5.0** controls over VPM System, targeting the components VentiMath uses. **This package is partial:** it implements ButtonBase, Button, IconButton, Fab, ButtonGroup, ToggleButton, ToggleButtonGroup, Typography, Link, SvgIcon, Box, GlobalStyles, CssBaseline, Paper, Divider, Icon, FormControl, FormLabel, FormHelperText, InputBase, Input, OutlinedInput, InputLabel, InputAdornment, TextField, List, ListItem, MenuItem, MenuList, ListItemIcon, ListItemText, ListSubheader, Menu, Popover, Select, Checkbox, FormControlLabel, Radio, RadioGroup, FormGroup, Switch, Chip, Avatar, CircularProgress, Skeleton, Container, Card, CardContent, CardActionArea, AvatarGroup, Tooltip, Collapse, DialogTitle, DialogContent, DialogActions, Dialog, Slide, DialogContentText, Drawer, SwipeableDrawer, Table, TableHead, TableBody, TableFooter, TableRow, TableCell, TableContainer, Autocomplete, TableSortLabel, PaginationItem, Pagination, LinearProgress, Alert, AlertTitle, Badge, ListItemButton, AppBar, Toolbar, Accordion, AccordionSummary, AccordionDetails, Tab, Tabs, Breadcrumbs, Snackbar, SnackbarContent, Stack, Grid, Rating, ClickAwayListener, Grow, Popper, Slider, Stepper, Step, StepLabel and StepContent, plus `createSvgIcon` and the resolved-theme bridge. It is not a replacement for the whole `@mui/material` dependency yet.

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

Remaining form controls, remaining surfaces and display components, navigation, menus/overlays, full Material theme creation and the remaining app-used exports still need implementation. No upstream Material implementation is bundled, and no app dependency or release has been changed by this work. Runtime dependencies are the VPM System closure, with React as a peer.

The earlier button and text/icon benchmarks predate the custom native-root correction. The earlier button measurements found Node icon-button SSR about 20% slower than both controls. The new Typography/Link/SvgIcon measurements are inconclusive on Node and Bun: process-pair variation and identical-source controls do not establish a speedup or regression in any case. Raw samples, including large control differences, are retained. These are isolated SSR costs, not application interaction measurements.

[Conformance](../../scripts/mui-material-conformance/README.md), [button benchmarks](bench/results/README.md), [text/icon benchmarks](bench/text/README.md), [Box benchmarks](bench/box/README.md), [surface/icon benchmarks](bench/surfaces/README.md), [form benchmarks](bench/forms/README.md), [input benchmarks](bench/input/README.md) and [provenance](PROVENANCE.json) record the measured scope. Supported runtimes are Node 24, Bun 1.4.4 and modern browsers.

Current application priorities (reviewed at `82457c3c`, November 16, 2026): Material remains in shared theme/navigation, authentication, public pages and table components while many feature pages use Astryx. Static non-test source imports include Typography in 164 files, Box in 99, styles in 90, Paper in 43 and Skeleton in 35. These are import counts, not route reachability or adoption percentages. See the [current inventory and remaining families](../../docs/FRONTEND.md).

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
test-only bridge. No upstream input code ships. InputBase, Input, OutlinedInput, InputLabel, InputAdornment and the native TextField paths are now implemented below. The FormControl context and hook subpaths share one
identity across CJS/ESM consumers.

The form benchmark records **12.4% more Bun time** for the combined 12-field
FormControl/label/helper scene versus Material 9 (about 378 µs versus 337 µs).
Standalone label/helper comparisons and the app 7 comparisons are inconclusive.
Node medians are higher too, but process-pair and identical-source control spread
do not establish a direction; those noisy samples remain in the report. There
is no claimed form-rendering speedup. These are SSR costs, not browser typing or
validation latency. The older component reports remain historical measurements.

InputBase is the native input engine beneath TextField and table filters. It
supports controlled/uncontrolled values, native constraints, read-only/disabled
state, input/root refs (including React 19 callback cleanup), input props and
slots, adornments, suffixes and the shared FormControl state. Root refs point to
the wrapper; `inputRef` points to the actual field. App Material 7 `components`
and `componentsProps` are retained alongside current `slots`/`slotProps`.

A top-level `aria-label` names the native field, following Material 9; app 7 put
it on the wrapper instead. Legacy per-input state classes removed in Material 9
are not emitted. Their old style-override keys remain accepted. Internal
`classes` objects do not leak into custom native-root attributes. These
intentional differences are asserted against the controls.

Multiline fields preserve the same editable textarea while measuring content,
placeholder, wrapping and row bounds. A hidden measurement node is created only
on the client in the input's own document, then removed on unmount or DOM replacement. Changing a custom root reattaches
measurement to the new textarea. Width changes
schedule measurement without a height-feedback loop; window resizing also works
without ResizeObserver. No hidden measurement textarea is sent in server HTML.
Current/app comparisons cover ARML-shaped minimum-row notes and WARML-shaped
fixed-row contact fields, controlled updates, selection retention and iframe
cleanup. Custom `inputComponent` implementations own their own sizing.

React Hook Form 7.92.0 and app 7.56.0 Controllers are exercised unchanged, including
number values, refs, setValue, setFocus and reset. Browser checks include simulated
autofill animation signals; they do not certify individual password managers.
InputLabel, TextField and Select composition are implemented below. The remaining
app dependencies still gate a complete Material cutover.

The initial InputBase SSR measurements showed multiline trees taking **10.7% less Node
time and 6.2% less Bun time** than Material 9. Single-line Bun trees take **15.1%
more time**, and complete labelled-field trees take **21.7% more versus Material
9 and 18.8% more versus app 7**. Other directions are unestablished under the
process/control checks. For scale, the 12-field Bun scene takes about 649 µs
versus 525 µs for Material 9. The multiline SSR path omits client-only measurement
nodes; browser sizing is checked separately. These results do not claim faster
typing, layout or whole-app performance. Raw samples and source hashes are linked
in the input report; older form measurements remain historical.

The [InputBase optimization measurements](bench/input-optimized/README.md) replace
those initial results for the optimized implementation. Static input CSS no
longer rebuilds declaration objects; state class assembly avoids temporary
arrays; form defaults avoid an unnecessary copy, and absent variants do not
construct unused state objects. No theme or user-value cache is added. Keeping
stable resolved-prop shapes avoids a Node regression found during profiling.
Bun single-line medians are now 7.5% lower than Material 9, with no established
speed difference beyond process/control variation. Full-field medians are 8%
higher than Material 9 and 12.8% higher than app 7, also unestablished. Material 9
multiline SSR is consistently lower: 20.9% on Node and 22.7% on Bun. Node has no
established single-line or full-field regression in this recording. Raw samples
and all control outliers remain in the report. Browser behavior, textarea
ownership and theme overrides are checked separately; these are SSR costs.


Input and OutlinedInput share the native input engine above. Input adds the
standard underline; OutlinedInput adds a decorative fieldset/legend and a notch
that follows focus, filled state and start adornments, with an explicit `notched`
override. Both are recognized by FormControl for initial server-rendered state.
The outline's `label` reserves space only; callers still supply an actual label
association or accessible name. Required markers are layout text inside the
aria-hidden outline. The root ref and `inputRef` retain their separate meanings.

Current `notchedOutline` slots and callback slot props are supported. VentiMath's
legacy small-input, multiline and adornment padding override keys are retained.
Native slot roots do not receive internal `ownerState` or `classes` objects;
upstream Input leaks these for a native root. This intentional difference is
asserted before DOM comparison. The standard and outlined components now compose with InputLabel and TextField
below; building them is not app adoption.

[Input/OutlinedInput measurements](bench/input-variants/README.md) cover prepared
12-control standard, outlined, multiline and complete-field trees. Standard
Input takes 16.5% more Node time than Material 9; complete outlined fields take
23.5% more than app 7. Other non-multiline directions are unestablished, including
Bun outlined (+1.1% median) and complete fields (+5.5%) versus Material 9.
Multiline SSR takes 7.7% less Node time and 14.6% less Bun time than Material 9;
it also takes less time than app 7. All samples and identical-source controls
are retained. These are SSR costs, not browser typing or application latency.

The [input styling follow-up](bench/input-variants-optimized/README.md) removes
repeated inherited `sx` evaluation and empty override resolution. Exact CSS names
are cached with count/length limits; compiled rules look up selectors before full
CSS, preserving exact-content checks, per-cache custom plugins and FIFO eviction.
Node no longer establishes a standard-input or full-field slowdown in this run;
outlined SSR takes 9–13% less time and multiline about 25% less than the two
controls. Bun takes less time in seven of eight cases; the app full-field direction
is unestablished. These are local SSR measurements, not browser latency claims.


InputLabel and InputAdornment cover the shared form wrappers used by VentiMath:
label shrink follows focus, filled values (including zero) and start adornments;
explicit `shrink` wins. Labels preserve native `htmlFor`, required asterisks,
small/standard/outlined/filled styling, animation opt-out and caller transforms.
Adornments inherit variant, hidden-label and size styling, isolate nested form
context, wrap strings in Typography unless disabled, and support interactive
children or `disablePointerEvents`. Native/custom roots, refs, theme defaults,
slot overrides and `sx` are supported. Filled label/adornment styling does not
imply that FilledInput has been implemented.

The [decorated-field measurements](bench/input-decorations/README.md) cover
12 prepared standard, outlined, multiline and full-field trees with real
InputLabel/InputAdornment wrappers, using current and app Material controls.

In that decorated-field run, Node takes 19.9% less time for standard inputs and
11.3% less for full fields than app Material 7. Against Material 9, standard,
outlined and full-field directions are unestablished; multiline takes 20.5% less.
Bun establishes lower time for multiline against both controls and outlined
against app 7; other directions are unestablished. No case establishes a
regression. All samples and controls are retained in the report.


TextField covers standard and outlined search, password, numeric/date and multiline
inputs used by VentiMath, including React Hook Form value/reset/focus, generated
hydration-safe IDs, label/helper associations, required/error states, root versus
input refs, adornments and theme overrides. Modern slot objects/callbacks win over
the retained Material 7 `InputProps`, `inputProps`, `InputLabelProps`,
`FormHelperTextProps` and `SelectProps` aliases. Those aliases do not leak onto DOM
nodes. Top-level ARIA props retain root placement; use `slotProps.htmlInput` to
name the actual input when there is no label.

**TextField dropdowns now use the independent Select by default.** The earlier
control adapter is gone; acceptance exercises the shipped Select/Menu stack.
Explicit select slots remain available.
Filled TextField has no observed app caller; it requires `slots.input` until
FilledInput is implemented. Unsupported defaults throw instead of silently
rendering another control. Non-native selects follow Material 9’s ARIA-associated
label div; Material 7 used a label pointing at the combobox div.

[TextField measurements](bench/text-field/README.md) record isolated prepared
12-field SSR workloads, with all comparison pairs and identical-source controls.

Against app Material 7, outlined and multiline SSR take 22–30% less Node time
and about 21% less Bun time. Complete form SSR takes 16.5% less on Node and
12.8% less on Bun. Against Material 9, standard and multiline are lower on both
runtimes, and outlined is lower on Bun; the remaining directions are
unestablished at this precision. These measurements do not establish browser
interaction or application throughput improvements.


The menu foundation adds List, ListItem, MenuItem, MenuList, ListItemIcon, ListItemText,
ListSubheader, Menu, Popover and Select. VentiMath callers include FuseSearch's standalone
highlighted suggestion rows, navigation shortcuts, theme/share menus, table row
actions and the items beneath reminder/WARML dropdowns. Select now composes this foundation by default in TextField dropdowns.

MenuList covers arrow/Home/End navigation, prefix/repeated-letter search, disabled
items, wrapping options and initial selected-item focus. MenuItem retains the
standalone app7 use that Material9 rejects outside MenuList. Material9's smaller
standalone icon gutter and mount-only autoFocusItem behavior are intentional
current-version choices; the app7 differences are asserted. Modern text/menu
slot props take precedence over retained app7 aliases.

Menu/Popover independently implement anchored or coordinate placement, viewport
clamping, action.updatePosition, owner-document portals, resize/scroll updates,
focus enforcement/restoration, Escape/Tab/backdrop dismissal and nested scroll
and ARIA ownership. Current/app/VPM comparisons cover repeated opening, kept
mounts, portal opt-out, nested overlays and iframe documents. They reuse owned
Paper and list components; there is no upstream Modal, Menu or Popover runtime.

The default entrance uses a lightweight CSS transition. Pixel-identical Grow
trajectories, delayed exit rendering and custom transition components are outside
the verified contract; custom transition slots reject explicitly. The menu
foundation does not claim a complete general Modal/transition API or app adoption.
[Menu foundation measurements](bench/menu-foundation/README.md) cover prepared
12-item SSR and closed-popup rendering, not popup opening latency or keyboard speed.

Against Material9, icon/text SSR takes about 9–13% less Node time; ordinary/dense
menu differences are unestablished. Bun establishes about 11–17% less time for
all four item/text workloads. Versus app7, ordinary/dense menus take about 11%
less Node time; several other comparisons remain noisy. Closed-menu SSR is
77–82% lower across controls/runtimes, but measures an unmounted popup rather
than interactive opening. All pairs, including large control outliers, remain
in the report; no case establishes a regression.


Select covers the scalar, numeric and multiple values used by reminder schedules,
WARML forms, roster switching and table filters. It supports controlled/uncontrolled
values and opening, empty selections, custom value display, disabled/read-only
states, grouped options, native mode, refs and hidden form inputs. Multiple values
retain their value order while displaying labels in option order. Keyboard
selection skips disabled items and group headings; Escape/Tab and selection restore
focus. Real current/app React Hook Form Controllers test selection, reset and focus.

Current Material 9 accessible naming is used: the label names the combobox without
repeating its selected value, and read-only state is exposed. Material 7 lacked
those improvements. The hidden input has a hydration-stable ID. A default-valued
TextField raises its label in server HTML; current upstream waits for mounting.
Default filled inputs and the popup transition exclusions above remain outside
this verified contract. This work does not publish Material or switch the app.

The Select checks include 131 current-version SSR comparisons, browser interaction
comparisons against current 9.5.0 and app 7.2.0, React production/development runs,
current display/icon styling, the existing TextField theme matrix, hydration and
exact packed installs. [Select measurements](bench/select/README.md) compare
prepared 12-dropdown SSR workloads in isolated, balanced processes. They do not
measure browser opening latency or application throughput.

Against Material 9, these Select workloads use 21–28% less Node time and
21–33% less Bun time. Against app Material 7, the standalone Select workloads
use 24–26% less Node time and 29–31% less Bun time; complete TextField dropdowns
use 25.6% less Bun time. The app7 complete-field Node result is inconclusive
because identical-source controls vary substantially. All raw samples and
controls are retained; no measured case establishes a regression.


Checkbox and FormControlLabel cover WARML interest/confirmation Controllers,
authentication remember/terms fields and table selection. The input owns native
focus, label activation, Space toggling, validation and form submission; its outer
wrapper adds no competing button role or tab stop. Controlled/default checked
values, custom icons, mixed table selection, disabled state, required labels,
label placement, input/root refs, slots and app theme overrides are covered.
FormControlLabel also composes unchanged control Radio/Switch components in the
Checkbox test fixture. Radio now has its own implementation and group-specific
checks; Switch now has its own implementation and native preference-form checks.

Native indeterminate state follows Material 9, improving on app7's visual-only
mixed state. Native form reset also restores the icon and subsequent click
behavior; both upstream controls leave the icon stale. Canceled resets remain
canceled. Current input/typography slots take precedence over retained app7
`inputProps`, `inputRef` and `componentsProps.typography` aliases. Existing
Typography labels are retained without another wrapper.

Verification includes 936 current/app SSR comparisons, production and development
Chrome checks with React 19.3.1, current/app Hook Form Controllers, native reset,
labels and accessibility, theme/CSS-variable/RTL state matrices, refs and hydration.
[Checkbox measurements](bench/checkbox/README.md) use prepared 12-control SSR
workloads and the isolated process harness. They do not measure click latency or
application throughput. The package remains partial, with no release or app
cutover in this unit.

Against app Material 7, the four Checkbox/label workloads use 5–17% less Node
SSR time and 16–25% less Bun time. Against Material 9, small Checkbox SSR uses
10.6% less Node time; the other Node differences are unestablished at this
precision. Bun uses 19–30% less time across all four current-version workloads.
All samples and controls are retained, including noisy comparisons. No case
establishes a regression; these are local SSR costs, not interaction speed claims.

## Radio and group controls

`Radio`, `RadioGroup`, `useRadioGroup` and `FormGroup` cover the WARML team/flight
choices and Fuse settings Controllers reviewed at app main `446bc73d`.
Native radio inputs provide arrow-key selection, disabled-option skipping,
labels, required validation and form submission. Explicit child checked/name
props override group defaults; generated names isolate unnamed groups.
Group actions focus the selected enabled input. Object values use identity;
other values use their DOM string representation.

The group default is restored after an uncanceled native form reset, without
emitting change callbacks. Input/slot refs, current slot callbacks, app7 aliases,
theme defaults/overrides, CSS variables, RTL and stable hydration are covered.
Standard radio glyph geometry is credited Material design data; no upstream
component runtime is used. The native input is the only interactive element.

Verification includes 388 current/app SSR comparisons, React19.3.1 production
and development Chrome checks, Hook Form settings and team-choice fixtures,
keyboard navigation, resets, refs and theme changes. [Radio measurements](bench/radio/README.md)
measure prepared SSR work, not gesture latency or whole-app throughput.
Material remains partial; this unit does not publish or switch the app.

The isolated Radio workloads use 13–26% less Bun SSR time than app Material7.
Node comparisons are inconclusive: pair variation and identical-source controls
are too large to establish a direction. Every sample is retained; these results
do not imply a browser interaction speedup.


## Switch

`Switch` covers the Material callers still present in WARML email preferences,
family reminders, Fuse settings and QuickPanel at app revision `446bc73d`.
Calendar and many newer feature screens already use Astryx Switch; building
this compatibility component does not change those screens or select a new
application design system.

The native input owns checked state, keyboard toggling, validation and form
submission. The five slots, refs, color/size/edge classes, FormControl disabled
state, Hook Form callbacks and compact Fuse theme overrides are supported.
Current Material9 switch semantics and app7 input aliases are preserved.
An uncontrolled native form reset also restores the thumb, honors cancellation
and leaves subsequent clicks working. Top-level ARIA labels used by Fuse are
forwarded to the input; an explicit input label wins. Native slot elements do
not receive internal owner-state objects.

Current9/app7 SSR and real Chrome comparisons cover light/dark, RTL,
CSS-variable palettes and the application's compact switch dimensions,
controlled dependent preferences, Hook Form, hydration, refs and native reset.
[Switch measurements](bench/switch/README.md) time prepared SSR trees only;
they do not measure application interactions. This brings the independent
component count to 38; Material remains partial and unreleased.

The four-control and four-labelled-control Switch workloads use 48% and 33%
less Bun time than Material9. The other Bun cases and all Node comparisons
have no established direction beyond process/control variation. These are
local SSR measurements, not interaction or application latency claims.


## Chip

`Chip` covers VentiMath’s remaining Material status/award labels, selectable
contest reasons and tags, navigation badges, and draggable/removable roommate
labels (app main `2cfe38df`). Filled/outlined colors, both sizes, avatars/icons,
custom delete icons, root/label slots, refs and polymorphic roots are supported.
The shared app theme’s sizing, label padding and outlined contrast overrides,
multiline labels and custom badge colors are checked in Chrome.

Click and delete stay separate: Delete/Backspace remove only when the Chip
itself has focus; nested input keys do not remove the Chip. Disabled Chips
cannot invoke deletion, even through keyboard or programmatic icon clicks,
and expose disabled ARIA while retaining the documented focus policy.
ButtonBase now preserves an explicit `aria-disabled` value. Current utility
classes are exported,
not app7’s deprecated compound class aliases. The cancel glyph is public
Material design data; the component behavior is independently written.
The subsequent Avatar unit replaces the earlier unchanged Avatar test control.

The current9/app7 comparisons cover 672 SSR cases, light/dark and variable
themes, RTL, keyboard/click/drag callbacks, disabled behavior, hydration and
node/ref lifetime. [Chip measurements](bench/chip/README.md) use prepared SSR
trees, not application interaction timings. Material now has 39 independent
components; the package remains partial and unreleased.

The prepared eight-Chip SSR workloads use 16–29% less Node time and 23–35%
less Bun time across current9/app7 comparisons. Every process pair shows lower
time beyond the identical-source control spread. Raw samples and source hashes
are retained. These results do not establish a browser or application speedup.


## Avatar

`Avatar` covers UserMenu photos/initials, activity images, roommate Chip adornments
and the avatars inside authentication/coming-soon groups (app main `2cfe38df`).
It supports circular/rounded/square roots, image/initial/person fallbacks,
responsive image candidates, image request attributes, custom slots, refs,
theme overrides and `sx`. Legacy `imgProps` remains supported; `slotProps.img`
takes precedence. AvatarGroup is now independently implemented over this Avatar.

The actual rendered image owns loading and failure state. No separate preload
request ignores the image slot’s referrer/cross-origin policy. Cached failures
are detected after mounting/hydration, source changes retry, and stale requests
cannot overwrite the active photo or update an unmounted avatar. Public Person
SVG geometry is design data; no upstream component implementation is copied.

Current9/app7 SSR and Chrome checks cover theme/RTL/CSS variables, the app’s
36px/13px override, Chip/group composition, missing and changing images, refs,
focus/node identity and hydration. [Avatar measurements](bench/avatar/README.md)
measure prepared SSR trees only. Material now has 40 independently implemented
components and remains partial and unreleased.

Bun SSR uses 18–34% less time across all current/app workloads. Node establishes
19–28% less time for current initial/photo/Chip cases and 22% less for app Chip
composition. The other Node comparisons remain inconclusive under the measured
control variation. These are local SSR results, not app interaction timings.


CircularProgress covers contest results, Mustang exam loading, WARML submission
buttons and roommate activity indicators. It supports current9 determinate
`min`/`max` ranges and the optional track, along with the app's existing sizes,
colors, shared defaults and `sx`. Progress and geometry update on the same DOM
node. Animation uses CSS and respects reduced motion. Invalid finite ranges
and thicknesses throw; values outside a valid range clamp consistently for
both the arc and accessible value, instead of drawing a backwards arc. Explicit
ARIA overrides remain caller-owned. App7's deprecated circle variant classes
are not emitted; its override keys remain supported. These loading indicators
are built and tested; the whole Material dependency remains partial/unreleased.
[Progress measurements](bench/progress/README.md).

The [current application inventory](../../docs/FRONTEND.md) distinguishes built
component scope from the families still blocking a complete Material cutover.


The eight-spinner SSR fixtures use 5–22% less time than current Material on Node
and 16–20% less on Bun. The saving-button composition uses about 14% less than
the app's Material7 control on both runtimes; standalone app-control comparisons
remain inconclusive. These include the shared theme and, for saving buttons,
owned button composition. They do not measure browser frame rate or app latency.


Skeleton covers shared Fuse loading screens, AMC/AIME/Putnam/IMO and other contest
archives/exams, archive search and WARML practice/signup placeholders. Text,
rectangular, rounded and circular shapes support percentage/number dimensions,
`height`, `width`, `sx`, custom roots, theme defaults/overrides and pulse/wave/off
animations. Existing DOM and refs survive size/theme changes and hydration.

Measurement children are inert and hidden, including plain text and zero, so
placeholder content cannot become an accidental action or screen-reader item.
This intentionally strengthens upstream's child-element visibility rule.
Reduced motion stops both pulse and wave. The loading region's announcement is
caller-owned; the skeleton does not invent a status message. The runtime uses
VPM System and its owned styling closure, with React as a peer.
[Skeleton measurements](bench/skeleton/README.md). Material remains partial;
no app dependency or release was changed.


The baseline SSR fixtures use actual archive, signup and Fuse loading prop
patterns. Current-control comparisons are lower on Node and Bun; the Node/app
archive comparison is inconclusive because of control variation. All raw samples
are retained in the linked report. These are server-rendering measurements,
not browser responsiveness or application latency claims.

Container independently implements the responsive page wrapper used by public
results, club articles, contest registration and WARML practice. Its 23 direct
source callers were checked against VentiMath main `ed4b5a05` on November 16,
2026. The contract includes fluid and fixed widths, all standard and custom
breakpoints, disabled gutters, theme spacing/defaults/overrides/variants,
responsive `sx`, custom component roots, refs and hydration. An explicit small
cap stays in force above larger fixed breakpoints. Runtime code is written in
house over VPM System; upstream declarations and black-box rendered output are
comparison fixtures only. [Container measurements](bench/container/README.md)
record SSR costs, not whole-page load or browser interaction speed.

The Container SSR baseline shows 22–32% less time in four Node cases; two Node
comparisons remain inconclusive because the identical-code controls vary too
much. All six Bun comparisons show 36–43% less time. These are synthetic page
wrappers using application props, not application performance measurements.


Card and CardContent are independently written over the owned Paper surface.
The 24 direct Card imports and eight CardContent imports were reviewed at
VentiMath main `7970b7e5` on November 16, 2026: contest exam panels, WARML signup
and practice cards, and public club articles. Astryx Card is separate and is not
counted here. Card preserves clipping, elevation/raised/outlined states, custom
roots/refs, responsive `sx` and the shared Paper/Card theme overrides. Explicit
elevation takes precedence over raised styling. CardContent preserves its 16px
padding and 24px final-child bottom spacing, including live sibling changes and
caller overrides; these design dimensions do not scale with theme spacing.

Current/app comparisons cover light/dark and variable themes, RTL, custom roots,
ref cleanup, stable DOM/focus, hydration and an unchanged upstream CardActionArea
keyboard caller. CardActionArea now has its own independent implementation and
acceptance fixtures below. The whole Material package is still partial and unreleased.
[Card measurements](bench/cards/README.md) record synthetic exam, signup and
practice wrapper SSR costs, not application performance or a speed requirement.

The recorded Card fixtures take 22–31% less SSR time on Node and 33–42% less on
Bun than their current/app controls, with every process pair outside the measured
control spread. These local component measurements do not predict app latency.

## Linked article and exam cards

CardActionArea is independently implemented over the owned ButtonBase. Its two
VentiMath callers at `7970b7e5` are club article links and Math Is Cool exam links.
It preserves their custom `Link`/`FuseLink` root contract, destination props,
responsive `sx`, inherited card rounding and full-width clickable surface.
Pointer hover and keyboard focus use a non-interactive overlay. Current Material
9 slots and slot callbacks, theme defaults/overrides, disabled state, refs,
hydration and stable focused DOM are checked against 9.5.0 and app 7.2.0.

The browser fixture uses a router-shaped anchor, not the full application router.
It also uncovered and corrected ButtonBase's extra `font: inherit` reset: bare
native buttons now match browser typography; styled buttons retain their own
styles. The existing button-family Chrome suite passes with that correction.
[CardActionArea measurements](bench/card-action/README.md) cover synthetic article
and exam SSR, not navigation latency. Material remains partial and unreleased.

## Avatar groups

AvatarGroup is independently written over the owned Avatar. The eight direct
VentiMath callers at `47e3b4ef` are authentication and coming-soon message
sections: four avatars with primary-theme borders. This is a source-use count,
not a claim about route traffic or production bundle membership.

It preserves overlapping order, small/medium/numeric spacing, max/total overflow,
custom surplus renderers/slots, individual variants, theme defaults/overrides,
CSS variables, RTL, roots/refs and stable member DOM. A focused member survives
parent renders and list changes; refs clear when members or the group unmount.
Current 9.5.0/app 7.2.0 SSR and Chrome comparisons, strict types and installed
archives are checked. [Measurements](bench/avatar-group/README.md) cover synthetic
community and overflow groups. Material now has 47 independently built components
and remains partial/unreleased; publication and app adoption are separate.

## Tooltip

Tooltip covers the 16 VentiMath source files that render Material tooltips: navigation
hints, profile-source and role notes, sync warnings and controlled “Copied!” notices.
The app inventory is recorded in PROVENANCE.json; Astryx tooltips are separate.

The implementation owns opening/closing timers, hover and keyboard focus, Escape,
long-press touch, interactive hover, accessible labels/descriptions and trigger ref
composition. It positions portals with VPM Floating UI, including arrows, viewport
flipping, cursor following and document-local mounting. The trigger keeps its DOM
identity and focus during parent updates. Empty titles stay closed; numeric zero
remains valid. Native title text is removed on hover to avoid a second tooltip.

Root/subpath exports, classes, theme defaults/overrides, `sx`, placement and
`slotProps.popper.placement` cover the app. Tooltip/arrow slots and refs are
supported, as are popper containers, `disablePortal` and `keepMounted`. The
default entry/exit is independently designed CSS with reduced-motion handling,
not a Grow implementation. Arbitrary Popper modifiers, the full custom Popper/Grow
contract, and standalone exports for those two components remain outside scope.

Current Material 9.5.0 and app 7.2.0 controls are checked for naming, descriptions,
empty titles, styles, placement, hover/focus/touch, hydration and stable refs/DOM.
Additional checks cover touch cancellation, iframe portal ownership, pending-timer
unmount and custom ref cleanup. Strict declarations and clean npm/Bun archive
installs are checked. [Measurements](bench/tooltip/README.md) cover synthetic
server-rendered navigation hints and copy notices; they do not measure client
positioning or VentiMath page throughput. Material remains partial and unreleased.


## Collapse

Collapse covers VentiMath's seven navigation and contest-preview callers. It
composes VPM's own Transition lifecycle; no upstream Material or transition
runtime is shipped. Closed content stays mounted by default. After entering,
natural sizing accommodates asynchronously loaded math and preview content.

Vertical and horizontal measurement, collapsed sizes, appear/enter/exit callbacks,
mount/unmount options, interruption, end listeners, component/slot refs, theme
styles and `sx` are supported. Current Material's reduced-motion policy works
with the resolved theme, including `system` and `always`, with an explicit opt-out.
Native custom slots do not receive a stray `ownerState` HTML attribute; slot
callbacks receive the transition state.

`timeout="auto"` uses the supplied theme's `getAutoHeightDuration`. Without a
resolved Material transition helper, a separate height-sensitive timing heuristic
is used. The app uses standard timing, and its resolved-theme behavior is checked
against both Material 9.5.0 and the app's 7.2.0. Custom theme creation remains
outside this package's implemented scope.

Node/Bun SSR and declaration checks accompany Chrome lifecycle, measured layout,
focus/child identity, cancellation, reduced-motion and hydration checks, including
fresh package installs. [Measurements](bench/collapse/README.md) cover synthetic
SSR only; they do not measure browser animation frame rates or application speed.


## Dialog structure

DialogTitle, DialogContent and DialogActions cover the app's WARML confirmations
and contact forms, family reminders, external-link confirmation, and settings
panels. Title composes owned Typography with heading semantics, inherited or
explicit IDs, typography props and custom roots. Content owns flexible scrolling,
optional dividers and heading-adjacent padding. Actions preserve native child
buttons and optional inter-button spacing, including wrapping caller layouts.
All three accept theme defaults/overrides, classes, `sx`, DOM attributes and refs.

The internal title context is shared with the independently implemented Dialog.
The original structure-only fixture also uses an upstream Dialog control with
explicit labeling; it is not a runtime dependency. Full Dialog checks now cover
the generated title IDs and modal lifecycle as described below.

Current/app comparisons cover Node and Bun markup, strict declarations, Chrome
light/dark and CSS-variable themes, RTL, narrow screens, stable drafts/focus/scroll,
refs and hydration. [SSR measurements](bench/dialog-parts/README.md) isolate fresh
processes with same-code controls; they do not measure browser opening latency.

Build the dialog measurement fixtures with
`node scripts/mui-material-conformance/dialog-parts-build.cjs` before running
the benchmark commands in the report.


## Dialog

Dialog covers the eleven Material dialog import files in VentiMath: confirmations,
WARML forms, family reminders and the shared settings panels. Astryx dialogs are
separate callers. The implementation composes owned Paper, title context and the
VPM transition engine, sharing document-level overlay ownership with Menu and
Popover. It adds no runtime dependencies.

It supports generated/explicit accessible title IDs, descriptions and dialog or
alertdialog roles; focus containment and restoration; nested menus/dialogs;
background accessibility and scroll ownership; backdrop-drag guards and Escape
close reasons; portals/custom containers; retained content; width/fullscreen and
paper/body scrolling; theme/CSS-variable styles; refs and transition callbacks.
Nested dialogs preserve initial autofocus and return focus to their opener, including
React Strict Mode. Default fade work is cancellable on reversal and unmount. Custom transition slots
and the app's legacy `TransitionComponent` remain supported, as does the app's
`disableEscapeKeyDown` option. Current Material handles that last policy through
`onClose`; both forms remain available here.

Settings-panel Slide wrappers now use the owned Slide implementation in the
VPM fixtures. Standalone Modal, Fade and Backdrop component APIs remain pending. Custom root, container, paper and backdrop slots must forward
native DOM props and refs. This is not a replacement for every Material family.

Current/app browser checks cover layout, themes, RTL, native keyboard navigation,
draft retention, dismissal, nested ownership, transition interruption, iframe
containers and hydration. Node/Bun semantics, strict types and fresh package
installs accompany the [controlled SSR measurements](bench/dialog/README.md).
Build their fixtures with `node scripts/mui-material-conformance/dialog-build.cjs`.
Inline form SSR takes 50.1% less time on Node 24 and 51.8% less on Bun 1.4.4
than the current Material control, beyond the same-code control spread in every
pair. Closed/default-portal SSR produces no visible dialog content; those cases
measure the server-side shell, not a rendered form. These measurements do not
claim faster browser opening or animation frame rates.


## Slide

Slide covers the settings and theme-selection panels, the two direct Material
Slide callers in VentiMath. Both keep their existing Dialog transition shape:
legacy `TransitionComponent` and current `slots.transition`, with direction
selected by the resolved theme, invisible backdrops and responsive fixed paper.
Slide uses the owned transition engine and adds no dependencies or wrapper DOM.

It supports all four physical directions; viewport or element-container edges;
forwarded and child refs; appearance and enter/exit callbacks; timed or custom
completion; mount/unmount options; cancellation on reversal or removal; and the
current reduced-motion policy with explicit opt-out. Closed content follows
viewport and container resizing. Placement uses the child's document, including
iframe viewports. It preserves mounted drafts and focus through parent updates.
The child must accept a DOM ref and forwarded style. Drawer and SwipeableDrawer compose this Slide implementation.

Node/Bun SSR and strict declaration checks accompany Chrome comparisons of
geometry, lifecycle and both settings-panel shapes, including RTL, responsive
widths, reduced motion, interruption, refs, iframe ownership and hydration.
[Controlled SSR measurements](bench/slide/README.md) compare closed, appearing
and already-open children with a resolved CSS-variable theme provider and
synthetic settings content. Current-control SSR takes 27.6–29.2% less time on
Node 24 and 37.8–42.0% less on Bun 1.4.4, beyond the same-code control spread
in every comparison pair. These are composition measurements, not isolated
Slide operation costs, browser frame rates or opening latency. Build fixtures with
`node scripts/mui-material-conformance/slide-build.cjs` before benchmarking.

## DialogContentText

DialogContentText covers the external-link confirmation, WARML opt-out message
and FuseDialog documentation example. It composes owned Typography with a paragraph
root, body text and secondary palette color. Typography props, custom roots,
refs, theme defaults/overrides, CSS-variable colors and sx remain available.
The caller supplies the description ID and Dialog's aria-describedby association.

Current/app comparisons cover light/dark, RTL, responsive layout, custom styling,
stable DOM/ref ownership, accessible dialog descriptions and hydration. Upstream's
duplicate root-class token is emitted once; class membership is unchanged. The
existing legacy Typography paragraph behavior remains available for app callers.
The full Material package is still partial and unreleased.

[Description measurements](bench/dialog-text/README.md) compare single-description
and confirmation-structure SSR. They include Typography, theme and styling costs;
they are not measurements of browser interaction or assistive-technology latency.


## Drawer

Drawer covers VentiMath's permanent desktop sidebars in `FusePageCardedSidebar`
and `FusePageSimpleSidebar`: left/right placement, custom root and paper classes,
and the paper width set through `sx`. It also provides persistent and temporary
panels, the foundation used by SwipeableDrawer for mobile sidebars. This partial
package is not ready for a whole-app override.

The implementation composes owned Paper and Slide with the private modal behavior
shared with Dialog. It adds no dependency. It supports all four edges and RTL,
resolved theme defaults/overrides, elevation, portal containers, `keepMounted`,
focus containment/restoration, topmost Escape dismissal, guarded backdrop clicks,
scroll ownership, current slots and legacy `PaperProps`, `SlideProps` and
`ModalProps`. Current root slot options take priority over legacy modal options.
Native/custom roots preserve refs and application content across ordinary rerenders.

Current Material 9 utility classes and temporary-paper dialog semantics are the
default. App 7's retired paper-anchor classes and upstream focus sentinel elements
are not emitted; direct document-local keyboard handling preserves focus behavior.
Unlike the current 9.5.0 control, the legacy `disableEscapeKeyDown` flag remains
effective, preserving app 7 behavior. Current callers can also veto dismissal in
`onClose`. The owned theme's reduced-motion policy also applies to panel/backdrop transitions.
A custom transition must forward its ref and complete the enter/exit callbacks.

Comparison fixtures cover current Material 9.5.0 and app 7.2.0 server output,
four-edge geometry, light/dark and CSS-variable themes, RTL, retained field state,
keyboard access, nested Dialog ownership, iframe portals and permanent-panel
hydration. Checks use synthetic content, not live navigation writes.

[Drawer measurements](bench/drawer/README.md) include the resolved-theme provider
and server rendering of each panel variant with retained input/button content.
Temporary panels use `disablePortal` to measure real output, rather than an empty
server portal. These are composition costs, not browser animation or app latency.
Build fixtures with `node scripts/mui-material-conformance/drawer-build.cjs` before
running `bench/drawer.cjs`.

The recorded permanent-sidebar cases take 28–37% less time on Node 24 and
29–32% less on Bun 1.4.4 against current/app controls, beyond their recorded
control spread. Current Material 9 persistent/temporary Node medians are lower,
but noisy identical-source controls leave those two directions unestablished.
All raw samples, including the noisy controls, are retained in the report.


## SwipeableDrawer

SwipeableDrawer covers the app's shared mobile navigation, page sidebars,
notification and quick panels. These callers use left/right temporary panels,
`disableSwipeToOpen`, no-op `onOpen`, controlled close callbacks, scrollable
children and default or explicit `ModalProps.keepMounted`. Their custom classes,
paper widths, themes and refs continue through the owned Drawer.

The gesture controller is independently written. It supports four edges and RTL,
distance and fling thresholds, optional edge discovery/opening, swipe area slots,
child-scroll arbitration, cancelled/multiple touches, retained drafts and parent
refusal of an open/close request. It observes the paper's own document, limits one
active drawer gesture per document and respects newer modal overlays. Idle panels
have only passive touch-start listeners; scroll-blocking listeners exist only
while considering a gesture. They and completion timers are removed on cleanup.
`disableBackdropTransition` disables the fade as well as gesture opacity updates.
Reduced-motion timing uses the owned theme policy.

Current slots and the legacy `SwipeAreaProps`/Drawer prop forms are available.
Paper refs remain usable during swipes. The pinned Material 9.5.0 control loses
swipe behavior with an external paper ref, so its touch comparison uses no such
ref; VPM is tested with the ref present. Retired app7 classes and sentinel nodes
follow Drawer’s documented differences. This package does not promise identical
finger-tracking curves or physics; compatibility checks cover outcomes, geometry,
scrolling, focus, callbacks and retained nodes.

Edge opening relies on retained paper content (the default). The app disables
edge opening; `keepMounted:false` is supported for ordinary controlled panels
but is not a verified edge-opening combination. Native Chrome touch checks do
not establish physical iOS/Safari or Android device acceptance. No app switch or
whole-Material release is claimed.

[SwipeableDrawer measurements](bench/swipeable-drawer/README.md) cover resolved-theme
SSR for the three variants with inline content. They do not measure touch frame
rates or input latency. Build `scripts/mui-material-conformance/swipeable-drawer-build.cjs`
before running the package benchmark.

In these local SSR fixtures, elapsed time is 31–52% lower on Node 24 and 29–47%
lower on Bun 1.4.4 across current/app controls. Every comparison pair is beyond
the identical-source control spread. These are server-rendering measurements,
not claims about swipe responsiveness or production application speed.

## Tables

Table, TableHead, TableBody, TableFooter, TableRow, TableCell and TableContainer
cover VentiMath’s direct results and score grids. Table provides size, padding
and sticky-header defaults; sections determine cell semantics. Header cells use
`th`/`scope="col"`, explicit row headers preserve `scope="row"`, and
`sortDirection` exposes native `aria-sort`. Sorting itself stays with the caller.
Nested tables reset their own context. Rows support selected and hover styles;
containers provide horizontal overflow and can compose Paper.

All seven support refs, custom roots, utility classes, resolved theme defaults,
overrides, CSS variables, RTL and `sx`. Custom section/row roots receive table
roles. Synthetic caller checks cover compact sticky score grids, keyboard
sorting, retained row/input/focus identity, scrolling, hydration and accessibility.
The current Material 9.5.0 and app 7.2.0 controls agree on the verified contracts.
These seven are part of the 78 independent components; Material is still partial;
TablePagination and remaining families are still separate work. TableSortLabel and
numbered Pagination are now implemented below.

[Table SSR measurements](bench/tables/README.md) use twenty-row synthetic results,
coach scores and themed tables. These do not measure browser sorting throughput.
Build `scripts/mui-material-conformance/tables-build.cjs` before benchmarking.

Table color computations are bounded by primitive inputs, utility-class assembly
avoids intermediate arrays, and fixed cell declarations use CSS fragments instead
of reconstructing style objects. Theme typography, defaults, `sx`, live overrides
and in-place palette changes remain supported. The first color-cache pass is
retained in [earlier measurements](bench/tables-optimized/README.md).

[Final Table measurements](bench/tables-fragments/README.md) put current Material9
comparisons within the control spread on both runtimes. Against app Material7,
Node still uses 10–18% more time and Bun's results-table case uses 5.3% more, down
from 32% in the first optimization pass. These are SSR fixtures; complete
performance parity and application latency improvements are not claimed.

## Autocomplete

The independent Autocomplete covers WARML school entry (multiple/free-solo),
practice and profile student selectors, ARML's View as field and the Hook Form
example. It composes the owned TextField input, Chip, Paper and IconButton
foundations, with Floating UI placement in the input's owner document. It adds
no upstream runtime dependency. Material now has 78 independent components.

Value, input text and popup state can be controlled separately. Supported
behavior includes string/object options, custom labels/equality/disabled options,
accent/case filtering, free-solo creation, multiple removable tags, localized
loading/empty text, grouping, refs, theme overrides and `sx`. Input focus stays
on the combobox while active-descendant navigation selects options; IME Enter
does not commit a partial word. The app-shaped checks cover Hook Form updates,
reset/focus, changing option lists, clearing, read-only/disabled state, native
keyboard selection, popup alignment, stable input nodes and hydration.

The current9/app7 controls agree across 960 SSR/filter comparisons. Chrome tests
compare light/dark, CSS-variable and RTL themes, including the shared compact
Autocomplete overrides. One intentional current-API difference: a controlled
free-solo field with a newly typed value does not reopen an unrelated full list,
where app7 does. This follows Material9. The exported API is the documented
application subset: mapped `getOptionValue`, virtualization and standalone
`useAutocomplete` are not supplied. This does not make the entire Material
package ready for an application override.

[Autocomplete measurements](bench/autocomplete/README.md) compare eight empty,
selected and multiple-school fields. They measure SSR, not typing latency.

The first isolated Autocomplete measurements do not establish a speed difference
beyond same-code controls on Node 24 or Bun 1.4.4. All process samples are retained;
functional independence and caller correctness are the demonstrated result.


### Table sorting and numbered pagination

`TableSortLabel`, `PaginationItem`, `Pagination`, and `usePagination` are independently
implemented against Material 9.5.0, with comparisons against the app’s 7.2.0 API.
VentiMath’s math-resources and contest-season tables use these through their shared
DataTable and Material React Table. Browser checks mount the existing VPM table
pagination caller, including its one-based page labels and zero-based table state.

The controls support native keyboard activation, controlled and uncontrolled page
state, bounded sibling/boundary windows, first/last/previous/next controls, translated
labels, custom item renderers and link roots, current-page accessibility, RTL icons,
resolved theme defaults/overrides, CSS-variable themes, sizes, colors and shapes.
Changing parent state preserves focused page nodes. Hydration, refs and cleanup are
checked in Chrome with production and development React.

The page-window hook rejects invalid fractional, negative or nonfinite counts and
window sizes, instead of constructing invalid ranges. Disabled and ellipsis hook
callbacks remain inert even when called directly. Navigation icons use independent
SVG geometry. Material 7’s deprecated icon/color class aliases are not reproduced;
current utility classes and caller-provided classes are retained. Ellipsis roots
preserve caller attributes rather than discarding them.

[Navigation SSR measurements](bench/navigation/README.md) compare eight sort labels
or eight paginators per render, using separate workers and same-code controls.
These measurements do not measure browser interaction speed. Build
`scripts/mui-material-conformance/navigation-build.cjs` before benchmarking.
Material remains partial; these controls do not constitute a whole-package release.

The recorded Bun medians are 23–27% higher for text pagination and 51–54%
higher for outlined pagination. On Node, outlined pagination against app Material
7 is 39% higher; the other Node directions are unestablished under the recorded
control spread. Each case renders eight controls. These are measured SSR costs,
not a browser speed claim; performance follow-up remains without relaxing the
behavior or theme checks.


### LinearProgress

Independent `LinearProgress` covers ARML traveler-grid loading, WARML seat capacity
and the adopted Material React Table loading indicator. It supports determinate,
buffer, indeterminate and query modes, current `min`/`max` ranges, standard/custom
palette colors, inheritance, RTL, resolved themes and CSS-variable tokens, class
hooks, `sx` and forwarded refs. CSS animations have no JavaScript timers; value and
theme updates retain the progress nodes. The default-root contract remains a span.

Current Material 9.5.0 and app 7.2.0 are compared separately. The current contract
preserves fractional accessible values and supplies range ARIA for buffer mode;
7.2.0 rounds determinate values and lacks buffer ARIA. Deprecated Material 7 bar
class aliases are not emitted. Existing legacy style-override keys are accepted.
Invalid nonfinite/reversed ranges throw, out-of-range values clamp to the range,
and an omitted value defaults to the minimum. Reduced-motion loading remains
visible without movement; determinate value transitions stop under that preference.
These explicit differences are checked without weakening the ordinary comparisons.

The test fixture mounts unchanged `MRT_LinearProgressBar` and its real VPM table
hook using synthetic records. It verifies both loading flags, capacity updates,
accessible names, retained DOM/focus, refs, hydration and reduced motion in Chrome.
Animation timing/geometry and palette values are public rendering/design data;
the component runtime is independently written.

[LinearProgress SSR measurements](bench/linear/README.md) render eight loading,
capacity or buffer bars per operation. Build `linear-build.cjs` in the Material
conformance fixture before running the isolated Node/Bun harness. This does not
measure browser animation speed. Material now has 78 independent components and
remains partial; this is not a whole-package release or app cutover.

The recorded SSR cases take 28–70% more time than Material 9.5.0 on Node and
53–81% more on Bun. Against the app's 7.2.0 control the ranges are 12–60% and
37–70%, respectively. These are measured rendering costs, not a speedup claim;
reducing them without changing the verified behavior remains follow-up work.


### Alert and AlertTitle

Independent notices cover ARML traveler/preferences/highlight messages, WARML
capacity/room notices, public club-article failures and the adopted table's
selection/error banner. Standard, outlined and filled variants support severity
icons independent from color, light/dark and CSS-variable palettes, custom colors,
RTL, theme defaults, `sx`, class hooks, Paper roots and current slots/slot props.
Titles compose owned Typography; close buttons compose owned IconButton.

Actions take priority over the close callback, including explicitly supplied
`0` or `false`. Close labels are localizable, decorative icons remain hidden from
assistive technology, and keyboard activation sends the caller callback without
silently removing the alert. Root and slot refs compose and clean up on unmount;
unchanged renders and hydration retain nodes and focus.

The outline icons are independently drawn and intentionally not pixel-identical.
Current utility classes are emitted; the app's older `standardInfo` and related
severity style-override keys remain supported even though Material 9 no longer
applies them. The comparison uses equivalent current root callbacks for shared
styling, with separate regression and app-control browser coverage for the legacy keys. SVG geometry and
the already-documented empty SSR ripple placeholder are excluded from markup
comparisons; roles, labels, slots, content and classes remain compared.

The Chrome fixture mounts the unchanged `MRT_ToolbarAlertBanner` and its real VPM
table hook, testing row selection, clearing and explicit error banners. It also
checks app-shaped notices, action/close callbacks, styles, accessibility, focus,
refs and hydration in production and development. Synthetic records only;
application adoption and Safari/Firefox acceptance remain separate.

[Alert SSR measurements](bench/alert/README.md) compare eight notices, titled
notices or dismissible notices per operation. Build `alert-build.cjs` first.
Material now has 78 independent components and remains partial.

Most recorded timing directions are unestablished at this precision. The
established regressions are titled notices versus Material 9 on Bun (8.1%) and
dismissible notices versus app Material 7 on Node (12.7%) and Bun (20.1%). All
processes, outliers and same-code controls are retained; no speedup is claimed.


### Badge

Independent `Badge` covers the reading-list toolbar count. It composes with the
owned Tooltip, IconButton and SvgIcon, without changing the app's dependency pins.
Supports numeric/text content, max caps, explicit/zero/missing-content hiding,
showZero, dots, rectangular/circular overlap, partial anchors, standard/custom
palette colors, theme defaults/overrides, `sx`, polymorphic roots, current slots
and merged root/slot refs. Astryx Badge callers are separate.

The last committed visible content and visual props remain while the badge scales
out. Abandoned renders do not replace that snapshot. Count updates preserve the
button, badge nodes, keyboard focus and refs; hydration retains the server nodes.
Reduced-motion preference disables show/hide transitions. Forced-colors mode
retains a visible border.

The marker follows Material 9's `aria-hidden` default and explicit physical
anchor placement in RTL. Callers can override marker ARIA and should label the
surrounding control meaningfully. The browser fixture checks a reading-list
button with its current item count in the accessible name. Material 7 lacks this
marker ARIA default and its RTL stylesheet mirrors the anchors; that difference
is tested separately, not treated as byte-for-byte compatibility. Insets and
translations use current CSS variables; declarations and class maps match the
current contract. Screens, counts and menu contents are synthetic.

[Badge SSR measurements](bench/badge/README.md) cover eight count/dot badges or
reading-list-shaped icon buttons per operation. Build `badge-build.cjs` first.
Material has 78 independent components and remains partial.

Against Material 9, count rendering takes 20% more Node time; dot and button
directions are unestablished. Bun takes 11–16% more time in all three cases.
Against app Material 7, Node takes 14–33% more time, and Bun's button case takes
19% more; its other two directions are unestablished. These isolated SSR
measurements retain every process and same-code control. They do not measure
browser interaction or establish a whole-app regression.

### ListItemButton

Independent `ListItemButton` covers Fuse horizontal navigation, vertical tabs and
sidebar links. It composes the owned ButtonBase and list context: native and
router roots, href/to, keyboard activation, focus-visible hooks, autofocus,
disabled/selected states, inherited density, alignment, gutters/dividers, theme
defaults/overrides, RTL and `sx`. Ref cleanup, stable focused nodes and hydration
are verified in production and development builds. The router fixture uses a
synthetic anchor adapter; it does not migrate the application's routes.

Dense ListItemText now puts its dense class only on its root, matching both
controls. Current Material uses a 36px icon minimum and suppresses programmatic
clicks on disabled roots; app Material 7 used 56px and allowed the latter on
non-native roots. These differences are asserted separately. Colors are compared
as rendered sRGB pixels, since equivalent relative-color and rgba spellings can
differ. The app's 6px/8px padding and 24px icon override are also checked.

[ListItemButton SSR measurements](bench/list-button/README.md) cover eight
navigation links, dense items or icon/text items per operation. Material remains partial while work on other families and the theme factory continues.

Node link/icon SSR takes about 21–28% more time than Material 9; links take 22%
more than app Material 7. The other Node comparisons and every Bun direction
are unestablished at the recorded control spread. All raw process samples are
retained. This measures server rendering, not navigation latency or browser paint.

AppBar and Toolbar cover
shell headers/footers, palette settings and messenger toolbars at app `d0a71aaf`.
AppBar composes owned Paper with square/elevation defaults, five position modes,
fixed-position print behavior, semantic roots and palette colors. Toolbar owns
responsive gutters, dense/regular sizing and the resolved theme's toolbar mixin.
Dark/CSS-variable themes, RTL, app default props, 48px/40px theme overrides,
caller classes and `sx`, refs, focus retention and hydration are checked against
Material 9.5.0 and the app's 7.2.0 control. Theme creation remains outside this
partial component package. [AppBar/Toolbar measurements](bench/bars/README.md).

With `color="inherit"`, VPM follows current Material 9 and inherits its parent
text color. App Material 7 retains the Paper text color instead. The browser
comparison asserts this specific version difference rather than ignoring color
differences generally. The observed app shell passes explicit theme text colors.

The new eight-element AppBar/Toolbar SSR measurements take **18–32% more time
on Node** and **21–43% more on Bun** than the two upstream controls. Every pair
shows the increase beyond the identical-source control spread. This work adds
owned component coverage; it does not establish a rendering speedup. The raw
samples and source hashes are retained in the linked report. Browser interaction
and application response times were not benchmarked.

### Accordion summary and details

AccordionSummary and AccordionDetails cover the button and content layout used by WARML information, HMMT
results and public article policy notices. Summary composes owned ButtonBase;
Details supplies themed spacing and the native content root. Expansion,
disabled state and gutters come from the family's private context. Summary
supports content/icon/root slots, callback slot props, forwarded/slot refs,
keyboard focus/activation, classes, resolved themes and sx. Details forwards its
DOM props and ref. Parent re-renders preserve the button, focus and input nodes.

The target is Material 9.5.0. Material 7.2.0 is a separate app comparison and
emits the removed `MuiAccordionSummary-contentGutters` class; this implementation
uses the current classes. Native keyboard, disabled traversal, toggle/click
order, theme/RTL/CSS-variable styles, app compact spacing, slots, refs and
hydration are checked in production and development Chrome. See
[checks](../../scripts/mui-material-conformance/README.md) and
[measurements](bench/accordion-parts/README.md).

### Accordion

Accordion composes Paper, Collapse, AccordionSummary and AccordionDetails. WARML
opens its information panel by default. HMMT uses compact panels around result
tables. The club article policy banner customizes corners, elevation, divider
visibility and spacing. The summary controls expansion and supports keyboard
activation. A controlled panel reports the requested state through `onChange`
and waits for the caller to update `expanded`. Supplied summary IDs and
`aria-controls` link its heading to the region. Detail content stays mounted by
default and can opt into `unmountOnExit`.

Material now covers 78 independently built components. The full package override
still requires the remaining app-used components and theme factory.
[Accordion measurements](bench/accordion/README.md).


### Tab and Tabs

The IMO results page uses positional values for its icon tabs. Its official-site tab can handle a click or Enter while the current results panel stays selected. The family growth page selects by learner ID, including when a learner label changes or the list is reordered. Both use the app theme’s full-height selection indicator.

Fixed and full-width layouts support horizontal and vertical orientation, RTL keyboard navigation, disabled tabs, and optional selection on focus. Scrollable strips and scroll buttons remain outside this implementation. The package follows Material 9’s server markup for a strip with no selection. Both app callers supply a selected value. [SSR measurements](bench/tabs/README.md) · [Conformance](../../scripts/mui-material-conformance/README.md#tab-and-tabs)


### Breadcrumbs

VentiMath’s shared PageBreadcrumb uses a labelled navigation landmark, router links and a four-item collapse threshold. A long trail keeps its first and last links and exposes a “Show path” button. Keyboard activation reveals the hidden links and moves focus to the first link. The app controls the crumb text, including stored names and translated labels.

The component supports theme-defined separators and spacing, explicit leading and trailing counts, custom list classes, and a localized expansion label. It retains the app’s Material 7 palette-path color. Material 9 inherits the surrounding text color for that input. [Benchmarks](bench/breadcrumbs/README.md)

### Snackbar and SnackbarContent

The club article share menu announces “Link copied to clipboard” with a two-second auto-hide timer. The timer survives parent renders, pauses during interaction or window blur, and resumes with half the original duration by default. The controlled parent receives a close reason for a timeout, an outside click or Escape. The alert supports a message, an optional action, six anchor positions and a custom child. Transition and click-away slot substitution are outside the verified surface. [SSR measurements](bench/snackbar/README.md)

### Stack

ARML highlights use a wrapping, center-aligned row. WARML team shortcuts switch from a column to a row with CSS gap, and Math Is Cool uses sibling margins at the same breakpoint. Material Stack delegates these layouts to VPM System and resolves the Material theme’s defaults and style overrides. The app’s Material 7 direct props such as `alignItems` and `flexWrap` continue to work. Material 9 accepts those styles through `sx`.

An unspaced Stack preserves its children’s margins. Resizing across a breakpoint keeps the focused contest link in place. [SSR benchmarks](bench/stack/README.md)

### Grid

The IMO archive uses `Grid` for nine loading placeholders and the year cards. Both use one column on phones, two on small screens and three on wider screens. The Material wrapper shares the layout implementation with VPM System. Direct nested containers inherit spacing and columns, and an intervening element starts a new grid. The root and container support separate theme overrides. [Server-rendering benchmarks](bench/grid/README.md)

### Rating

WARML practice signup uses one five-star control for each practice time and relay position. The controls have independent radio groups, accessible labels, arrow-key navigation, pointer previews and click-to-clear. Both star icons use a VPM-drawn outline. Clearing calls `onChange(event, null)`, which the signup translates to zero. Whole-star steps, controlled values, defaults, disabled and read-only displays are supported. Fractional precision and custom component slots remain outside this implementation. [Server-rendering benchmarks](bench/rating/README.md)

### GlobalStyles

The default component and its `GlobalStylesProps` type are available at
`vmui-material/GlobalStyles`. Theme callbacks receive the active Material theme.
The seven VentiMath callers use nested navigation rules, sticky page toolbars,
shell colors, responsive navbar widths, public layout overrides and CSS variables
inside an iframe. An Emotion cache targeting the iframe head keeps its sheets
in that document and removes them on unmount.

The application comparison runs the original styles expressions in light and
dark themes and both scrolling modes. Generated CSS matches the app control
apart from its extra `-webkit-print-color-scheme` declaration. The standard
`color-scheme` and every generated theme variable are preserved.

[Server-render measurements](bench/globals/README.md)

### ClickAwayListener

Toolbar search and the style-2 navigation panel use this component to dismiss
on an outside click. It preserves the child's DOM node, ref and handlers.
React portals count as inside by default. Set `disableReactTree` for DOM-only
containment. Mouse, pointer and touch events can be configured independently.
Subscriptions attach to the child's document and are removed on unmount.

Chrome comparisons cover the opening click, portaled results, touch scrolling,
scrollbar clicks, iframe isolation and React 19 callback-ref cleanup.
[Event dispatch and server-render measurements](bench/click-away/README.md)

### Grow

The two horizontal navigation menus use Grow to open their Paper panels from
the top-left. The component retains the child and its handlers while animating
opacity and scale. Automatic duration comes from the measured panel height.
Explicit timeouts, completion callbacks, reduced-motion themes and unmount-on-exit
are supported. A direction change cancels the preceding completion timer.

Chrome checks cover hydration, callbacks, theme timing and interrupted menus.
On exit VPM follows Material 9 and clears the finished transition declaration.
The app’s Material 7 control leaves that declaration on the hidden panel.

[Mounted transitions and server rendering](bench/grow/README.md)

## Popper

The toolbar’s basic and full search layouts use a portaled panel for both suggestions and the no-results message. Popper uses VPM Floating DOM to anchor the panel, flip it at a viewport edge, and follow scroll and size changes. The search field keeps focus and the panel retains its DOM node as suggestions change. Anchors inside an iframe use that document’s body by default.

The supported interface includes explicit side placements, element or virtual anchors, custom portal containers, inline and retained mounting, root refs, theme defaults and `sx`. The app supplies the panel width and the listbox semantics. Custom Popper.js modifiers, its instance API and transition slots are outside the verified search contract.

The browser suite exercises the app’s two JSX renderers against Material 7.2.0 and 9.5.0. Server rendering defers DOM anchor callbacks until mount. [Benchmark results](bench/popper/README.md)

## Slider

VentiMath’s toolbar uses one thumb and seven labeled stops from 70% to 130%. Slider supports its controlled value, marks-only stepping, hidden track, label classes, theme color, rail and thumb overrides. Keyboard changes commit after the controlled state updates, so the page font size follows the first arrow press. Home and End select the endpoints. A canceled pointer gesture produces no commit.

The supported scope is a horizontal scalar slider with explicit marks or a numeric step and value labels off. The browser fixture exercises the toolbar’s React change and commit callbacks, pointer dragging, keyboard interaction, focus, disabled state and right-to-left navigation. [Benchmarks](bench/slider/README.md).

## WARML registration steps

Stepper, Step and StepLabel support the WARML interest form’s three- and six-step layouts. The registration form supplies the translated labels, role, active index and spacing. The components display numbered, active, completed and disabled steps, apply the app’s theme to icons and connecting lines, and preserve keyed steps when the role changes. The current item in the ordered list carries `aria-current="step"`.

The public surface includes linear and non-linear flow, explicit step state, horizontal and vertical orientation, alternative labels, optional label content, an optional connector, refs, classes and `sx`. The default number, checkmark and connector are internal. StepButton and custom StepLabel slots remain outside this registration contract. Material 9 supplies ordered-list semantics, while the app’s Material 7 renders generic containers.

[Node and Bun measurements](bench/steps/README.md).

## Academy step content

The Academy sidebar sets `expanded` on every course step. Each subtitle stays visible and keeps its DOM node when a learner picks another lesson. The owning Step handles the click, including clicks on future subtitles. The app owns the selected lesson and its progress rules.

StepContent follows the parent’s active, expanded and last flags. It uses VPM Collapse for automatic height and unmounts inactive content after exit by default. It supports root refs, theme styles, classes, `sx`, transition timing and the current transition slot. Chrome checks cover the app’s subtitle clicks, theme spacing, borders, keyed reordering and interrupted transitions.

[SSR and mounted navigation measurements](bench/step-content/README.md).

## Toolbar list rows

ListItem provides the semantic list rows for events and notes and positions each quick-setting switch next to its label. Rows inherit list density and support padding, dividers, alignment, refs, theme defaults and style overrides. The current secondary-action slot adds its own utility class alongside the Material 7 class. [Benchmarks](bench/list-item/README.md).

## App theme baseline

CssBaseline styles the document through GlobalStyles in the active Emotion cache. It follows the Material theme for typography, background, bold text, print and fullscreen. The optional color scheme follows either the palette mode or the theme’s CSS-variable selectors. The app mounts it above the page contents in the `mui` cascade layer. [Baseline measurements](bench/css-baseline/README.md).

## Theme color helpers

Import `alpha`, `darken`, `decomposeColor`, `emphasize`, `getContrastRatio`, `getLuminance`, `hexToRgb`, `hslToRgb`, `lighten`, `recomposeColor` and `rgbToHex` from `vmui-material/styles`. They share the implementation and declarations in VPM System.

At app commit `aa110e55`, the unchanged palette contrast function produced the same six roles and secondary text as Material 7.2.0 for all 37 presets and a custom translucent-text case. The checks cover both page backgrounds, button fills in normal and dark states, preservation of light shades, and the app’s 4.5 threshold. Theme construction in this comparison uses the app’s Material control. [Measurements](bench/colors/README.md).

## Palette creation

`vmui-material/styles/createPalette` resolves palette options into the six standard color roles, light/dark surface defaults, text and action colors, grey shades, contrast text and augmentation callbacks. It preserves custom fields and nested overrides. Inputs and separate palettes retain independent mutable state.

All 37 VentiMath presets at `aa110e55` match the app’s Material palette before and after the unchanged readability pass. Synthetic cases compare Material 7.2.0 and 9.5.0. Current native color mixing is also supported through `colorSpace`. Explicit zero light/dark offsets retain the original shade. Invalid modes and missing main colors throw descriptive errors.

This is the palette stage of the theme factory. The Material `createTheme` entry now assembles this stage with the app-used theme settings. The app integration check supplies VPM-created palettes to the existing contrast logic. [Measurements](bench/palette/README.md).

## Typography creation

`vmui-material/styles/createTypography` resolves the type scale from palette and typography options. It supports font weights/family, base and HTML font sizes, `pxToRem`, palette callbacks, all-variant settings, named variants and nested responsive overrides. Nested input objects and variant overrides remain independently mutable.

The actual VentiMath settings at `aa110e55` match Material 7.2.0 and 9.5.0, including the Geist-first font stack, 13px base and explicit body sizes. All 14 variants render equivalently through the app’s Typography consumer. Both module formats and packed installs are checked. The Material theme factory now uses this type scale.

[Measurements](bench/typography/README.md) include the app setup and synthetic responsive overrides. The app scale is faster on Bun and slower on Node. Isolating nested responsive settings adds overhead in both runtimes.

## Transition creation

`vmui-material/styles/createTransitions` creates easing and duration settings,
CSS transition lists and automatic height timings. Scalar or array properties,
numeric or CSS-string times and caller overrides match Material 7.2.0 and 9.5.0.
The factory supplies the default theme used by the owned components; the assembled
Material theme uses these settings. As in Material 9, automatic height
timing caps at 3 seconds and the legacy `reducedMotion` input is not retained.

The contract evaluates VentiMath’s unchanged page-margin, side-panel and toolbar
expressions, tests timing over 20,000 heights, and checks settings isolation.
Packed installs exercise the existing Collapse, Slide and Grow browser checks.
[Measurements](bench/transitions/README.md) show faster formatting and a small
settings-creation cost; they do not measure whole-page performance.


## Theme assembly

`createTheme` is available at the root, `styles`, and `styles/createTheme`.
It assembles the owned palette, typography, transitions, System breakpoints and
spacing, shadows, z-index, toolbar mixin, component defaults and nested overrides.
CSS-variable themes include channel/semantic palette tokens, per-scheme opacity
and dark overlays, font variables, custom prefixes, selectors and generated
stylesheets. Plain themes retain numeric spacing; CSS themes use their spacing
variables. The default theme used by the owned components now uses this factory.

VentiMath main `697e53db` supplies 37 presets through its existing contrast and
border-mixin passes. All 222 combinations of preset, direction and prefix match
the unchanged application flow on Node and Bun. Twenty-two synthetic contracts
also compare Material 9.5.0 and the app's 7.2.0 behavior, including variable
generation and input isolation. The shadows and z-index defaults are observable
design-token data; implementation code is independently written.

This covers VentiMath's current theme-building pipeline. Native CSS color-space
theme generation (`cssVariables.nativeColor`) and upstream's full theme-management
surface are outside this scope. Remaining Material component families are still
in progress. [Theme measurements](bench/theme/README.md).
