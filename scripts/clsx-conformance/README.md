# clsx comparison fixtures

Reference: **clsx 2.1.1**, checked November 1, 2026, commit
`925494cf31bcd97d3337aacd34e659e80cae7fe2` in [lukeed/clsx](https://github.com/lukeed/clsx).
The published package and caller dependencies are pinned in `package-lock.json`.
Retained tests and license are checked against `upstream/SHA256.json`.

```sh
npm --prefix scripts/clsx-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/clsx-conformance/run.cjs
node scripts/clsx-conformance/callers.cjs
node --test packages/vclsx/test/index.test.cjs
```

Repeat with Bun. The upstream test runner changes only the implementation import;
all 32 test groups are unchanged. The caller fixture renders Button, Chip, Alert and Box
with React 19.1/MUI 7.2, the application's versions, in separate original/VPM
processes. It instruments the resolved clsx export before loading MUI and checks
that both implementations actually receive the same number of calls. These are
SSR class-name checks, not full browser interaction or application migration.

The package tests compare 5,000 deterministic generated inputs and separately
verify deliberate own-property dictionary behavior, deep arrays and cycle errors.
`archives.cjs` checks packed npm/Bun installations, native CJS/ESM entries, a
browser-targeted bundle, and TypeScript 7 without ambient platform types.
The new package remains a leaf. Caller libraries are development fixtures only.
