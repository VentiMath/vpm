# Release readiness

Snapshot: November 23, 2026. The workspace has **275 package folders**. GitHub has
**19 release families**, with 49 published revisions and archives for **82 distinct
package folders**. Thus 193 folders have no published archive. A release family
can contain many dependencies; neither folder count nor release count is an app
adoption count. The removed CSS-to-React-Native chain is one example of a published
family that the app no longer needs. The standalone `pngjs-7.0.0` release adds
fixture construction/writing to an already-published package, so the distinct
package count remains 82; direct app adoption is still separate.

There is a publication backlog: development has outpaced packaging and adoption.
The whole project does not need to be finished before more packages can ship.
However, implementation tests, independence of the runtime, a consumable release,
and acceptance in the current app are separate requirements. Some old catalog
entries blurred those boundaries.

| Group | Current state | What stands between it and app use |
| --- | --- | --- |
| `vmui-material` | In progress for a complete override; 100 components and the app-used theme factory are implemented. Full app typecheck and production build pass in an isolated VPM install. | Representative route/browser acceptance, a pinned 22-package closure release and app repin. Unsupported unused Material families do not have to be built first, but passing the build alone is not visual acceptance. |
| `vmui-system`, `vmui-utils`, `vmui-styled-engine`, `vmui-private-theming` | Finished for the documented app scope; unreleased. | Publish with Material so its context, theme, styling and types stay consistent. Their local component/caller/archive tests already exist. |
| `vnotistack`, `vi18next` / `vreact-i18next` | Finished for documented app notification and translation APIs; unreleased. | Package exact dependency closures, fresh-install checks and app notification/language-switch acceptance. Notistack custom transitions and i18next's unobserved plugin/rich-text APIs are outside scope. |
| `vreact-hook-form`, `vhookform-resolvers`, `vzod` | Finished for the checked form/schema scope; unreleased. | Release a compatible form stack and validate current app forms/schema imports together. Zod's entire internal/plugin protocol and Hook Form's dynamic field-array/lens APIs are not implemented. Zod parsing regressions remain documented; they are not missing functionality or an automatic publication veto. |
| `vdate-fns` | Finished for app date displays and the checked MUI adapter, using plain Date/en-US; unreleased. | Preserve every per-function and locale import in the release; rerun actual date-picker and timezone/DST checks on app adoption. Other locales, FP and UTCDate/TZDate modes are outside scope. |
| `vmoment` | Finished for FuseCountdown's fixed-unit/date arithmetic scope; unreleased. | Small release and caller check. The caller is coming-soon templates, not contest exam timers; this is lower priority than broadly used app dependencies. Full Moment formatting/plugins are not implemented. |
| `vfirebase-admin`, `vfirebase-functions`, `vgoogle-auth-library`, `vgoogle-cloud-firestore`, `vgoogle-cloud-storage` | Application-facing implementations complete for their documented scope; unreleased. Not the entire upstream SDK surface. | Reconcile current app imports, review the complete runtime closure for retained upstream implementations, package immutable internal URLs, then run deployment-style install, Functions discovery/emulator/caller tests and credential/transport acceptance. No deployment is implied. |
| `vgoogle-gax`, `vgrpc-js` and protocol foundations | App-used Firestore/client paths implemented and tested; unpublished. Some packages retain attributed protocol data and unused compatibility/server runtime. | Separate generated data from executable code and keep unnecessary retained runtime out of an all-in-house consumer closure. Validate retries, streams, cancellation, auth and transaction behavior through the SDK callers when publishing. |
| `vexpress`, `vrouter`, `vfunctions-framework` | Functionally implemented and tested, but still upstream-derived. **The in-house rewrite requirement is not complete.** | Independently replace the used runtime before describing the backend closure as wholly in-house, then publish and exercise actual HTTP/callable/discovery paths. Existing tests are useful acceptance evidence, not proof of independent implementation. |
| Older HTTP/encoding/XML/telemetry helpers | Built compatibility implementations with tests, unpublished; source status varies. | Do not blanket-label them independent. Known source-derived entries include `vnode-fetch`, `viconv-lite`, `vproto3-json-serializer`, `vfast-xml-parser`, `vfast-xml-builder` and `vopentelemetry-api`. Check executable code versus attributed tables/declarations, rewrite app-used retained runtime where required, and release through their callers. |
| `vstripe` | Checkout and signed snapshot webhook APIs finished for the documented app scope; unreleased. | Publish the dependency-free archive; validate the SDK API-version transition (target 23.1.0 versus app 17.7.0), raw-body verification and existing fulfillment caller. Other Stripe resources are not implemented. |
| `vuuid` | UUID 9 backend contract implemented; not a general replacement for the app's UUID 11 browser dependency. | Verify the current browser caller and remove Node-only crypto assumptions or use the caller's native UUID facility. Do not repin it globally just because v4 exists. |
| `vprosemirror-model`, `-transform`, `-state`, `-schema-list`, `-commands`, `-history`, `-keymap` and helpers | Documented model/editing units implemented, unreleased; whole editor acceptance still pending. | Preserve the requested feature-complete editor gate. Do not sell these as a complete editor cutover. Some can technically ship separately, but they do not complete View/input behavior. |
| `vprosemirror-view` | Partial, parked: decorations/read-only rendering; no public EditorView. | Hit testing, node views, native selection/input, IME, clipboard and full editor/browser acceptance. This is real implementation work, not a missing release tag. |
| `vredux` | Store APIs implemented and tested; unreleased. | No present need to add it for the app's VPM drag-and-drop: `vhello-pangea-dnd` has no Redux runtime dependency. A new actual caller would justify a release. |
| `vtanstack-react-virtual` / `vtanstack-virtual-core` | Finished for documented single-lane table virtualization scope; unreleased. | A paired release and app caller acceptance when virtualization is enabled. Current flat table callers do not explicitly enable it; installing another package alone creates no feature. Masonry/end-anchored feeds and iOS momentum are excluded. |
| `vobject-hash`, `vordered-map`, `vfunctional-red-black-tree` | Not needed by the current owned caller graph; retained comparison/legacy code, not completed independent replacements. | Their callers eliminated them. Do not publish or rebuild them merely to increase a count. |
| `vnode-types`, `vundici-types` | Declaration-only work based on Node 22 / Undici 6; not runtime replacements. | Refresh to the supported Node baseline and check current consumers before adoption. Their old baseline is not an invitation to restore Node 22 runtime support. |
| Build-tool leaves, source-map helpers and other small frontend foundations | Built to documented contracts, generally unpublished; not all have a current app caller. | Choose current callers, pack the needed closure and repeat fresh-install/caller gates. Babel helpers do not replace Babel itself. Redoc-only `vdecko` / `veventemitter3` evidence is historical after the viewer's removal. No need to adopt packages whose callers disappeared. |

The practical next publication candidates are notifications, the translation pair,
the form stack and date utilities, each with its existing app caller checks. They
need not wait for Material, the editor or a backend-wide cutover. This is a
readiness recommendation, not a claim that those releases have been published.

[Backend scope](BACKEND.md), [frontend scope](FRONTEND.md), package READMEs and
provenance remain the detailed contract. The status above does not assert that
all historical package tests were rerun on the day of this inventory.
