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

All **996 tests** pass for the original on Node. VPM passes 991. Four trace
assertions encode upstream's floating-point rounding of a 64-bit span ID. The
runner leaves those tests unchanged and accepts only the exact conversion from
`2450465917091935019` to `2201cdc4ba77732b`, with every other asserted field
unchanged. Focused tests independently verify this and the unsigned 64-bit limit.
The remaining test reads `DataSnapshot#ref`, which needs the Realtime Database client
vfirebase-admin omits, and must fail with its explanation. On Bun both
libraries also fail the same 25 logger tests, which capture output by replacing
`process.stdout.write`; Bun's `console` does not call it (the logger's output
is identical). `run.cjs` requires exactly these sets.

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
