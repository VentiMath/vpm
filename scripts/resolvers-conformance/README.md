# Zod adapter conformance

Controls are @hookform/resolvers 7.0.6 and the application's 5.0.1, with Zod
4.6.7 and the application's 3.24.3. The 240 comparisons exercise stripped and
raw values, transformations/defaults, nested fields, array roots, unions,
cross-field errors, repeated error codes and asynchronous refinements.

The existing React form scenario is run unchanged with both adapters: 46
snapshots each on VPM, current upstream and application-version React Hook Form.
Chrome uses the new adapter for VPM and the original adapter for both controls.
Safety tests exercise frozen issues, prototype paths, real exceptions, native
validity and ref preservation. Types check Zod 3/4 input/output transforms,
both form libraries and invalid configurations using TypeScript 7.

```sh
npm --prefix scripts/resolvers-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/hook-form-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vhookform-resolvers/test/resolver.test.cjs
bun test packages/vhookform-resolvers/test/resolver.test.cjs
node scripts/resolvers-conformance/run.cjs
bun scripts/resolvers-conformance/run.cjs
node scripts/resolvers-conformance/forms.cjs
bun scripts/resolvers-conformance/forms.cjs
node scripts/resolvers-conformance/types.cjs
VRESOLVERS_ZOD="$PWD/packages/vhookform-resolvers/zod.cjs" node scripts/hook-form-conformance/browser.cjs
node scripts/resolvers-conformance/archives.cjs
```

Archive checks install the actual tarball with npm and Bun, repeat locked
installs, verify ESM/CJS and installed declarations, and rerun behavior tests
against the installed adapter. Local fixture dependencies are comparison-only.
The shipped package has no dependencies.
