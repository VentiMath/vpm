# Scrollbar comparison fixtures

Reuses the locked [sidecar fixture](../sidecar-conformance/package.json):
react-remove-scroll-bar 2.3.8, react-remove-scroll 2.7.2 and React 19.1.0.

After `npm --prefix scripts/sidecar-conformance ci --ignore-scripts`, run
`node scripts/scrollbar-conformance/run.cjs` and the Bun equivalent. The newly
authored original/VPM checks compare gap measurements and parsed CSS declarations
for both gap modes and all relative/important flag combinations. They also cover
nonce propagation, first-owner stylesheet retention, nested locks, external lock
counts, StrictMode, SSR/hydration, unchanged inline styles and the real upstream
scroll-lock caller with only its scrollbar dependency replaced. Negative counters
and body replacement have explicit original/VPM expectations; shared SSR-zero
mutation has a VPM regression check. This is not an imported upstream test suite.

`node scripts/scrollbar-conformance/archives.cjs` packs the scrollbar, stylesheet
and nonce packages and installs clean npm/Bun consumers with explicit local
overrides. It checks Node/Bun SSR and CJS/ESM identity, the constants subpath,
browser dependency isolation and strict TS7 JSX/type consumers. The runtime
checks additionally bundle the constants-only entry without React.

[Measurements](../../packages/vreact-remove-scroll-bar/bench/results/README.md)
run in separate processes with identical-source controls. Fixed layout inputs
isolate gap arithmetic; server rendering measures React's SSR path. Neither
measures browser layout, painting or scroll latency.
