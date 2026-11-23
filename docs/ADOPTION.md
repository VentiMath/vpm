# Application adoption

Building a replacement, releasing it and adopting it are separate milestones.
Adoption here means a VPM artifact is reachable from VentiMath's committed
production dependencies. It does not prove that every installed module reaches
the production bundle or that the corresponding commit has been deployed.

## VLX 0.3.2 application verification

The application-side report for PR #455 at `b7d73475` verifies the 0.3.2 release
assets against SHA256SUMS. GitHub confirms the PR is open and changes only the
frontend and Functions manifests and lockfiles. Its actual manifest changes are
frontend 0.3.1 → 0.3.2 and Functions 0.2.3 → 0.3.2; the reported rendering
comparison uses 0.2.3 as its control.

For 1,260 real problem statements, including 156 with choices, the report finds
byte-identical `renderDocument` HTML and identical problem PNG dimensions.
PNG differences are reported as antialiasing: a median 6.1% of pixels differ,
at most 10.5%, with no channel differing by more than 96/255. One statement
errors in both versions. This does not claim byte-identical PNGs or error-free
rendering of every source statement.

The combined Node HTML-plus-PNG workload takes **24.6 seconds versus 12.8
seconds**, about **1.92× the time**. This is an application-reported regression,
not a separated measurement of HTML rendering, rasterization or PNG encoding.
Profiling those stages on the same corpus remains a follow-up; earlier synthetic
raster benchmarks do not supersede this result.

A deploy-style npm installation of Functions succeeds and renders. Chrome on
a real problem page shows 44 math elements without page errors; copying the
statement produces TeX with delimiters. Lint, both typechecks and preflight pass,
as do Functions' 193/193 and the site's 457/457 test files. These are reported
branch checks, not a confirmed merge or production deployment.

**resvg remains an application dependency.** VLX 0.3.2 owns its problem-picture
rasterization, but `functions/src/writeupPicture.ts` still calls
`@resvg/resvg-js` for handwritten writeup SVGs. That import was independently
confirmed in application source. Repinning VLX does not eliminate this caller or
its native platform binaries; the atlas must keep them outstanding.

## Motion r2 application verification

The application-side report for PR #454 at `48d8d5d7` confirms installation of
`motion-14.7.0-r2`, with CalendarAppView passing 8/8 tests, PoweredByLinks passing
13/13 and the full site suite passing 457/457 files. Lint, typechecks and
preflight also pass. These are reported application results, separate from the
isolated checks run in VPM.

On the public 404 page in Chrome, animated elements reach the same final state
as upstream Motion 12.20.5, with no page errors. Signed-in pages have not been
compared in Chrome; final-state equality does not establish identical animation
timing or intermediate frames.

GitHub confirms PR #454 is open and unmerged at that head. This establishes a
verified adoption branch, not adoption on application main or a deployment.
The atlas keeps its merged dependency status separate from this branch evidence.

## Dependency removal on November 18, 2026

Application main `211e2186` removes styled-components, the unused Redoc API-docs
viewer and their dependency chain. Its manifest and lockfile no longer contain
styled-components, css-to-react-native or the vcss-to-react-native override.
The converter was installed but never executed by the app; its only importer
was styled-components' native entry. No converter bug caused the removal.

The VPM converter and helpers remain implemented and tested. They should not be
counted as currently adopted merely because an earlier app revision installed
them. Redoc service/SSR checks for vdecko, veventemitter3 and vclassnames remain
valid historical compatibility evidence, but the removed viewer is no longer an
active VentiMath caller. The proposed url-template work is therefore deferred
unless another current caller establishes a need. This is a main-branch dependency
check, not a production-deployment assertion.

## Earlier adoption baseline

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

## Ky HTTP client

Checked November 9, 2026 against application main `d8b5ccfa`: the shared API
factories and their problem/contest callers still use upstream Ky 1.8.1.
`vky` 2.2.0 is independently built and verified, but is not released or adopted.
Its root follows the current URL, hook and HTTP-error-data contracts. The explicit
`vky/legacy` entry preserves `prefixUrl`, positional hooks and readable error
responses for the existing callers. Publishing an archive and selecting that
entry are separate migration steps; changing the dependency URL alone would not
preserve those APIs. See [vky coverage](../packages/vky/README.md).

## Handwritten-page renderer release

`resvg-2.6.2` is published from VPM `fff4905f`, with `vresvg` 2.6.2 and a pinned
`vpngjs` 7.0.0 archive. Public-URL npm/Bun installs, checksums, original import
alias, CJS/ESM, Node/Bun PNGs and TS7 checks passed. The unchanged writeup caller
at app `f79f2ffe` passes its two tests and 18 synthetic page cases on Bun and
Node-targeted transpilation. No private handwriting or app source is published.

Application adoption is pending. Use this alongside or after the VLX 0.3.2
upgrade in PR #455; VLX 0.2.3 still depends on native resvg's broader API. No
writeup source change or special option is needed. The atlas marks the package
built and the native artifacts avoidable, without claiming installed adoption.

Curved synthetic pages take 91.6 ms versus native 12.1 ms on Node and 177.5 ms
versus 12.1 ms on Bun. Native font discovery was disabled for a fair rendering
comparison. This release removes the native dependency; it is not a speedup.
[Full measurements](../packages/vresvg/bench/README.md).
