# Material component conformance

The independent button, typography, link and SVG icon components target Material 9.5.0 and the APIs used by VentiMath's app-pinned 7.2.0. Controls and React 19.3.1 are locked in the sibling [System fixture](../mui-system-conformance/README.md); no additional dependency tree or vendored upstream implementation is created. The full VPM styling closure is used on the candidate side. Application source is inspected locally, while committed examples use synthetic contest/navigation controls.

- `contract.cjs`: 72 comparisons of native, link and custom-root semantics, disabled accessibility, button types and selection attributes against both controls, on Node and Bun.
- `text-contract.cjs`: 182 text/link/icon markup and accessibility comparisons against both controls, including SVG child geometry and custom roots.
- `text-browser.cjs`: 32 current/app theme and viewport comparisons, computed typography and icon sizes, RTL alignment, responsive styles, link hover/keyboard actions, accessibility-tree names, ref cleanup, stable focused DOM and hydration. The candidate uses its own scoped ThemeProvider, Box, GlobalStyles, styled, useTheme and useMediaQuery; checks include nested $$material providers, CSS variables, responsive Box styles and an SVG sprite root. It renders unchanged ArrowBack, OpenInNew and Print modules from locked current/app icon packages. Production and development builds run separately. `application-scene.jsx` also renders the actual shared-toolbar pattern: IconButton as a Motion button, inherited variants through a wrapper, native disabled/default type, activation, theme rerenders, focus and cleanup. Material 7’s missing native custom-root defaults are asserted separately; VPM follows Material 9.
- Package tests: explicit undefined defaults, disabled custom roots, accessible loading indicators, escaped content, controlled selection ownership, group defaults, class hooks and explicit rejection of unsupported ripple customization. Text/icon cases also check escaped content, inherited-property isolation, root ARIA precedence and accessible titles on decorative SVG children (42 tests total, including standalone/scoped Box themes, Paper elevation/style ownership, Divider roles, Icon ARIA and custom Box/Icon prop forwarding).
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

## InputBase

`input-contract.cjs` checks 904 visible SSR/native-attribute cases against current
and app controls on Node and Bun. It includes controlled/default values, form
state, numeric zero, native constraints, slot/input prop priority, multiline
rows, adornments and custom roots. Known differences are asserted: Material 9
moves `aria-label` onto the native field; VPM follows it. App 7's obsolete
per-input state classes are excluded from the current-class comparison. VPM
omits the internal `classes` object that both controls leak onto custom native
root slots. Only VPM's editable textarea is serialized; the control's hidden
measurement textarea is excluded from the visible SSR comparison.

`input-browser.cjs` runs 64 theme/viewport comparisons with the owned InputBase
inside the independent FormControl/label/helper family. It covers actual typing,
clearing, event order, controlled updates, disabled/controlled focus, native
validation, adornments/custom refs, autofill signals, accessible input names,
SSR hydration and retained DOM/selection. Real React Hook Form 7.92.0 and app
7.56.0 Controllers handle number/textarea values, reset and focus. Multiline
checks compare computed height, width, overflow, font and row bounds for empty,
short, multiline and wrapping content across two widths. Iframe checks cover
owner-document measurement with and without ResizeObserver and teardown of all
measurement resources. Custom-root replacement checks that sizing follows the
new textarea rather than a detached node. Production and development/StrictMode
are separate runs.

The six added package tests cover native constraints/accessibility, props,
SSR measurement ownership, theme/sx, inner-context isolation and suffix state.
Strict types cover root/input refs, slots and rejected options. The archive gate
repeats all component contracts and installed browser fixtures. It uses the
already-locked Hook Form fixture; no new runtime dependency is introduced.

```sh
node scripts/mui-material-conformance/input-contract.cjs
bun scripts/mui-material-conformance/input-contract.cjs
node scripts/mui-material-conformance/input-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/input-browser.cjs
node scripts/mui-material-conformance/input-build.cjs
OUTPUT=packages/vmui-material/bench/input/node-isolated.json node packages/vmui-material/bench/input.cjs
OUTPUT=packages/vmui-material/bench/input/bun-isolated.json bun packages/vmui-material/bench/input.cjs
```

