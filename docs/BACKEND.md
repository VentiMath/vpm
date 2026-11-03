# Backend coverage

VPM has completed independent implementations of the documented application-used
HTTP, Firebase and Google client APIs. **The entire backend is not finished, and
those implementations have not been adopted by VentiMath's Functions app.**

The consumption snapshot below is VentiMath main `0f2ef94b`, checked November 3,
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
remain separate work; the checked Functions dependencies contain no VPM archives.

## Remaining production dependency roots

These are real backend dependencies omitted from the earlier HTTP/cloud
comparison inventory. The versions below describe the application's lockfile,
not a decision to recreate an older upstream release.

| Dependency | Locked version | Application use | VPM status |
| --- | --- | --- | --- |
| `stripe` | 17.7.0 | Payment operations, imported by `functions/src/payments.ts` | No replacement; inspect the used payment APIs before choosing scope |
| `mathjax-full` | 3.2.2 | TeX to SVG in `functions/src/problemImage.ts` | No replacement; needs a rendering/API and current-upstream assessment |
| `@resvg/resvg-js` | 2.6.2 | SVG rasterization in `functions/src/problemImage.ts` | No replacement; native engine reuse versus wrapper replacement is undecided |
| `pngjs` | 7.0.0 | PNG image processing in `functions/src/problemImage.ts` | No replacement; a leaf candidate in the image pipeline |

Their dependencies belong in the backend inventory too. Optional native binaries
are platform artifacts, not automatically separate JavaScript rewrite projects.
A dependency may instead disappear when its caller is redesigned; that decision
needs caller evidence, not merely a package count.

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
