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

[vmui-material](../packages/vmui-material) now has 45 independently implemented
components. It covers button controls; text/icons; Box/Paper/Divider; the form,
input, Select, checkbox/radio/switch foundation; menus; Chip, Avatar, loading
spinners, Skeleton placeholders, Container page layouts and Card/CardContent panels. Its resolved-theme bridge is built, but full Material theme creation
and all app-used component families are not. It cannot replace the entire
`@mui/material` dependency yet.

The largest unbuilt families in direct source use are:

| Family | Source imports | Why it matters |
| --- | ---: | --- |
| CardActionArea | 2 | Clickable club articles and Math Is Cool cards |
| Tooltip | 17 | Action explanations and compact shared controls |
| Dialog / content/title/actions | 11 / 8 / 8 / 9 | Confirmations and forms, including WARML |
| SwipeableDrawer | 11 | Shared navigation and side panels |
| AvatarGroup | 8 | Grouped identity displays |
| Table primitives | 8 each for Table/body/cell/head/row | Results and remaining direct Material tables |
| Collapse | 7 | Expandable content |
| Autocomplete | 5 | Searchable selection inputs |

Theme/style imports occur in 90 files. The shared theme factory and remaining
layout/overlay families are adoption requirements, not peripheral polish.
Dependencies such as Material React Table may also consume components that do
not appear as direct app imports; they need unchanged-caller acceptance before
a complete package override.

**Next bounded Material unit: CardActionArea.** Two direct source callers use it
for club articles and Math Is Cool cards. The underlying Card/CardContent and
ButtonBase implementations are now owned. Card and CardContent were rechecked at
`7970b7e5` on November 16, 2026: 24 and eight direct source imports, including
contest exam panels, WARML signup and practice cards. Their shared Paper/Card
theme overrides, responsive styles and native roots are verified. Container,
Skeleton and CircularProgress are built too. These are implementation claims;
application adoption remains separate until the required Material surface is
complete. Motion remains parked.

Nano ID is separate build infrastructure: PostCSS 8.5.8 uses its non-secure entry
to label anonymous CSS inputs. It is independently implemented and caller-tested.
