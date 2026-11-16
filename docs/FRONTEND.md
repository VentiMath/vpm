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

[vmui-material](../packages/vmui-material) now has 43 independently implemented
components. It covers button controls; text/icons; Box/Paper/Divider; the form,
input, Select, checkbox/radio/switch foundation; menus; Chip, Avatar, loading
spinners, Skeleton placeholders and Container page layouts. Its resolved-theme bridge is built, but full Material theme creation
and all app-used component families are not. It cannot replace the entire
`@mui/material` dependency yet.

The largest unbuilt families in direct source use are:

| Family | Source imports | Why it matters |
| --- | ---: | --- |
| Card / CardContent | 24 / 8 | Content panels, including Mustang Math |
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

**Next bounded Material unit: Card and CardContent.** These are used by contest
and WARML content panels as well as public article pages. Container is now built;
its 23 direct imports were rechecked at `ed4b5a05` on November 16, 2026, including
public results, signup and practice pages. Skeleton covers shared Fuse fallbacks,
contest archives/exams/search and WARML practice/signup loading shapes in 35 files.
CircularProgress covers contest results, Mustang exam loading and WARML save
states. These are independent VPM implementations; application adoption remains
separate until the required Material surface is complete. Motion remains parked.

Nano ID is separate build infrastructure: PostCSS 8.5.8 uses its non-secure entry
to label anonymous CSS inputs. It is independently implemented and caller-tested.
