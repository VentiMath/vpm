# CSS source-map comparisons

PostCSS 8.5.8 generates inline and external maps, composes a second stylesheet transform, and traces a diagnostic to its original file. CSS Tree 3.2.1 generates a map while reusing its input coordinates. The fixture installs the same callers in isolated directories and resolves their source-map dependency to VPM or each pinned upstream control. It compares CSS, source-map JSON, and diagnostic coordinates.

Run `npm ci --prefix scripts/source-map-conformance --ignore-scripts` before running `node scripts/source-map-conformance/caller.cjs`, `bun scripts/source-map-conformance/caller.cjs`, and `node scripts/source-map-conformance/archives.cjs`. The package tests also compare generation and 5,412 original-position queries over 256 mappings, including unmapped ranges, empty text, named mappings and both lookup biases.
