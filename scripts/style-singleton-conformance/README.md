# Stylesheet singleton checks

Uses the existing locked [sidecar fixture](../sidecar-conformance/package.json):
react-style-singleton 2.2.3, react-remove-scroll 2.7.2 and React 19.1.0.

Run `npm --prefix scripts/sidecar-conformance ci --ignore-scripts`, then
`node scripts/style-singleton-conformance/run.cjs` and the corresponding Bun
command. Eleven scenarios run against each implementation: SSR, server-to-browser
reuse, shared references and nonce precedence, external removal, extra cleanup,
independent factories, StrictMode, static and dynamic changes, and the unchanged
scroll-lock caller with two mounted locks. Three intentional repairs have
explicit original/VPM expectations; they are not counted as upstream parity.
Tests are newly authored contract checks, not an upstream test-suite import.

`node scripts/style-singleton-conformance/archives.cjs` packs both VPM packages,
installs them in clean npm/Bun consumers and checks Node/Bun CJS/ESM identity,
SSR, a browser bundle with no original runtime, and strict TS7 JSX declarations.
Local file dependencies here are fixture inputs, not a public release mechanism.

[Benchmarks](../../packages/vreact-style-singleton/bench/results/README.md) use
separate processes and identical-source controls. DOM measurements use jsdom,
not a browser rendering engine.
