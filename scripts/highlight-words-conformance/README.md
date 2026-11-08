# Table highlighting conformance

Pinned controls: highlight-words 2.0.0 (current and app), Material React Table 3.2.1,
React 19.1 and MUI 7.2. The actual `MRT_TableBodyCellValue.tsx` caller is hashed in
[provenance](../../packages/vhighlight-words/PROVENANCE.json). VentiMath main
`21197a2c` imports Material React Table from `src/components/data-table/DataTable.tsx`,
used by its products/orders tables. No app source, data or deployment is changed.

```sh
npm --prefix scripts/highlight-words-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/highlight-words-conformance/archives.cjs
```

`archives.cjs` compiles the unchanged caller and public upstream test file, packs
VPM, compares archive bytes, installs into fresh npm/Bun consumers, repeats with
frozen locks, and runs Node/Bun contracts, CJS/ESM identity, TS7 NodeNext/Bundler
and native Chrome checks. Chrome needs an installed browser (`CHROME_BIN` override)
and a local loopback listener. Fixtures are synthetic and contain no customer data.
Temporary consumers, browser profiles and servers are cleaned up.

The 18 upstream public tests are retained unchanged with their MIT license and
SHA-256 hashes. The adapter supplies their test API, strips TypeScript/imports and
normalizes only the key field (upstream mocks it to `1`); text/match expectations
are untouched. Internal regex-builder and clip-helper tests are not counted as
public API tests. Added independent checks exercise key uniqueness/stability,
mutable result isolation, escaped literals, malformed inputs, nested/absent regex
captures, zero-width Unicode advancement and all adjacent matches.

6,000 seeded differential cases compare supported strings, exact/multiword modes
and clipping. 3,000 independent literal masks and reconstruction cases cover the
adjacent-match difference. The unchanged table cell uses synthetic cell/table props
with real React and MUI: 64 SSR comparisons and ten Chrome text/markup/ARIA/color
snapshots, plus positive/negative controls for chunk identity and adjacent colors.
No full-table interaction, authenticated app adoption or screen-reader claim.

Benchmarks run separately with `scripts/bench-process.cjs`: fresh isolated workers,
balanced AB/BA order, identical-source controls, all raw rounds and source hashes.
Production React cell SSR is measured separately from helper operations. DOM identity
is a browser correctness check; SSR timings do not measure browser responsiveness.
