# Application adoption

Building a replacement, releasing it and adopting it are separate milestones.
Adoption here means a VPM artifact is reachable from VentiMath's committed
production dependencies. It does not prove that every installed module reaches
the production bundle or that the corresponding commit has been deployed.

Verified November 8, 2026 against application main `e14f4023`, using its frontend
and Functions manifests, lockfiles and relevant imports:

| Package family | Committed release | Caller or adoption limit |
| --- | --- | --- |
| Three calendar packages | `calendar-7.1.3-r5` | Calendar page; independent renderer and DST fixes are adopted. |
| clsx, Stylis and 13 Emotion packages | `styling-11.14.1` | App styling aliases and resolved dependencies. |
| Five Floating UI packages and tabbable | `floating-0.27.20-r2` | Tiptap documentation example. Other upstream Floating UI copies remain for MUI/Radix; no bundle-wide removal is claimed. |
| VLX and vpngjs | `vlx-0.2.3` | Shared frontend math and Functions' Discord problem pictures. |
| TanStack Query core and React adapter | `tanstack-5.105.3-r3` | Application fetching, caching and mutations; original import name retained. |
| hello-pangea-dnd | `dnd-18.0.1` | Scrumboard dependency cutover. |
| Radix Dropdown Menu and its VPM closure | `radix-dropdown-2.2.1` | Dependency pin/override adopted; this alone does not establish an active application menu. |
| Autosuggest and its helpers | `autosuggest-10.1.0-r2` | Navigation search; original import names retained. |
| Stylis RTL middleware and CSSJanus | `stylis-plugin-rtl-2.1.1` | Theme RTL middleware; CSSJanus is pinned inside the release. |

The package atlas derives its **IN USE** gradient from resolved adoption, rather
than a manually maintained total. Green means built, yellow partial work,
purple unnecessary and red not started. Implementation, dependency adoption,
actual caller use and deployment remain distinct.

The shared frontend math component imports `InlineMath`, `DisplayMath`,
`MathText` and `preloadMath` from `vlx/react`. Functions' `problemPicture.ts`
loads `pngSize` and `renderProblemPng` from `vlx/problem`; its manifest and lock
resolve the same 0.2.3 release. The previous claim that Discord still used
MathJax described an older application commit. The version includes equation
references, but version adoption alone does not mean the app calls that API.
VoiceOver/NVDA and Safari/Firefox acceptance remains open; see
[VLX accessibility evidence](../packages/vlx/ACCESSIBILITY.md).

The Functions backend still consumes upstream Firebase Admin and Firebase
Functions, not VPM archives. The Admin modular-import migration is complete;
VPM SDK adoption remains separate. [Backend coverage](BACKEND.md) records the
implemented application contracts. [Installation](INSTALLATION.md) records the
release pins and verification procedures.

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
synthetic browser comparisons. `vtanstack-react-table` now also covers the
current v9 hooks and the app’s v8 adapter contract, including exact React 19.3.1
archives, hydration and strict type comparisons. Its [three-package release](INSTALLATION.md#tanstack-table) contains the adapter,
core and Store. Application adoption remains separate work.
The app remains on upstream Table.

App PR #421 was still open when its head `77b3abac` was checked. It replaces
those template screens with `/apps/math-resources` and `/apps/contest-season`,
plus detail routes, retaining the shared DataTable and flat rows. Its exact
column functions and DataTable options pass isolated upstream/VPM browser checks
for undefined-last sorting, custom sort/filter callbacks, select/multi-select,
facets, grouping and page selection. Synthetic equivalents are permanent VPM
regressions. This is verification of a pending caller migration, not proof of a
merged PR or application adoption. The three-package Table release is now public.

`vmaterial-react-table` independently implements that same flat DataTable and
custom toolbar contract. Its exact archives and 37 caller snapshots are verified
against MRT 3.2.1, including actual Chrome control actions. It is available in the
[Material React Table release](INSTALLATION.md#material-react-table); adoption
has not been verified. Its independent markup and the omitted editing,
nested-header/data, resizing and virtualization APIs are documented in its
[package README](../packages/vmaterial-react-table/README.md).
