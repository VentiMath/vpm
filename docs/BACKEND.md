# Backend coverage

VPM has completed independent implementations of the documented application-used
HTTP, Firebase and Google client APIs. **The entire backend is not finished, and
those implementations have not been adopted by VentiMath's Functions app.**

The consumption snapshot below is VentiMath main `a7ce009f`, checked November 17,
2026, using `functions/package.json`, `functions/bun.lock` and actual source
imports. A lockfile upgrade is not evidence of installing a VPM replacement.

## Implemented application paths

The [Functions Framework](../packages/vfunctions-framework),
[Firebase Functions](../packages/vfirebase-functions),
[Firebase Admin](../packages/vfirebase-admin),
[Google Auth](../packages/vgoogle-auth-library),
[Firestore](../packages/vgoogle-cloud-firestore) and
[Cloud Storage](../packages/vgoogle-cloud-storage) have independent implementations
for the supported application APIs, backed by their caller tests and package
provenance. Their HTTP, authentication, GAX, gRPC and protobuf foundations are
also covered within the documented scopes.

This does not claim every upstream SDK export is implemented. Unused providers,
server/experimental transport exports, generated protocol data and retained
compatibility surfaces are identified separately in each package's provenance.
Benchmark improvements are local measurements, not measured production gains.

VentiMath now declares upstream Firebase Admin `^14.5.0` and Firebase Functions
`^7.4.0`. Its Functions source uses modular Admin imports such as `/app`, `/auth`,
`/firestore` and `/messaging`. The old Admin 12 namespace migration is no longer
the adoption blocker. Package release/consumption and application validation
remain separate work. Functions does consume the VLX image release described below;
its HTTP/cloud SDK dependencies still come from upstream.

## Payment and image production dependencies

These are real backend dependencies omitted from the earlier HTTP/cloud
comparison inventory. The versions below describe the application's lockfile,
not a decision to recreate an older upstream release.

| Dependency | Locked version | Application use | VPM status |
| --- | --- | --- | --- |
| `stripe` | 17.7.0 | Checkout sessions and signed completion webhooks in `functions/src/payments.ts` | [vstripe](../packages/vstripe): independent app-used APIs targeting current 23.1.0 completed; not released or adopted |
| `vlx` | 0.2.3 | TeX/page layout in `functions/src/problemPicture.ts` | [VLX](../packages/vlx) release adopted; `mathjax-full` removed from the Functions production dependencies |
| `@resvg/resvg-js` | 2.6.2 | Rasterizes VLX SVG into Discord PNG pictures | Required Functions dependency; still upstream native code, with no independent rasterizer replacement |
| `vpngjs` | 7.0.0 | Figure validation through `vlx/problem` | [Independent PNG reader](../packages/vpngjs), adopted through the VLX release; upstream `pngjs` remains a development comparison dependency |

The Stripe replacement covers Checkout session creation and raw-body snapshot
webhook verification, with Node/Bun controls against both SDK 23.1.0 and the
app's 17.7.0. It uses native Fetch and crypto and has no runtime package
dependencies. Other Stripe resource APIs and thin event notifications are outside
the checked app scope. Its default API version matches 23.1.0; adoption requires
reviewing that upgrade or explicitly retaining the app's chosen API version.
The app's webhook endpoint version and fulfillment logic are separate concerns.

The PNG reader has Node/Bun corpus controls and passes the app's unchanged image
tests with its module substituted. It validates figures and exposes decoded pixels;
it does not render TeX/SVG or replace resvg's rasterization stage.

Their dependencies belong in the backend inventory too. Optional native binaries
are platform artifacts, not automatically separate JavaScript rewrite projects.
A dependency may instead disappear when its caller is redesigned; that decision
needs caller evidence, not merely a package count.

### Why resvg says optional

VLX declares resvg as an **optional peer** because browser math and SVG output do
not need it. Its PNG methods load resvg on demand. VentiMath's Functions manifest
explicitly installs resvg as a normal production dependency, and
`problemPicture.ts` calls `renderProblemPng`. Removing it would break Discord
picture generation. The main frontend VLX bundle does not use this native code.

Resvg itself lists twelve optional packages for different operating systems,
CPU architectures and Linux C libraries. The installer selects the applicable
precompiled native binary. These are builds of one renderer, not twelve separate
JavaScript algorithms. See the [upstream platform matrix](https://github.com/yisibl/resvg-js#support-matrix).

There is no in-house resvg replacement yet. The useful independent work would be
a rasterizer for **VLX's own drawing output**: glyph paths, transforms, fills,
antialiasing, embedded figure pixels and PNG encoding. A renamed loader around
the same native engine would leave the dependency intact. General SVG/CSS/font
support is a substantially broader project and is not required merely to draw
VLX problem pages. Neither scope is marked complete in the package atlas.

## Unified math rendering

[VentiLaTeX (VLX)](../packages/vlx), pronounced “Vee Ell Ex,” independently parses TeX and lays out browser formulas
and complete problem SVG/PNG pages, including prose, figures and choice grids.
All 28 unchanged application picture tests pass on Bun. Its local corpus audit
renders 8,470 math spans and 1,275 full normalized statements; that snapshot is
not a production-wide inventory or proof of visual equivalence. Fifty-three public
synthetic cases and page geometry/corruption checks run on Node 24 and Bun.

The separate November 3 frontend dump audit covers 99,635 expressions in 15,107
documents; all 99,184 accepted by the app's KaTeX baseline render in VLX. This is
frontend coverage, not a Discord picture migration. After verified repairs to 165 statements and two current rubrics, all 99,635
expressions render in unchanged VLX r4. This overlays only the repaired source
onto the original dump; historical rubric revisions remain preserved.

KaTeX 0.19.1 and MathJax 4.1.3 remain synthetic test controls. VLX reuses attributed font
outlines/metrics, the VPM PNG validator and resvg for PNG rasterization;
it does not route between upstream math engines. Chrome theme, enlargement, reflow, keyboard and structured-MathML checks now pass.
Actual screen-reader/other-browser acceptance is still pending. Committed app
main uses VLX 0.2.3 for shared frontend math and Discord pictures. This corrects
the earlier snapshot that still described KaTeX/MathJax callers; committed
adoption is not a fresh production-deployment check. The
[VLX release](INSTALLATION.md#vlx-math-rendering) supplies immutable archives with
the VPM PNG dependency pinned.

## Reading progress correctly

The [comparison fixture](../scripts/consumers/package.json) is a reproducible
HTTP/cloud test baseline. It is not a complete inventory of VentiMath's backend.
The package atlas now combines current Functions production roots with that
historical comparison graph, and retains frontend work separately. A newer built
replacement completes the package family even when an old lockfile version is
shown. That is implementation coverage, not application adoption.

`form-data` 2.5.5 remains in the historical fixture; neither current app lockfile
contains `form-data`. Current upload callers use native `FormData`/`Blob`, and
VPM's Fetch callers use supported-runtime facilities. Its legacy helpers do not
need separate replacement packages for those paths. A still-retained upstream
Fetch 3 branch can contain `formdata-polyfill`; it disappears with the caller
cutover, not by changing the historical fixture alone.

See [application adoption](ADOPTION.md) for installed VPM artifacts and the
[comparison catalog](../IMPROVEMENTS.md) for implementation evidence. Recheck the
actual application manifests, lockfiles and imports before claiming backend
completion or marking an available package as in use.
