# CSS source-map comparisons

PostCSS 8.5.8 generates inline and external maps, composes a second stylesheet transform, and traces a diagnostic to its original file. CSS Tree 3.2.1 generates a map while reusing its input coordinates. The fixture installs the same callers in isolated directories and resolves their source-map dependency to VPM or each pinned upstream control. It compares CSS, source-map JSON, and diagnostic coordinates.

Run `npm ci --prefix scripts/source-map-conformance --ignore-scripts` before running `node scripts/source-map-conformance/caller.cjs`, `bun scripts/source-map-conformance/caller.cjs`, and `node scripts/source-map-conformance/archives.cjs`. The package tests also compare generation and 5,412 original-position queries over 256 mappings, including unmapped ranges, empty text, named mappings and both lookup biases.

## Position tracing

`node trace-caller.cjs` runs the unmodified Babel generator, gen-mapping and
remapping against both the control and VPM. It compares generated code, original
names, source content and positions after chaining two maps. Run
`node trace-archives.cjs` to repeat with fresh and frozen npm and Bun
installs of all three VPM archives. The fixture pins the local dependency
archives with overrides so it can run offline before a consumer release.

For the upstream flat-map suite, pass the path to
`packages/trace-mapping/test/trace-mapping.test.ts` from the
`trace-mapping/0.3.31` tag to `node trace-upstream.cjs` or
`bun trace-upstream.cjs`.

The generator check repeats the same Babel and remapping calls with
`vgen-mapping` substituted as well. Encoded, decoded and raw mappings are
compared with upstream controls. The archive check installs all four VPM
packages offline. The public writer suite runs with
`node trace-upstream.cjs /path/to/gen-mapping.test.ts` (or Bun) using the
`gen-mapping/0.3.13` tag.

The complete-stack comparison also runs Babel core 7.29.0’s unchanged merge-map module with all five VPM packages installed from archives. It checks the merged source root and emitted map against the pinned upstream stack.
The upstream public composition tests run with `node trace-upstream.cjs /path/to/remapping.test.ts` or Bun, using the `remapping/2.3.5` tag with its sibling `samples` directory. Four concatenation, Rollup and minification fixture maps are compared byte for byte.

The converter fixture copies Babel core into an isolated module tree and switches only the converter between runs. Run `node convert-caller.cjs` or `bun convert-caller.cjs`; `trace-archives.cjs` repeats both calls from fresh and frozen installs.
