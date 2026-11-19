# Picocolors checks

Pinned controls: Picocolors 1.1.1 and PostCSS 8.5.8. Six owned tests cover SGR
formatting, coercion, nested styles, the early-closing-escape correction, long
sequences and independent factories. Differential checks compare 4,018 formatter
and nesting cases and 1,728 environment combinations. Browser entry points remain
inert. The unchanged PostCSS caller compares colored/plain source frames, syntax
errors and warnings. No upstream runtime was copied into the package.

```sh
npm --prefix scripts/picocolors-conformance ci --ignore-scripts
node --test packages/vpicocolors/test/*.test.cjs
bun test packages/vpicocolors/test
node scripts/picocolors-conformance/probe.cjs
bun scripts/picocolors-conformance/probe.cjs
node scripts/picocolors-conformance/caller.cjs
bun scripts/picocolors-conformance/caller.cjs
node scripts/picocolors-conformance/types.cjs
node scripts/picocolors-conformance/archives.cjs
```

Archives are installed with fresh and frozen npm and Bun, then checked on both
runtimes with CJS/ESM, tests and differential probes. Strict TS7 consumers compile
in NodeNext/Bundler modes. A browser-platform bundle checks export selection and
inert colors with no process global. Benchmarks use isolated, alternating
processes with identical-source controls; they measure formatter costs, not a
whole application build.