[Input measurements](../../packages/vmui-material/bench/input/README.md) use the
existing balanced fresh-process harness with prepared 12-element single-line,
multiline and complete labelled-field trees. Client textarea measurement is not
part of SSR; browser acceptance checks it separately. Samples and source hashes
are retained. Earlier reports remain historical measurements.

The InputBase optimization is recorded separately in
[the optimized input report](../../packages/vmui-material/bench/input-optimized/README.md).
Its acceptance retains the same browser/state cases and adds scoped, fallback
and live theme/owner-state checks. Unit-test preparation writes a process-specific
bundle so parallel Node test files cannot load each other's partially written
output. The System caller SSR and Chrome suites also cover the shared styling change.

Input and OutlinedInput add 960 paired visible SSR/initial-state comparisons
against Material 9.5.0 and app 7.2.0. The variant browser fixture compares
light/dark, RTL/LTR, ordinary/CSS-variable themes, disabled/error states, and
VentiMath-style padding overrides. It checks underline focus, outlined notch,
retained input/selection, React Hook Form number/textarea controllers, accessible
labels/helpers, custom outline slots and hydration. Headless focus emulation
ensures native focus events are delivered.

Material 9 no longer applies the legacy per-input size/adornment override keys.
The browser test asserts their precise padding/geometry differences before
comparing the remaining current-control CSS. The app-7 comparison has no such
allowance: it must match the VentiMath legacy theme behavior directly. SSR tests
also assert upstream's native-slot `classes`/`ownerState` leaks before removing
those attributes from the comparison; VPM does not emit them.

```sh
node scripts/mui-material-conformance/input-variants-contract.cjs
bun scripts/mui-material-conformance/input-variants-contract.cjs
node scripts/mui-material-conformance/input-variants-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/input-variants-browser.cjs
node scripts/mui-material-conformance/input-variants-build.cjs
```

The new component unit tests, strict NodeNext/Bundler consumers and full
18-package archive checks include these entries. Browser evidence is local
Chrome, not application adoption or Safari/Firefox acceptance.

The input fixtures keep Emotion caches alive for their document lifetime. A
component-effect cleanup must not flush a live cache during StrictMode replay;
that would compare controls with missing styles. Frame/document teardown owns
fixture styles. The textarea measurement nodes still have explicit ref cleanup.

[Input/OutlinedInput benchmarks](../../packages/vmui-material/bench/input-variants/README.md)
use the same isolated process harness; `bench/input-variants.cjs` records the
standard, outlined, multiline and complete-field SSR cases. The new native input
engine file is named `input-base.cjs`, leaving `Input.cjs` available as a public
entry on case-insensitive filesystems too.


`input-decorations-contract.cjs` compares 960 InputLabel/InputAdornment SSR
contracts against Material 9.5.0 and app 7.2.0. The decoration browser fixture
checks label transforms, pointer behavior, inherited state, theme overrides,
light/dark/RTL/variable themes, live shrink/focus, React Hook Form, accessible
names and hydration in production and development React. It is included in
clean npm/Bun archive consumption and strict NodeNext/Bundler declaration checks.


TextField has 590 visible SSR comparisons against both Material controls, plus
app-shaped Chrome cases for search refs/ARIA, password/numeric/date inputs,
multiline notes, Hook Form, labels/helpers, hydration and the explicit Select
slot boundary. The pinned Select and its context adapter are test controls only;
Select remains unimplemented; MenuItem and its menu foundation are now shipped as described below. Non-native label divs
follow Material 9; the Material 7 label difference is asserted explicitly.


## List and popup dependencies for Select

List, MenuItem, MenuList, ListItemText, ListItemIcon, ListSubheader, Menu and Popover
are independently implemented; Select composition remains pending. The list
contract compares 394 SSR cases against Material9/app7 on Node/Bun. The list
browser fixture compares 64 theme/density cases plus arrow/Home/End navigation,
typeahead, disabled-item handling, activation, retained focus/refs and hydration.
It asserts current/app differences: initial item tab stops, standalone icon
spacing and changing autoFocusItem after mount. The empty owned ripple host is
excluded from visible SSR comparison; ripple implementation remains unchanged.
The package test also preserves standalone MenuItem use in VentiMath search,
which current9 rejects outside MenuList.

