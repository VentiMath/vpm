# CSS named-color acceptance

Pinned css-color-keywords 1.0.0 is a black-box control, not the source of VPM's
color data. The data comes from the normative W3C tables identified in provenance.
`probe.cjs` checks every existing color and 438 border/shadow declarations through
an unchanged css-to-react-native 3.2.0. Its isolated caller resolves the replacement
and counts real membership checks. Cyan/magenta reproduce upstream parse failures
and succeed with the replacement.

Run the package tests with Node and Bun, `probe.cjs` with each runtime,
`types.cjs`, and `archives.cjs`. The latter tests fresh/frozen npm/Bun installs,
CJS/ESM/JSON exports, strict declarations and unchanged callers from exact archives.
Run `packages/vcss-color-keywords/bench/compare.cjs` sequentially on Node and Bun
after other checks finish; [recorded measurements](../../packages/vcss-color-keywords/bench/results/README.md)
retain all process pairs, controls and source hashes.

`from-standard.cjs <saved-css-color-3.html>` regenerates the table from the W3C
HTML, deduplicates the basic/extended lists and adds the CSS4 named-color entry.
Its output is byte-identical to the committed data. The downloaded source hash
is recorded in provenance.
