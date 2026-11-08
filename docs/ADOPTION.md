# Application adoption

Building a replacement, releasing it and adopting it are separate milestones.
Adoption here means a VPM artifact is reachable from VentiMath's committed
production dependencies. This is dependency adoption, not proof that every
installed module reaches a production bundle or a deployed feature.

Verified November 5, 2026 against the application's main branch, commit
`3c3ab9fa` (TanStack r3 installed; original cutover PR #409; VLX: `15a83287`; Floating UI: PR #406; styling: `245c1541`;
calendar: `63f63f6a`):

| Package | In use | Available update |
| --- | --- | --- |
| `vfullcalendar-react` | `calendar-7.1.3`, package 7.1.3 | `calendar-7.1.3-r5`: independent renderer with event identity, hour-label, drag and DST fixes, including repeated-hour visibility and timed defaults |
| `vfullcalendar-core` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vfull-ui-headless-calendar` | `calendar-7.1.3`, package 7.1.3 | Included in the same replacement release |
| `vclsx`, `vstylis` and 13 Emotion packages | `styling-11.14.1` | Current published styling release |
| Five `vfloating-ui-*` packages and `vtabbable` | `floating-0.27.20-r2` | Current published Floating UI release |
| `vlx` and its `vpngjs` dependency | `vlx-0.1.0-r7` | Native React SVG/MathML output |
| `vtanstack-react-query`, `vtanstack-query-core` | `tanstack-5.105.3-r3` | Current published release; corrected first-render retry state |

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

VentiMath main now consumes `tanstack-5.105.3-r3` through the original
`@tanstack/react-query` dependency key. Both VPM packages are adopted, bringing
the current total to **28 packages**. The [installation recipe](INSTALLATION.md#tanstack-query)
preserves the original import name for the app and React Devtools. Adoption is
verified from resolved release URLs, not dependency keys alone.

The Functions backend still consumes upstream Firebase Admin 14.5.0 and Firebase
Functions 7.4.0, not VPM archives. Its Admin modular-import migration is complete;
VPM adoption remains separate. [Backend coverage](BACKEND.md) records implemented
application paths and the remaining payment/image dependencies.

VentiMath main now pins `vlx-0.1.0-r7`; its shared math component imports
`InlineMath`, `DisplayMath`, `MathText` and `preloadMath` from `vlx/react`.
The lockfile resolves VLX and its sibling `vpngjs` archive, which brought verified
production-dependency adoption to **26 packages** before the TanStack cutover. VLX therefore receives the
**IN USE** gradient. The image helper is reachable in the installed dependency
graph but excluded from the browser math bundle. The Discord problem-image
caller still uses MathJax. This source verification does not establish which
application commit is currently deployed, nor complete manual screen-reader or
Safari/Firefox acceptance. See the [installation recipe](INSTALLATION.md#vlx-math-rendering).

The [VLX 0.2.0 release](https://github.com/VentiMath/vpm/releases/tag/vlx-0.2.0)
provides document-scoped equation numbering and references with
`renderDocument`/`MathDocument`. VentiMath has not yet adopted this version. The existing **IN USE** status refers to r7's rendering
API, not adoption of this new feature.

`vhello-pangea-dnd` is packaged for the app-used Scrumboard API in `dnd-18.0.1`.
The verified app main still depends on upstream `@hello-pangea/dnd` 18.0.1;
release availability is not adoption. See [installation](INSTALLATION.md).


## Navigation search release

`autosuggest-10.1.0` makes `vreact-autosuggest`, `vautosuggest-highlight`,
`vreact-themeable`, `vsection-iterator` and `vshallow-equal` consumable together.
The checked application main `21197a2c` still pins upstream react-autosuggest
10.1.0 and autosuggest-highlight 3.3.4. These five replacements are available,
not adopted. The [installation recipe](INSTALLATION.md#navigation-autosuggest)
changes two dependency URLs while retaining the existing imports; its internal
VPM dependencies are pinned in the release archives.

## Where VentiMath uses TanStack

Checked November 8, 2026 against application main `e14f4023`:

| Library | Actual application use | VPM status |
| --- | --- | --- |
| Query | The root `QueryClientProvider` supplies fetching, caching and mutation state. Callers include calendar, notifications, campus-quest, contest data and many other screens. | Main pins `tanstack-5.105.3-r3` under the original `@tanstack/react-query` name. This is committed adoption, not a deployment check. |
| Table | `src/components/data-table/DataTable.tsx` wraps Material React Table 3.2.1. Its only current screen callers are `ProductsTable` and `OrdersTable`; both use `mock/ecommerce/*` endpoints. | Main still resolves upstream react-table 8.20.6 and table-core 8.20.5. This is a template-screen dependency, not the contest/problem-table engine. |
| Virtual | Installed through Material React Table. No app source sets `enableRowVirtualization` or `enableColumnVirtualization`. | The independent VPM core and React adapter are built and tested, but not released or adopted. |
| Store | A dependency of current Table 9.3.1; the installed Table 8 stack has no direct Store dependency. | `vtanstack-store` is built and tested as an upgrade prerequisite, not an app-used replacement yet. |

The shared DataTable exposes sorting, filtering, pagination, grouping, selection,
column ordering/pinning and faceted values. These are library capabilities of
the two template callers; their presence does not establish use by a math or
contest workflow. Query adoption must not be conflated with adoption of the
Table/Virtual/Store packages.

`vtanstack-table-core` now independently covers that flat-table runtime contract,
with current 9.3.1 and app 8.20.5 controls. The unchanged MRT runtime passes
synthetic browser comparisons, but its React adapter/type integration and
consumer release are still separate work. The app remains on upstream Table.