The popup fixture compares 64 theme/anchor cases plus keyboard selection, close
reasons, restoration after repeated opens, position updates, retained DOM,
nested focus/scroll ownership, portal opt-out, hidden kept mounts and iframe
ownership. Production and development/StrictMode run separately. Current/app
legacy aliases remain consumed; no upstream runtime is shipped. Entrance/exit
trajectory equality and custom transition components are not asserted.

```sh
node scripts/mui-material-conformance/lists-contract.cjs
bun scripts/mui-material-conformance/lists-contract.cjs
node scripts/mui-material-conformance/lists-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/lists-browser.cjs
node scripts/mui-material-conformance/menus-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/menus-browser.cjs
```

Fresh/frozen npm and Bun archive installs are checked; the installed npm closure
repeats both browser fixtures.
The prepared SSR benchmark includes 12-item menus, dense menus, icon/text menus,
standalone primary/secondary text and closed popup rendering. Theme and tree
preparation precede timing; all isolated process pairs, controls and hashes are
retained in the package report. No browser speed or app adoption claim follows.

Radio/RadioGroup/FormGroup: `radio-contract.cjs` compares 388 public SSR cases
against current9/app7; `radio-browser.cjs` covers settings and team-choice forms,
native keyboard navigation, refs, hydration, canceled/uncanceled resets and
light/dark/RTL/CSS-variable/theme-override styles. Run again with
`VPM_REACT_MODE=development`. `radio-controls.test.cjs` covers value identity,
coercion, explicit overrides, nested contexts and custom slots.


Switch: `switch-contract.cjs` compares 288 current9/app7 SSR cases.
`switch-browser.cjs` checks preference toggles, Hook Form, native keyboard/form
behavior, reset, refs, hydration and settled computed styles across light/dark,
RTL, CSS variables and the compact Fuse theme. Run production and
`VPM_REACT_MODE=development`. App7's inert-wrapper disabled attributes and
missing native switch role are explicit current9 compatibility differences.
Top-level input ARIA-label forwarding and reset synchronization are VPM fixes.
Exact archives run the same controls via `VPM_MATERIAL_BROWSER_FILTER=switch-browser.cjs`.
Use `switch-build.cjs` before `packages/vmui-material/bench/switch.cjs`; benchmark
Node and Bun sequentially with no concurrent tests or builds.


Chip: `chip-contract.cjs` compares 672 SSR combinations against current9/app7.
`chip-browser.cjs` checks actual status, tag and roommate patterns with synthetic
data: styles, overrides, CSS variables, RTL, clicks, deletion, keyboard activation,
nested inputs, dragging, disabled semantics, refs and hydration. CSS colors are
normalized through a canvas pixel, so equivalent rgba/relative-color syntax is
compared by value. App7 deprecated compound Chip classes are normalized only
in SSR checks.
Disabled removal is deliberately blocked even when upstream dispatches the
callback; explicit disabled ARIA is preserved.

`chip-build.cjs` prepares three eight-Chip SSR workloads for `bench/chip.cjs`;
run those in isolated processes with both controls. Avatar and SvgIcon inputs
are unchanged controls; the package runtime uses only owned components.
Exact archives rerun these through `VPM_MATERIAL_BROWSER_FILTER=chip-browser.cjs`.


Avatar: `avatar-contract.cjs` compares 144 current/app SSR combinations.
`avatar-browser.cjs` checks actual profile/initial/Chip patterns, unchanged
AvatarGroup composition, real loaded/missing/responsive image requests, a stale
failure after source replacement, cached-error hydration, refs and theme/RTL
styles. The runtime uses the rendered image, not an auxiliary preloader.
Build with `avatar-build.cjs`; prepared SSR benchmarks are `bench/avatar.cjs`.
Use `VPM_MATERIAL_BROWSER_FILTER=avatar-browser.cjs` for exact archive checks.


CircularProgress: `progress-contract.cjs` compares 147 current/app combinations,
including custom ranges and track geometry against Material9. App7's deprecated
circle variant classes and missing default min/max ARIA are normalized only in
the app control. `progress-browser.cjs` checks theme/CSS-variable/RTL overrides,
WARML-style saving buttons, updates without DOM replacement, disabled shrink,
reduced-motion preferences, browser accessibility, refs and hydration in both
React modes. Range clamping and invalid-input rejection are deliberate changes.
Use `progress-build.cjs` before `bench/progress.cjs`, and
`VPM_MATERIAL_BROWSER_FILTER=progress-browser.cjs` for exact archives.


