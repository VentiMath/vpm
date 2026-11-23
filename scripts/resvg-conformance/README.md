# Handwriting rasterizer checks

`compare.cjs` compares the PNGs from `vresvg` and the pinned test-only
`@resvg/resvg-js` 2.6.2 in `../vlx-conformance`. Its 66 synthetic cases cover raw
and curved pen paths, small dots, fractional pen widths, ordinary pages and the
4800px tall-page cap. No private writing is included. PNGs are decoded before
comparison because the native raw pixel accessor uses premultiplied colors.

`app-caller.cjs /path/to/ventimath-private [REF]` exports three app files from
`REF` (default `origin/main`) into temporary storage, aliases both the original renderer name and direct `vresvg` name to
`vresvg`, runs the unchanged writeup tests and exercises 18 additional synthetic
raw/tidy/ruling/tall pages on Bun and a Node-targeted transpilation. It prints the source revision and hashes plus
aggregate pixel evidence, and removes the private source afterward.
`VPM_RESVG_PACKAGE_DIR` can point it at an extracted release package.

The 84-case Node run's maximum ink-weighted pixel difference was 8.25%; total ink
changed by at most 1.55%. Different edge antialiasing is expected. Dimensions
must match exactly. These controls do not establish support for arbitrary SVG.

The shared engine also passes VLX's 1,800 drawings with identical decoded pixels
to the pre-extraction VPM renderer. Type checks and clean archives cover the
new runtime dependency path, including raster-free browser bundles.

The VLX 0.3.4 exact-archive checker also runs the raster guard tests. Live-path
allocation and cumulative request work are separate bounds, allowing ordinary
long pages without removing per-path, stroke, edge, pixel or image limits.
