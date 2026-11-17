# vmui-material

Independent Material UI **9.5.0** controls over VPM System, targeting the components VentiMath uses. **This package is partial:** it implements ButtonBase, Button, IconButton, Fab, ButtonGroup, ToggleButton, ToggleButtonGroup, Typography, Link, SvgIcon, Box, Paper, Divider, Icon, FormControl, FormLabel, FormHelperText, InputBase, Input, OutlinedInput, InputLabel, InputAdornment, TextField, List, MenuItem, MenuList, ListItemIcon, ListItemText, ListSubheader, Menu, Popover, Select, Checkbox, FormControlLabel, Radio, RadioGroup, FormGroup, Switch, Chip, Avatar, CircularProgress, Skeleton, Container, Card, CardContent, CardActionArea, AvatarGroup, Tooltip, Collapse, DialogTitle, DialogContent, DialogActions, Dialog, Slide, DialogContentText and Drawer, plus `createSvgIcon` and the resolved-theme bridge. It is not a replacement for the whole `@mui/material` dependency yet.

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


The menu foundation adds List, MenuItem, MenuList, ListItemIcon, ListItemText,
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
The child must accept a DOM ref and forwarded style. Drawer composes this Slide implementation; SwipeableDrawer remains pending.

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
panels, the foundation needed for the mobile sidebars. **SwipeableDrawer is not
implemented yet**, and this partial package is not ready for a whole-app override.

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