Skeleton: `skeleton-contract.cjs` compares 384 current/app SSR combinations,
normalizing only VPM's deliberate native inert attribute for measurement children.
`skeleton-browser.cjs` compares actual Fuse/contest/WARML prop patterns, dimensions,
CSS variables, light/dark themes, RTL and narrow/wide layouts. It checks live sizes,
refs, DOM preservation, hydration, pulse/wave/off and reduced-motion behavior.
Browser accessibility confirms measurement children stay absent even if a child's
visibility is overridden. Direct text and zero are deliberately hidden as well.
Use `skeleton-build.cjs`, `bench/skeleton.cjs` and
`VPM_MATERIAL_BROWSER_FILTER=skeleton-browser.cjs` for packed install checks.

## Container

`container-contract.cjs` compares current Material 9.5.0 and app 7.2.0 markup.
`container-browser.cjs` compares geometry across 12 viewport widths, custom
breakpoints (including em units), RTL, variable themes, overrides, sx and fixed
caps. It also checks custom-root refs, stable DOM/focus and hydration in production
and development React. The shared archive runner repeats this fixture after exact
package installation. `container-bench-entry.jsx` models WARML practice, public
results and contest signup props; the isolated benchmark lives in
[the package](../../packages/vmui-material/bench/container/README.md).

Before timing Container, run `node scripts/mui-material-conformance/container-build.cjs`
to rebuild the comparison bundles from the local sources. Run Node and Bun
benchmarks sequentially, with browser checks and other tests finished first.

## Card and CardContent

`cards-contract.cjs` checks current Material 9.5.0 and app 7.2.0 markup, elevation
precedence and theme defaults. `cards-browser.cjs` compares light/dark, variable
and custom themes, RTL and responsive widths. It checks last-child spacing as
siblings change, custom roots/refs, stable focus and hydration, plus an unchanged
upstream CardActionArea keyboard caller. The newer `card-action-*` fixtures
exercise the independently implemented VPM child. Both React modes and exact archive installs are checked.
Before recording [benchmarks](../../packages/vmui-material/bench/cards/README.md),
run `node scripts/mui-material-conformance/cards-build.cjs`, then time Node and
Bun sequentially after all other checks finish.

## CardActionArea

`card-action-contract.cjs` checks 52 current/app SSR and current slot cases.
`card-action-browser.cjs` checks 176 light/dark, variable/custom-theme, RTL,
responsive geometry, keyboard/focus, disabled, ref cleanup and hydration cases.
The article and exam fixtures use the actual app prop patterns at `7970b7e5` with
a router-shaped link. They do not claim app adoption or an unchanged router test.
Production/development React 19.3.1 and installed archives are verified, together
with the existing button-family browser suite after the native typography fix.

Build with `node scripts/mui-material-conformance/card-action-build.cjs`, then run
`node packages/vmui-material/bench/card-action.cjs` and the same command with Bun
sequentially after other checks finish. [Recorded results](../../packages/vmui-material/bench/card-action/README.md).

## AvatarGroup

`avatar-group-contract.cjs` checks 644 current9/app7 SSR cases covering ordering,
max/total boundaries, spacing, variants and surplus slots. `avatar-group-browser.cjs`
checks 168 cases across light/dark, variable/custom themes, RTL and two widths,
including focused member identity during reorder, changing surplus, refs and
hydration. It uses the four-member primary-border pattern present in eight app
message sections at `47e3b4ef`, with synthetic initials instead of real profiles.
Production/development React 19.3.1 and installed archives are checked.

Build `scripts/mui-material-conformance/avatar-group-build.cjs`, then run
`packages/vmui-material/bench/avatar-group.cjs` separately with Node and Bun after
other checks finish. [Measurements](../../packages/vmui-material/bench/avatar-group/README.md).

DialogContentText is included in the dialog-parts matrices: three real source
callers, current/app themes, description IDs and accessible dialog descriptions,
custom roots, refs, retained nodes and hydration. The dedicated measurement entry
is `packages/vmui-material/bench/dialog-text.cjs`. Material remains partial.

## Drawer

