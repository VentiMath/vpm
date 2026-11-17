# VentiMath frontend requirements

Reviewed against VentiMath main `82457c3c4d840704155d04742b88c6b7e28a66e5`
on November 16, 2026. Counts below are non-test source imports, not route visits,
production bundle membership or adoption percentages. Astryx-owned controls stay
separate; these requirements concern remaining Material and Motion consumers.

## Motion

43 source files import `motion` from `motion/react`; one also imports
`useAnimation`. Real callers include AMC10/12 and Putnam entrances, calendar
headers/sidebar, directory transitions and the notification bell. They need:

- DOM/custom component roots, initial poses, animate targets and `initial=false`.
- Hidden/show variants, propagation through wrappers and staggered children.
- Imperative start/set/stop for the repeated bell, including CSS-variable colors.
- Material polymorphic roots, stable refs and DOM, hydration and reduced motion.

[vmotion](../packages/vmotion) implements and tests this application subset over
[vmotion-dom](../packages/vmotion-dom). Release and actual app integration remain.
Motion is parked. When resumed, the useful next step is a consumer
acceptance/release pass for these callers. Broad gestures, dragging, layout projection, AnimatePresence, sequence
editing, arbitrary 3D and other unobserved APIs are not a prerequisite for this
inventory. The entire upstream Motion API is **not** complete.

## Material

[vmui-material](../packages/vmui-material) now has 54 independently implemented
components. It covers button controls; text/icons; Box/Paper/Divider; the form,
input, Select, checkbox/radio/switch foundation; menus; Chip, Avatar, loading
spinners, Skeleton placeholders, Container page layouts and Card/CardContent panels and their linked CardActionArea roots, plus AvatarGroup, Tooltip, Collapse, Slide and Dialog with its title/content/action components. Its resolved-theme bridge is built,
but full Material theme creation
and all app-used component families are not. It cannot replace the entire
`@mui/material` dependency yet.

The largest unbuilt families in direct source use are:

| Family | Source imports | Why it matters |
| --- | ---: | --- |
| SwipeableDrawer | 11 | Shared navigation and side panels |
| Table primitives | 8 each for Table/body/cell/head/row | Results and remaining direct Material tables |
| Autocomplete | 5 | Searchable selection inputs |

Theme/style imports occur in 90 files. The shared theme factory and remaining
layout/overlay families are adoption requirements, not peripheral polish.
Dependencies such as Material React Table may also consume components that do
not appear as direct app imports; they need unchanged-caller acceptance before
a complete package override.

**Next Material unit: DialogContentText.** It is used by external-link and WARML
confirmations and the FuseDialog example. Dialog and Slide now cover the eleven
Material Dialog imports and the two settings panels' legacy/current transition
APIs. Modal focus/dismissal, nested ownership, sizing, RTL slide direction,
transition cancellation and retained drafts are checked. Standalone modal
primitives and Drawer/SwipeableDrawer remain unfinished.
Collapse now covers
the seven navigation and exam-preview imports at app `a7ce009f`, including
child identity, changing content heights and interrupted transitions. Tooltip now covers 16 rendering caller files (17 imports)
at app `47e3b4ef`, including keyboard/touch access, controlled copy notices and the
shared theme override. AvatarGroup covers eight authentication/coming-soon message
sections; CardActionArea covers linked club articles and Math Is Cool cards.
These are implementation claims; application adoption remains separate until the
required Material surface is complete. Motion remains parked.

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
