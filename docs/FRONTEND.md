# VentiMath frontend requirements

Reviewed against VentiMath main `82457c3c4d840704155d04742b88c6b7e28a66e5`
on November 16, 2026. Counts below are non-test source imports, not route visits,
production bundle membership or adoption percentages. Astryx-owned controls stay
separate; these requirements concern remaining Material and Motion consumers.

## Motion

Motion was refreshed against main `2721de95` on November 22, 2026: 43 non-test
files import `motion` or `useAnimation` from `motion/react`. Real callers include
AMC10/12 and Putnam entrances, calendar headers/sidebar, directory transitions,
public error views, link buttons and the notification bell. They need:

- DOM/custom component roots, initial poses, animate targets and `initial=false`.
- Hidden/show variants, propagation through wrappers and staggered children.
- Imperative start/set/stop for the repeated bell, including CSS-variable colors.
- Material polymorphic roots, stable refs and DOM, hydration and reduced motion.

[vmotion](../packages/vmotion) implements this application subset over
[vmotion-dom](../packages/vmotion-dom). The `motion-14.7.0-r2` consumer release
contains all three runtime packages with pinned internal URLs. Fresh npm/Bun
installs, Node/Bun SSR, strict TS7 consumers and 46 Chrome scenarios cover both
the VPM Material fixture and the app’s Material 7.2.0 on React 19.3.1.
The next step is app-side adoption and acceptance; it is not marked in use yet.
[Install instructions](INSTALLATION.md#motion) preserve `motion/react` imports.

Broad gestures, dragging, layout projection, AnimatePresence, sequence editing,
arbitrary 3D and other unobserved APIs remain outside the verified subset.

## Material

[vmui-material](../packages/vmui-material) now has 100 independently implemented
components. It covers button controls; text/icons; Box/Paper/Divider; the form,
input, Select, checkbox/radio/switch foundation; menus; Chip, Avatar, loading
spinners, LinearProgress and Alert/AlertTitle feedback and Badge counts and ListItemButton navigation, AppBar/Toolbar shell layouts, Accordion with its Summary and Details, Skeleton placeholders, Container page layouts and Card/CardContent panels and their linked CardActionArea roots, plus AvatarGroup, Tooltip, Collapse, Slide, Drawer, SwipeableDrawer, the seven Table primitives, TableSortLabel, PaginationItem, Pagination, Autocomplete and Dialog with its title/content/action/description components. Its app-used theme factory and resolved-theme bridge are built;
remaining component families are outside the verified scope. The full app typecheck and production build pass with the packed VPM closure at app `f9482ea6`. Public sign-in/404 routes retain visible copy, control semantics, focus and page width in a network-blocked Chrome check. The consumer release is `vmui-material-9.5.0`; signed-in route acceptance and app adoption remain separate. [Pins and resolver mappings](INSTALLATION.md#material).

Autocomplete now covers the five direct school/student selection callers.
TableSortLabel and numbered Pagination now cover the adopted table’s sorting and
paging controls; browser acceptance mounts its existing pagination caller.
Remaining indirect consumers still matter for a complete package override.

Transition creation now supplies page/side-panel CSS strings and automatic height timing through the default component theme. Typography creation now resolves the app’s Geist/13px scale, all 14 variants, pxToRem and nested responsive overrides. Material palette creation now resolves the app’s 37 presets and role augmentation before the verified contrast pass. Theme assembly now composes those stages and CSS-variable schemes; 222 unchanged app builds across all 37 presets pass. Material styles exposes the color helpers used by the theme picker. Its six palette roles and secondary text match the app control across all 37 presets. CssBaseline applies the document defaults through the root theme’s LTR or RTL cache. ListItem renders event, note and settings rows in the toolbar quick panel. StepContent displays all Academy course subtitles and preserves them when the learner selects a new step. Stepper, Step and StepLabel track the current page of WARML registration across its three- and six-step layouts. Slider applies the toolbar’s seven font sizes on keyboard selection and pointer release. Popper anchors the suggestions and empty-results panel for both toolbar search layouts. Grow handles the horizontal navigation group and nested menu transitions, including their automatic height-based timing. ClickAwayListener covers the toolbar search and style-2 sidebar. Document listeners follow the child into an iframe and exclude React portals by default.

GlobalStyles covers all seven app imports on `aa110e55`, including shared navigation, sticky page layouts and the iframe preview. Babel’s option validation and spelling suggestions now run through VPM with current/app compilation-targets and Babel Core conformance. Babel’s independent code-frame now formats build diagnostics with the VPM tokenizer, identifier checks and terminal colors. Both code-frame controls and Babel Core verify the complete formatter. Babel’s generator, gen-mapping and remapping pass source-map composition checks using the VPM tracer, resolver and codec. Babel core’s source-map merger now also passes with the complete VPM generation, tracing and [remapping](../packages/vremapping) stack. These build packages are available in the workspace.

Theme/style imports occur in 90 files. The assembled theme and remaining
layout/overlay families still need whole-app adoption acceptance.
Dependencies such as Material React Table may also consume components that do
not appear as direct app imports; they need unchanged-caller acceptance before
a complete package override.

Rating covers five WARML practice times and three relay-position preferences. Clearing a star passes through the signup’s existing zero-value callback.
Grid lays out the IMO archive’s year cards and loading placeholders in one, two or three columns as the viewport widens.
Stack lays out ARML highlights, WARML team shortcuts and Math Is Cool links across screen widths.
Snackbar and SnackbarContent cover the club article share confirmation.
Breadcrumbs covers shared contest and academy navigation, including collapsed ancestor links and the stored name on person pages.
Tab and Tabs cover the IMO results switcher and the family growth learner selector, including the shared selection indicator.
Accordion now composes Summary, Details and Collapse. The app uses that family in WARML information, HMMT and public article
policy notices. AppBar and Toolbar now cover shell headers/footers, palette
settings and messenger toolbars, including app theme overrides and responsive
layout. ListItemButton now covers Fuse
navigation and sidebar links; Badge covers the reading-list toolbar count. Alert and
AlertTitle now cover ARML/WARML notices, public article failures and the unchanged
Material React Table selection/error banner. LinearProgress
now covers ARML loading, WARML capacity and the unchanged Material React Table
loading indicator. Sorting and numbered paging for the
math-resources and contest-season grids are built and checked against both
current Material 9.5.0 and app Material 7.2.0. The seven Table primitives now cover direct results and score grids. SwipeableDrawer now covers shared navigation, page sidebars and notification
panels, with native swipe-close, scroll arbitration, cancellation and retained content. DialogContentText now covers external-link and WARML
confirmations and the FuseDialog example. Dialog and Slide cover the eleven
Material Dialog imports and the two settings panels' transition APIs. Description
IDs, theme styling, focus/dismissal, retained DOM/ref ownership and hydration are
checked. Drawer now covers the two permanent desktop sidebar wrappers and provides
temporary/persistent panels over owned Slide and shared modal behavior. Standalone
modal exports and the remaining Material families are unfinished.
Collapse now covers
the seven navigation and exam-preview imports at app `a7ce009f`, including
child identity, changing content heights and interrupted transitions. Tooltip now covers 16 rendering caller files (17 imports)
at app `47e3b4ef`, including keyboard/touch access, controlled copy notices and the
shared theme override. AvatarGroup covers eight authentication/coming-soon message
sections; CardActionArea covers linked club articles and Math Is Cool cards.
These are implementation claims; application adoption remains separate until the
required Material surface is complete. Motion follow-ups stay bounded to the
observed application contract.

Nano ID is separate build infrastructure: PostCSS 8.5.8 uses its non-secure entry
to label anonymous CSS inputs. It is independently implemented and caller-tested.

## Browser persistence

[vidb](../packages/vidb) independently covers the promise-based IndexedDB layer
beneath the app's Firebase SDKs. Native Chrome tests run unchanged Firebase
heartbeat and installation persistence with synthetic records and mocked network
responses. Transaction commit/abort, cursors, blocked upgrades/deletion and type
consumers are checked separately. It adds no runtime dependencies.

The package targets idb 8.0.4 and checks the app's 7.1.1 contract. Building this leaf
does not complete Firebase's frontend SDKs, migrate application storage, or verify
live push registration or Amplify DataStore. Publication and adoption are separate.

## Documentation class names

[vclassnames](../packages/vclassnames) was built against the dependency beneath
Redoc on `MockApiDoc.tsx`, removed in app main `211e2186`. Its default, CSS-module
binding and dedupe APIs are independently built. An unchanged Redoc 2.5.0 renders
a synthetic API identically on Node and Bun through the replacement. Types and
packed installs pass; publication and application adoption remain separate.


## CSS named colors

[vcss-color-keywords](../packages/vcss-color-keywords) provides independent CSS-standard
data beneath css-to-react-native and styled-components. All existing entries match;
cyan and magenta also work in border/shadow shorthands, which upstream rejects.
This is a data-ownership and standards-coverage change, not a claimed speedup.

## CSS-to-native dependency chain

`vcss-to-react-native` independently covers the 3.2.0 converter and its shorthands
using `vpostcss-value-parser`, `vcamelize` and `vcss-color-keywords`. Public API
tests, malformed-input checks and the unchanged styled-components 6.1.17 native
caller verify the library chain.

App main `211e2186` removes styled-components, css-to-react-native and the converter
override. The converter was installed but never executed; its only importer was
the native entry. No package bug caused removal. These implementations remain
built, but this removed dependency chain is no longer an app adoption target.

## API documentation helpers

[vdecko](../packages/vdecko) independently supplies the binding, memoization and
delayed-call decorators used by Redoc, alongside
[veventemitter3](../packages/veventemitter3). Unchanged history and scrolling
services pass in Chrome with each replacement. App main `211e2186` removes the
unused Redoc viewer, so these are historical caller checks, not evidence of a
current app need or adoption.

The previously suggested `url-template` leaf served Redoc's OpenAPI parameter
serialization. It is no longer next in line without another verified app caller.
Tab and Tabs support IMOView and the learner selector on FamilyGrowthPage.

## Build diagnostics

[vpicocolors](../packages/vpicocolors) is an independent Picocolors 1.1.1
replacement for the app's PostCSS 8.5.8 diagnostic output. Its unchanged caller,
terminal detection, nested colors, browser entry, archives and types are checked.
This is a current build dependency at app main `211e2186`, not part of the removed
Redoc or styled-components chains. It is built but not yet adopted.

[vieee754](../packages/vieee754) supplies the eight single- and double-precision accessors in browser Buffer.

[vbase64-js](../packages/vbase64-js) encodes binary data for browser Buffer and the Capacitor property-list writer. The conformance tests exercise both upstream callers with the replacement installed.

[vbuffer-builder](../packages/vbuffer-builder) writes the length headers on Sass packets. [vvarint](../packages/vvarint) encodes compilation IDs for the Sass compiler used to build the editor stylesheets. Its tests compile Sass with the unchanged app-pinned host.

[vsource-map-js](../packages/vsource-map-js) supplies CSS source-map generation, lookup and composition for PostCSS and CSS Tree. Its comparison fixtures use the app pin 1.2.1 and current 1.2.4. App adoption is pending.

[vsemver](../packages/vsemver) now independently supplies version and range checks
for Babel’s compilation targets and plugin/helper gates. Installed Capacitor
version warnings and jsonwebtoken runtime gates also match the app control.
The target is semver 7.8.6, with caller checks against the app’s 7.5.4 and Babel’s
6.3.2. Release incrementing, the CLI and range-analysis APIs outside these callers
remain outside its documented scope. App adoption is separate.

Material now exposes the public color ramps used by FuseUtils and the CSS-variable
theme augmentation imported by global.d.ts. Material styled/Box/sx callbacks use
the typed Material theme, and color helpers are available at the root and styles.
These close VPM compatibility gaps; they are not upstream bug fixes. The full app consumer at `d1dfe595` now typechecks and builds in an isolated packed install. That check also closed declaration, indirect Lab/date-picker import, pagination, focus and scrollable Tabs gaps. Next verify representative app routes before a Material release. The independent file-pattern
closure now includes vbalanced-match, vbrace-expansion and vminimatch.
The independent vminipass stream leaf is also built and checked through unchanged
path-scurry and glob callers. vpath-scurry 3.0.0 now supplies the directory
walker above vlru-cache and vminipass, with the app's 2.0.2 contract checked.
Next is the independent vglob caller.
Glob's bundled default entry still needs an independent caller; the verified
fixtures use glob/raw.

The independent `vlru-cache` now covers bounded synchronous caches beneath
Babel compilation targets, CSS parsing, DOM selectors and path-scurry. Actual
callers pass with instrumented VPM get/set operations. The current target is
11.5.3; Babel's default-constructor max/get/set caller remains supported without
retaining yallist. Async fetch/memo and legacy v5 APIs outside that caller are
excluded. This has not changed the application's dependency pins.

## Opener lazy properties

[vdefine-lazy-prop](../packages/vdefine-lazy-prop) now independently supplies lazy
browser-name properties beneath the installed `open` 8.4.2 (Capacitor tooling)
and current `open` 11.0.4. It has no runtime dependencies. Both unchanged callers,
32 simulated platform cases, descriptor/lifecycle operations and packed types
pass on Node/Bun. No command is launched. The opener itself, publication and
application adoption remain separate work.

The next untouched build leaf is `sisteransi`: the app's `prompts` and Clack
callers use its terminal cursor/erase sequences. Target current 2.0.0 while
checking their installed 1.0.5 behavior. This remains planned, not implemented.

`vsisteransi` independently covers terminal sequences beneath the app’s Prompts and Clack build tools. Explicit row zero, bounded output, unchanged caller traces and exact archives are tested; release/adoption are separate.

`vpath-key` independently supplies PATH key lookup for the current cross-spawn
7.0.6 tooling dependency. Windows casing and duplicate ordering, unchanged
resolver calls, and Node/Bun packed installs are covered. It is built but not
published or adopted; native Windows process launch is outside the local checks.

`vshebang-regex` independently recognizes the first-line interpreter marker used
by shebang-command beneath cross-spawn. Current 4.0.0 and app 3.0.0 agree across
8,192 generated scripts, all JavaScript line terminators, empty/long bodies and
unchanged command/file readers. Node/Bun archives and strict types pass. Balanced
benchmarks establish no speed difference. Built; publication and adoption remain
separate from the app's Material release.