`drawer-contract.cjs` compares 192 current9/app7 SSR combinations across variants,
edges, open state, portals and retained content. `drawer-browser.cjs` checks
four-edge geometry with light/dark CSS-variable themes and RTL, the two permanent
sidebar prop shapes, temporary keyboard/focus/dismissal, nested Dialog ownership,
retained drafts, interrupted transitions, custom roots/refs, iframe portals and
hydration. App 7 and VPM retain `disableEscapeKeyDown`; the current 9.5.0 control
ignores it, which is asserted explicitly. Retired app7 paper-anchor classes and
upstream focus sentinels are excluded from structural SSR equality; browser checks
compare actual geometry, accessibility and focus behavior independently.

Production and development React 19.3.1 are checked. The shared archive runner
repeats Drawer and Dialog against exact installed packages. Build `drawer-build.cjs`
before running `packages/vmui-material/bench/drawer.cjs` with Node and Bun,
sequentially after other checks finish. [Measurements](../../packages/vmui-material/bench/drawer/README.md)
include the resolved theme and real inline paper content for all three variants.
SwipeableDrawer's gesture checks are described below; whole-app adoption is separate.


## SwipeableDrawer

`swipeable-drawer-contract.cjs` checks 192 current/app SSR cases. The browser fixture
adds real CDP touch input: all edges and RTL, short and completing swipes, native
nested scrolling, fling thresholds, optional opening, cancellation, multiple touches,
controlled refusal, backdrop policy and retained drafts. It retains Drawer focus,
nested-overlay, iframe and hydration checks. The current upstream loses swipe behavior
with an external paper ref; its gesture control omits the ref, while VPM keeps it.
The app7 gesture control uses its legacy PaperProps form. Each comparison uses a fresh Chrome tab to isolate native touch recognition after multi-touch probes. The other structural differences and legacy Escape behavior are documented under Drawer.

Run production and `VPM_REACT_MODE=development` browser checks, Node/Bun unit and SSR
checks, `types.cjs`, and exact archives filtered to `swipeable-drawer-browser.cjs,drawer-browser.cjs`.
Build `swipeable-drawer-build.cjs` before sequential Node/Bun measurement runs of
`packages/vmui-material/bench/swipeable-drawer.cjs`. These measure SSR composition,
not native gesture performance or real-device acceptance.

Autocomplete has 960 current9/app7 SSR/filter comparisons and app-shaped native
Chrome controls for school/student selectors, Hook Form, option changes, IME,
keyboard/ARIA, theme overrides, retained inputs and hydration. Run
`autocomplete-contract.cjs`, `autocomplete-browser.cjs` (production/development)
and the fresh archive gate. Its independent implementation targets the current
API; the controlled free-solo popup difference from app7 is explicit in the check.


## Table navigation and linear progress

`navigation-contract.cjs` checks 2,552 current/app sorting and pagination contracts.
`navigation-browser.cjs` checks styles, keyboard behavior, retained focused nodes,
hydration and the unchanged VPM table pagination caller. Its two legacy Box
warnings are allowed only on the unchanged current-upstream control.

`linear-contract.cjs` checks 466 current/app progress contracts, including ranges,
RTL and current fractional/buffer ARIA. `linear-browser.cjs` compares themes,
colors, animated geometry at a fixed time, capacity updates, inherited colors,
reduced motion, refs, hydration and unchanged `MRT_LinearProgressBar` behavior.
Only legacy classes and app 7's missing buffer ARIA are normalized. Nonfinite
ranges reject; values clamp; reduced-motion indicators retain visible geometry.
The [LinearProgress measurements](../../packages/vmui-material/bench/linear/README.md)
use isolated workers and same-code controls; they measure SSR, not animation speed.


`alert-contract.cjs` compares current/app Alert and AlertTitle semantics, actions,
classes, roots, defaults and slots. Its two explicit markup exclusions are
independently drawn decorative SVG geometry and the existing SSR ripple
placeholder. `alert-browser.cjs` checks equivalent root-callback themes, current
and app palettes, RTL, actions and native keyboard close, accessible roles/names,
retained nodes, merged refs and hydration. The original VPM Material React Table
banner caller checks selected rows, clear-selection and explicit banners.
Legacy severity override keys have separate regression and app-control browser coverage; current Material 9 ignores
those old keys. Use `alert-build.cjs` before `bench/alert.cjs`.


