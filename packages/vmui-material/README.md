# vmui-material

Independent Material UI **9.5.0** controls over VPM System, targeting the components VentiMath uses. **This package is partial:** it implements ButtonBase, Button, IconButton, Fab, ButtonGroup, ToggleButton, ToggleButtonGroup, Typography, Link, SvgIcon, Box, Paper, Divider, Icon, FormControl, FormLabel, FormHelperText, InputBase, Input, OutlinedInput, InputLabel, InputAdornment, TextField, List, MenuItem, MenuList, ListItemIcon, ListItemText, ListSubheader, Menu, Popover, Select, Checkbox, FormControlLabel, Radio, RadioGroup, FormGroup, Switch and Chip, plus `createSvgIcon` and the resolved-theme bridge. It is not a replacement for the whole `@mui/material` dependency yet.

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

Current application priorities (reviewed at `3aa9eb28`, November 13, 2026): Material remains in shared theme/navigation, authentication, public pages and table components while many feature pages use Astryx. A static non-test source inventory found Typography imports in 164 files, Box in 99, styles in 88, Paper in 43 and Divider in 15. These are import counts, not route reachability or adoption percentages. The Box/theme boundary and SVG sprite root are covered. Paper, Divider and the Icon fallback are also covered. The shared FormControl/FormLabel/FormHelperText foundation is covered; InputBase is now covered too; Switch is now covered; the table’s remaining Material peers are still pending. A complete app cutover requires those callers, including dependencies’ imports, to pass together.

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
Avatar is an unchanged test control and remains a separate pending component.

The current9/app7 comparisons cover 672 SSR cases, light/dark and variable
themes, RTL, keyboard/click/drag callbacks, disabled behavior, hydration and
node/ref lifetime. [Chip measurements](bench/chip/README.md) use prepared SSR
trees, not application interaction timings. Material now has 39 independent
components; the package remains partial and unreleased.

The prepared eight-Chip SSR workloads use 16–29% less Node time and 23–35%
less Bun time across current9/app7 comparisons. Every process pair shows lower
time beyond the identical-source control spread. Raw samples and source hashes
are retained. These results do not establish a browser or application speedup.
