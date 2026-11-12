# Zod caller contract

Pinned controls: Zod 4.6.7 and VentiMath's 3.24.3. The public matrix runs 2,924
synchronous/asynchronous output and structured-error comparisons plus 3,000
deterministic email acceptance checks, including
recursive documents, dirty/fatal validation, optional defaults and transforms.
The email regex text is deliberately excluded from issue equality; acceptance,
messages and the other issue metadata remain checked.

The read-only application audit extracts 34 unchanged schema expressions from
21 source files at `664673678be2699602121ff2ceee0189c12a7e12`. It evaluates
4,318 sample/schema pairs against current Zod, using the real shared URL policy,
an identity translator and a synthetic label list. Private source stays in
memory and is never shipped. Two legacy factory signatures are explicitly
adapted in the current control: string-key record shorthand and enum
`required_error`. Against Zod 3, the 15 acceptance/output differences are
note defaults filled by Zod 4. Error format changes from Zod 3 are expected.
The existing note refinement that accesses `this.parent` when its synthetic
flag is true throws with both controls and VPM; that application issue is not
silently repaired by the validation engine.

```sh
npm --prefix scripts/zod-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/hook-form-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vzod/test/schema.test.cjs
bun test packages/vzod/test/schema.test.cjs
node scripts/zod-conformance/run.cjs
bun scripts/zod-conformance/run.cjs
node scripts/zod-conformance/forms.cjs
bun scripts/zod-conformance/forms.cjs
node scripts/zod-conformance/types.cjs
VZOD_ENTRY="$PWD/packages/vzod/index.cjs" VRESOLVERS_ZOD="$PWD/packages/vhookform-resolvers/zod.cjs" node scripts/hook-form-conformance/browser.cjs
node scripts/zod-conformance/archives.cjs
# Optional private checkout audit; no writes or application startup:
node scripts/zod-conformance/callers.cjs /path/to/ventimath-private
```

The form scenario compares 46 snapshots on each of VPM, current upstream and
application-version React Hook Form. Chrome exercises the complete VPM stack.
Safety tests cover cycles/depth, own-property semantics, default isolation,
regex state, exception propagation and native error helpers. TypeScript 7 checks
ESM/CJS and bundler consumers with inferred schema/form input and output types.
Archive checks install actual tarballs with npm/Bun, then repeat locked installs
and run installed behavior/type checks. These checks do not claim a full app
cutover or end-to-end application acceptance.

The invalid-form benchmark reads `.error.issues` inside the timed function,
measuring consumed diagnostics rather than an error object whose work may be
deferred. Both implementations receive the same inputs and consume the same
result fields. Construction and reused-schema parsing are reported separately.