`badge-contract.cjs` compares current/app count capping, zero/dot/invisibility,
anchors, colors, roots, classes, defaults and slots. It explicitly separates
current marker ARIA and inline positioning variables from the older app control.
`badge-browser.cjs` checks palette/anchor geometry, the reading-list-shaped
Tooltip/IconButton/Badge caller, retained nodes/focus, hidden exit content,
keyboard activation, root/slot cleanup, hydration and current RTL. Legacy RTL
mirroring is asserted separately. Owned reduced-motion and forced-colors checks
are explicit. `badge-build.cjs` prepares isolated `bench/badge.cjs` comparisons.

ListItemButton adds 778 current/app markup comparisons and 320 browser snapshots
per mode, plus native/custom-root keyboard activation, focus-visible styling,
autofocus, disabled handling, refs, stable focused nodes and hydration. The
current 36px icon minimum and disabled synthetic-click suppression differ from
app7's 56px and permissive synthetic click; each is checked explicitly. Synthetic
Fuse-shaped navigation and theme overrides exercise the inspected caller props.
Dense text descendants no longer receive the root-only dense class.

## AppBar and Toolbar

The `bars-*` fixture models shell headers/footers, the palette editor and
messenger toolbars at VentiMath `d0a71aaf`. Current 9.5.0 and app 7.2.0 are
separate controls. There are 376 SSR comparisons and four owned regression tests.
Chrome checks 504 snapshots per React mode, comparing palette colors, dark mode, CSS variables, RTL, positioning,
regular/dense sizing, gutters and the actual 48px/40px toolbar theme overrides
at phone portrait, phone landscape and desktop widths. Print positioning,
keyboard traversal, stable DOM/focus, native root semantics, refs and hydration
are checked in production and development React. This is component acceptance,
not app adoption or full Material theme creation.

```sh
node scripts/mui-material-conformance/bars-contract.cjs
bun scripts/mui-material-conformance/bars-contract.cjs
node scripts/mui-material-conformance/bars-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/bars-browser.cjs
VPM_MATERIAL_BROWSER_FILTER=bars-browser.cjs node scripts/mui-material-conformance/archives.cjs
```

With `color="inherit"`, VPM follows current Material 9 and inherits its parent
text color. App Material 7 retains the Paper text color instead. The browser
comparison asserts this specific version difference rather than ignoring color
differences generally. The observed app shell passes explicit theme text colors.

### Accordion summary and details

The 9.5.0 current and 7.2.0 app controls each use their own private Accordion
context; VPM uses its independently owned context. The parent has separate full-panel checks below. Five owned tests cover button/region
semantics, expansion, disabled/gutter state, missing icons and custom content.
138 SSR comparisons cover context combinations, semantic roots, slots, themes
and classes. The removed app7 contentGutters class is asserted explicitly.

Chrome compares 204 computed-style snapshots for light/dark, CSS variables,
RTL, themes, compact app spacing, expanded/disabled/gutter states and slots.
Native Enter/Space, toggle/click ordering, slot handlers, disabled traversal,
accessibility names, refs, retained DOM/focus and hydration are also checked in
production and development. Strict TS7 consumers and fresh/frozen archives
include both components and their utility-class exports.

```sh
node scripts/mui-material-conformance/accordion-parts-contract.cjs
bun scripts/mui-material-conformance/accordion-parts-contract.cjs
node scripts/mui-material-conformance/accordion-parts-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/accordion-parts-browser.cjs
VPM_MATERIAL_BROWSER_FILTER=accordion-parts-browser.cjs node scripts/mui-material-conformance/archives.cjs
```

[Isolated SSR measurements](../../packages/vmui-material/bench/accordion-parts/README.md).

### Accordion parent

The component assembles the owned Paper, Summary, Collapse and Details components.
The fixture renders WARML information, HMMT result tables and the article policy
banner with synthetic content. It compares 288 combinations of initial and
controlled expansion, disabled state, corners, heading/region slots and unmount
policy with Material 9.5.0 and the app's 7.2.0. The newer region slot accepts
attributes that the older control ignores. Browser checks compare panel spacing
and divider styles, accessible controls, native key events, controlled refusal,
retained detail input, unmounting and hydration. Run the matching
`accordion-contract.cjs` and `accordion-browser.cjs` files in this directory.
[Panel benchmarks](../../packages/vmui-material/bench/accordion/README.md).


### Tab and Tabs

