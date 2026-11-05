# Application adoption

Building a replacement, releasing it and adopting it are separate milestones.
Adoption here means a VPM artifact is reachable from VentiMath's committed
production dependencies. This is dependency adoption, not proof that every
installed module reaches a production bundle or a deployed feature.

Verified November 4, 2026 against the application's main branch, commit
`ab3d22a2` (TanStack PR #409; VLX: `15a83287`; Floating UI: PR #406; styling: `245c1541`;
calendar: `63f63f6a`):

| Package | In use | Available update |
| --- | --- | --- |
| `vfullcalendar-react` | `calendar-7.1.3`, package 7.1.3 | `calendar-7.1.3-r2`: independently written application-scope renderer |
| `vfullcalendar-core` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vfull-ui-headless-calendar` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vclsx`, `vstylis` and 13 Emotion packages | `styling-11.14.1` | Current published styling release |
| Five `vfloating-ui-*` packages and `vtabbable` | `floating-0.27.20-r2` | Current published Floating UI release |
| `vlx` and its `vpngjs` dependency | `vlx-0.1.0-r7` | Native React SVG/MathML output |
| `vtanstack-react-query`, `vtanstack-query-core` | `tanstack-5.105.3-r2` | `tanstack-5.105.3-r3`: corrected first-render retry state |

Evidence: the top-level calendar release URL in `package.json`, all three
resolved release archives in `bun.lock`, and v7 calendar imports in the app's
calendar view/header. The first calendar release contains an adapted React
renderer; its presence in the application does not imply that the new
independent renderer has already been adopted.

The app's styling migration pins all 15 release archives in `package.json` and
`bun.lock`, and Vite aliases clsx, Stylis and every Emotion import to those VPM
packages. Those 15 packages are marked **in use** alongside the three calendar packages.
This records committed consumption, not a separately verified deployment. `vmemoize-one`, `vuse-sync-external-store` and `vshallow-equal` are implemented
and tested, but not yet adopted.

The standalone progress tree uses a teal/blue/purple gradient and **IN USE** badge
for verified adoption. Green means available; yellow tracks partial work;
purple means made unnecessary; red means not started. Adoption and implementation
scope remain separately documented even when a row is collapsed.

PR #406 merged the Floating UI cutover for the Tiptap documentation editor
example. The top-level release URL, all six resolved VPM archives and the three
primitives' imports are present on main. These six packages bring verified
dependency adoption to **24 packages**. The upstream React entry and tabbable
leave the lockfile; lower upstream Floating UI packages remain for MUI/Radix.
This does not establish production bundle savings or deployment of a new feature.

The revised `tanstack-5.105.3-r2` release prepares `vtanstack-react-query` and
`vtanstack-query-core` for the next application cutover. Neither is adopted in
checked app commit `15a83287`; they must remain available, without an **IN USE**
badge. The [installation recipe](INSTALLATION.md#tanstack-query) preserves the
original `@tanstack/react-query` import name while resolving it to the VPM
archive, including for React Devtools. Adoption should be verified from the
resolved release URL, not the dependency key alone.

The Functions backend still consumes upstream Firebase Admin 14.5.0 and Firebase
Functions 7.4.0, not VPM archives. Its Admin modular-import migration is complete;
VPM adoption remains separate. [Backend coverage](BACKEND.md) records implemented
application paths and the remaining payment/image dependencies.

VentiMath main now pins `vlx-0.1.0-r7`; its shared math component imports
`InlineMath`, `DisplayMath`, `MathText` and `preloadMath` from `vlx/react`.
The lockfile resolves VLX and its sibling `vpngjs` archive, bringing verified
production-dependency adoption to **26 packages**. VLX therefore receives the
**IN USE** gradient. The image helper is reachable in the installed dependency
graph but excluded from the browser math bundle. The Discord problem-image
caller still uses MathJax. This source verification does not establish which
application commit is currently deployed, nor complete manual screen-reader or
Safari/Firefox acceptance. See the [installation recipe](INSTALLATION.md#vlx-math-rendering).

`vhello-pangea-dnd` is packaged for the app-used Scrumboard API in `dnd-18.0.1`.
The verified app main still depends on upstream `@hello-pangea/dnd` 18.0.1;
release availability is not adoption. See [installation](INSTALLATION.md).
