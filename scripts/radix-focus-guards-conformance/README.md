# Radix focus-guard controls

Pins @radix-ui/react-focus-guards 1.2.0, @radix-ui/react-menu 2.2.1 and React 19.2.4.
`run.cjs upstream|vpm client|server` checks actual effect lifetime and SSR. Both
implementations get the same fixtures; the multi-document case records the
upstream global-pair defect and requires independent ownership from VPM.
The unchanged current Menu caller receives only the focus-guard substitution.

`archives.cjs` packs the package, installs it with npm and Bun in clean consumers,
and checks shared CJS/ESM exports, SSR, TypeScript 7 NodeNext/Bundler DOM-only
usage and a browser bundle. The package tests run the behavioral controls and
verify pinned source hashes. CI runs both runtimes and the archive checks.

The process-isolated benchmark measures repeated mounting of two consumers and
cleanup using React DOM's synchronous flush in jsdom. Both consumers share one
pair and leave no guards after cleanup. It includes React and jsdom costs; it
is not a browser focus-navigation or layout benchmark.