Run `tabs-contract.cjs` on Node or Bun for 192 SSR comparisons against Material 9.5.0 and VentiMath’s 7.2.0. The fixtures use the IMO results and family learner selectors. Chrome checks their geometry and theme overrides, arrow-key navigation, disabled tabs, repeated external-link activation, learner identity after reordering, and hydration. Run `tabs-browser.cjs` on Node in production and with `VPM_REACT_MODE=development`. Set `VPM_MATERIAL_BROWSER_FILTER=tabs-browser.cjs` to exercise the same browser cases from the packed closure using `archives.cjs`.


### Breadcrumbs

The SSR and Chrome fixtures exercise the PageBreadcrumb routes’ link, class, theme and accessibility contracts against Material 7.2.0 and 9.5.0. Run `breadcrumbs-contract.cjs` on Node or Bun. Run `breadcrumbs-browser.cjs` on Node in production and with `VPM_REACT_MODE=development`. The browser checks keyboard expansion and focus, hrefs, light/dark styling, RTL layout, the app’s separator and hydration. [Measurements](../../packages/vmui-material/bench/breadcrumbs/README.md).

With a VentiMath checkout available, run `node scripts/mui-material-conformance/app-breadcrumbs.cjs <checkout> [ref]`. This renders its unchanged PageBreadcrumb with fixture navigation data and compares generated hrefs and labels against the app’s Material control.

## Snackbar

The clipboard fixture uses the club article share button’s controlled open state, two-second auto-hide and message. Run `node scripts/mui-material-conformance/snackbar-contract.cjs` for server output against the app’s Material 7 and current Material 9. Run `node scripts/mui-material-conformance/snackbar-browser.cjs` for dismissal, timer identity across rerenders, focus and blur, reopening during exit, responsive anchoring and hydration. The browser controls the auto-hide timer directly while React, DOM events and transitions run in Chrome.

## Stack

The layout fixtures use the ARML highlights, WARML team shortcuts, Math Is Cool buttons and editor examples. The Material 7 control receives the app’s direct alignment and wrapping props. The Material 9 control receives their CSS equivalents through `sx`. The comparisons cover accessible markup and dividers on the server, then computed margins, gap, focus across resizes and hydration in Chrome. Run `stack-contract.cjs` and `stack-browser.cjs` from this directory. With a VentiMath checkout available, `node app-stack.cjs /path/to/checkout <revision>` compares all three original contest components and their rendered links with fixture data.

### IMO archive Grid

`grid-contract.cjs` compares responsive markup against both Material controls. `grid-browser.cjs` checks column widths, spacing, nested containers, theme overrides, focus and hydration. Run `node scripts/mui-material-conformance/app-grid.cjs <ventimath-checkout> <git-ref>` for the unchanged IMO view with fixture data. The reference used for this check was `aa110e55`.

### WARML signup Rating

`rating-contract.cjs` compares accessible names, selections and icon states with the app and current Material versions. `rating-browser.cjs` compares actual pointer and keyboard events across separate radio groups. Run `node scripts/mui-material-conformance/app-rating.cjs <ventimath-checkout> <git-ref>` to verify the two unchanged poll functions and the app's conversion of a cleared rating to zero. The recorded caller revision is `aa110e55`.

### WARML registration steps

Run `node steps-contract.cjs` or `bun steps-contract.cjs` to compare state and markup with app Material 7.2.0 and current Material 9.5.0. `node steps-browser.cjs` checks the visible labels, icon and connector geometry, focus and retained nodes in Chrome. Set `VPM_APP_CHECKOUT` to a VentiMath checkout and optionally `VPM_APP_REF` to a revision to use the form’s actual Stepper JSX, role-to-label function, English translations and theme overrides. The default fixture runs in public CI. [Measurements](../../packages/vmui-material/bench/steps/README.md).

### Academy course subtitles

Run `node step-content-contract.cjs` or `bun step-content-contract.cjs` for comparisons with Material 7 and 9. The browser check `node step-content-browser.cjs` exercises all-expanded lesson navigation, retained DOM, geometry and transition cleanup. With `VPM_APP_CHECKOUT` set, it extracts CourseView’s actual Stepper JSX and navigation handlers and the app’s theme override. The public fixture uses synthetic lessons. [Measurements](../../packages/vmui-material/bench/step-content/README.md).

