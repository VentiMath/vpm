# VentiMath frontend requirements

Reviewed against VentiMath main `82457c3c4d840704155d04742b88c6b7e28a66e5`
on November 16, 2026. Counts below are non-test source imports, not route visits,
production bundle membership or adoption percentages. Astryx-owned controls stay
separate; these requirements concern remaining Material and Motion consumers.

## Motion

Motion was refreshed against main `d0a71aaf` on November 18, 2026: 40 source
files import `motion` from `motion/react`; one also imports `useAnimation`.
There are 99 direct JSX roots and eight polymorphic `component={motion.*}` uses.
Real callers include AMC10/12 and Putnam entrances, calendar
headers/sidebar, directory transitions and the notification bell. They need:

- DOM/custom component roots, initial poses, animate targets and `initial=false`.
- Hidden/show variants, propagation through wrappers and staggered children.
- Imperative start/set/stop for the repeated bell, including CSS-variable colors.
- Material polymorphic roots, stable refs and DOM, hydration and reduced motion.

[vmotion](../packages/vmotion) implements and tests this application subset over
[vmotion-dom](../packages/vmotion-dom). Release and actual app integration remain.
The notification bell now has a focused acceptance check for its one-second
interruption and default-transition reset, alongside the existing entrance,
variant and lifecycle coverage. The next Motion step is a consumer
release/integration pass for these callers. Broad gestures, dragging, layout projection, AnimatePresence, sequence
editing, arbitrary 3D and other unobserved APIs are not a prerequisite for this
inventory. The entire upstream Motion API is **not** complete.

## Material

[vmui-material](../packages/vmui-material) now has 73 independently implemented
components. It covers button controls; text/icons; Box/Paper/Divider; the form,
input, Select, checkbox/radio/switch foundation; menus; Chip, Avatar, loading
spinners, LinearProgress and Alert/AlertTitle feedback and Badge counts and ListItemButton navigation, Skeleton placeholders, Container page layouts and Card/CardContent panels and their linked CardActionArea roots, plus AvatarGroup, Tooltip, Collapse, Slide, Drawer, SwipeableDrawer, the seven Table primitives, TableSortLabel, PaginationItem, Pagination, Autocomplete and Dialog with its title/content/action/description components. Its resolved-theme bridge is built,
but full Material theme creation
and all app-used component families are not. It cannot replace the entire
`@mui/material` dependency yet.

Autocomplete now covers the five direct school/student selection callers.
TableSortLabel and numbered Pagination now cover the adopted table’s sorting and
paging controls; browser acceptance mounts its existing pagination caller.
Remaining indirect consumers still matter for a complete package override.

Theme/style imports occur in 90 files. The shared theme factory and remaining
layout/overlay families are adoption requirements, not peripheral polish.
Dependencies such as Material React Table may also consume components that do
not appear as direct app imports; they need unchanged-caller acceptance before
a complete package override.

**Next Material unit: AppBar and Toolbar**, used by the app shell headers and
footers, palette settings and messenger toolbars. ListItemButton now covers Fuse
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

[vclassnames](../packages/vclassnames) replaces the dependency beneath Redoc on
`MockApiDoc.tsx`, not a direct contest-page dependency. Its default, CSS-module
binding and dedupe APIs are independently built. An unchanged Redoc 2.5.0 renders
a synthetic API identically on Node and Bun through the replacement. Types and
packed installs pass; publication and application adoption remain separate.


## CSS named colors

[vcss-color-keywords](../packages/vcss-color-keywords) provides independent CSS-standard
data beneath css-to-react-native and styled-components. All existing entries match;
cyan and magenta also work in border/shadow shorthands, which upstream rejects.
This is a data-ownership and standards-coverage change, not a claimed speedup.

## CSS-to-native dependency chain

`vcss-to-react-native` now independently covers the 3.2.0 converter and its
shorthands using `vpostcss-value-parser`, `vcamelize` and
`vcss-color-keywords`. Public API tests, malformed-input checks and the unchanged
styled-components 6.1.17 native caller verify the chain. VentiMath's direct
styled-components usage is currently the **web** iframe `StyleSheetManager` demo;
it does not exercise native style conversion. The converter can replace the
installed dependency without claiming that styled-components itself is rewritten
or that the browser application has adopted this release.
