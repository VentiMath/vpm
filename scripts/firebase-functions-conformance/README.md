# Firebase Functions conformance

Baseline: **firebase-functions 7.4.0**, the npm tarball recorded in the package
[provenance](../../packages/vfirebase-functions/PROVENANCE.json), checked October
31, 2026. The release's unit tests and fixtures (`spec`), Mocha setup and
configuration, manifest and license from the `v7.4.0` tag (commit
`8a8bae4484673c70bb201b1425daeeeb0e960381`) are retained under `upstream/`
(TypeScript files use a `.txt` suffix to avoid root test discovery) and verified
against `SHA256.json` before execution. Test tools are pinned at the versions in
the release's lockfile; the `firebase-admin` peer is 14.5.0, the version this
work targets (the release's own lockfile has 13.10.0). `genkit`, used by one
type-compatibility test, accounts for most of the fixture's install size.

```sh
npm --prefix scripts/firebase-functions-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/firebase-functions-conformance/run.cjs --upstream
node scripts/firebase-functions-conformance/run.cjs
node scripts/firebase-functions-conformance/regressions.cjs
node scripts/firebase-functions-conformance/callers.cjs
```

Repeat with Bun.

`run.cjs` compiles `spec` and `mocha/setup.ts` with the workspace TypeScript 7
compiler (no type checking, CommonJS output as upstream's ts-node runner
produces) into upstream's layout, with `src` linked to the implementation's
`lib` and `protos` and `package.json` beside them, and runs every spec with the
setup file. For VPM the tests' `firebase-admin` imports resolve to
`vfirebase-admin`, so tests and implementation share one app registry, and the
three optional GraphQL peers are exposed from the fixture.

The explicit [application selection](application-specs.json) runs **351 original
assertions** for both libraries. Node's original passes all 351; VPM keeps the four
previously verified exact span-ID corrections. Bun additionally has the same 25
console-capture differences on both sides. No assertions are rewritten. The
manifest spec uses the original V1 factory only to manufacture input records,
and Firestore specs use the original internal path-pattern constructor as input
to VPM helpers. Both substitutions are explicit in the runner; those APIs are
not claimed as VPM providers. The full original 996-test suite remains available
with `--upstream --all-upstream`; it is not the post-removal VPM contract.

Excluded files concern omitted providers, legacy-only APIs, lifecycle hooks or
the all-provider timeout matrix. Own deployment/runtime tests retain deep/frozen
manifest, discovery, timeout and request coverage for supported APIs. Completion
tests add exact Discord deadline options, platform-token context, missing auth,
retry responses, prototype-safe options, null debug flags, frozen parameter
specifications, CEL escaping and interpolation collision controls.

Some specs leave `process.env` and the SDK's config cache changed (one sets
`GCLOUD_PROJECT` to the string `"undefined"`), so four Database and Storage
tests that expect a missing-config error pass or fail depending on which files
ran first. Directory listing order differs between filesystems and runtimes, so
`run.cjs` loads the spec files in sorted order.

`regressions.cjs` runs each case in a fresh process per library: modules loaded
by importing `v2`, `v2/https` and `v2/firestore`; how many times `onInit` runs
for five concurrent first requests (five upstream, one here); and the bin with a
single directory argument.

`callers.cjs` builds VentiMath's function shapes with each library, in its own
process with emulator-style local token decoding, and serves the HTTP functions
from one shared `vexpress` host with the Functions Framework's body parsing:
`onRequest` with a secret, with CORS (preflight and request) and with a throwing
handler; `onCall` signed in, anonymous and with the wrong method; `onSchedule`;
and `onTaskDispatched`. A protobuf `DocumentEventData` CloudEvent goes to an
`onDocumentCreated` trigger. Responses, log entries (stack frames removed, except that VPM preserves the
null-prototype Express query object lost by upstream),
handler results and endpoint definitions must be identical, and each library's
bin, run from a functions directory as the Firebase CLI does, must write the
same deploy manifest.

Filtered runs (`--grep`) fail on every unexpected assertion failure, just as
the full gate does. The full gate additionally requires the exact upstream test
count and known exception set. Deployment regressions cover frozen endpoint
definitions, a 15,000-level structure, shared references, prototype-named own
fields, CJS/ESM identities and CORS finish-listener cleanup.

`VPM_APP_REPO=/path/to/ventimath-private node scripts/firebase-functions-conformance/app-types.cjs`
compares a temporary `origin/main` app snapshot with and without VPM declaration
paths; it never modifies the app. On `7a8aad2c`, both report the same 18 error
locations. Four existing mock-request diagnostics differ in their incompatible
Express field; the runner verifies exactly those changes. The other 14 diagnostics
match. Missing image dependencies mean this is not a clean app typecheck.