The ListItem contract checks QuickPanel-style event, note and quick-setting rows against both Material controls. The Chrome check exercises a focused switch during a keyed reorder. Run `node scripts/mui-material-conformance/list-item-browser.cjs`.

The CssBaseline contract checks both Material versions for document rules, overrides and native color schemes. Its Chrome check switches the app’s cache direction and verifies cascade layers, print and cleanup. Set `VPM_APP_CHECKOUT` and optionally `VPM_APP_REF` to exercise the layer plugin from the app source.


### Popper transitions and the npm date pickers

`popper-contract.cjs` compares 48 server renders with both Material controls, including what a render-function child is handed with and without `transition`. `popper-browser.cjs` also records the transition lifecycle in Chrome for each control and VPM: a Grow child enters, the panel stays placed while the child leaves, a reopening interrupts the exit, and a retained panel is hidden only after the exit.

`pickers-browser.cjs` bundles the unchanged npm `@mui/x-date-pickers` 8.7.0 DatePicker and DateTimePicker twice: with the npm Material they were installed against, and with every Material, Emotion, clsx and transition import mapped to VPM through the release's own name mapping. In Chrome it opens each calendar with Grow and with Fade, closes it with Escape, chooses a day and opens above the field at the viewport edge. The popup's place, visibility, month and selection must be identical. It uses the date fixture's locked picker:

```sh
npm --prefix scripts/date-fns-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/mui-material-conformance/pickers-browser.cjs
VPM_REACT_MODE=development node scripts/mui-material-conformance/pickers-browser.cjs
```

## Complete private-app build audit

`VPM_APP_REPO=/absolute/path/to/app node scripts/mui-material-conformance/app-consumer.cjs`
exports the requested app Git revision into fresh baseline/candidate directories,
packs the owned closure, installs aliases with frozen verification, then runs the
full app typecheck and Vite production build. It exits nonzero on any failure.
It reads the checkout without editing it or using live data/credentials. Logs and
archive hashes stay in its temporary report directory. The committed
[summary](app-consumer-report.json) records the fixed defect categories without
copying private app sources into this repository.

`consumer-gaps-contract.cjs` checks 72 pagination/focus/fade/hook SSR contracts;
`consumer-gaps-browser.cjs` compares current/app controls for pagination callbacks,
unknown counts, focus containment/restoration, disabled autofocus, Fade visibility,
keyboard/filter/clear selection and scrollable learner Tabs. Exact archive checks
include both fixtures. Strict type consumers preserve React content in System
style intersections and typed styled variants, with negative inference checks.

## Consumer release gate

`pack-app-release.cjs --family vmui-material` packs a committed snapshot and
pins the complete VPM closure. `check-app-release.cjs <directory>` verifies
archive bytes, CJS/ESM exports, strict types, dependency identity and every
component contract on Node/Bun, then runs at most two independent production Chrome fixtures at a time
and representative development checks. The picker fixture needs
`scripts/date-fns-conformance` installed. `--published` additionally downloads
all public assets, compares their checksums and repeats ordinary fresh/frozen
npm and Bun installs, entries, types, identity and SSR. Before publication, Bun
uses frozen peer installation and exact archive extraction because its resolver
does not honor unpublished URL overrides; public URL resolution is verified
after publication. The separate private-app snapshot audit remains opt-in and
does not modify the application repository or deploy it.

The November 23 release audit also exports the committed private application at
`f9482ea6`: both baseline and packed candidate pass full typecheck/build and the
same 196 tests in four dialog/search/theme files. `app-browser.cjs <audit-dir>`
compares the production sign-in and 404 routes with a fresh profile, external
requests and writes blocked. Copy, controls, focus and page width match; local
screenshots retain the expected blocked-asset/3D fallback. This does not claim
signed-in route or production acceptance. The sanitized
[report](release-app-report.json) records counts without shipping private source.

[Release verification](release-verification.json) records the complete combined
gate and public-install outcome. Final package runtime/type/metadata hashes match
the first candidate; only Material documentation changed before final packing.
`--install-only` explicitly limits a repeat invocation to installer/archive/type/
SSR checks; it does not claim another component run. A controlled interrupted
browser run can resume with `VPM_RELEASE_BROWSER_FROM=<fixture>`, retaining the
preceding successful log and verifying the same artifact hashes.
