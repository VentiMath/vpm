# Sass compilation IDs

Install the pinned controls with `npm ci --prefix scripts/varint-conformance --ignore-scripts`. Run `caller.cjs` here with Node or Bun. It loads an unchanged copy of Sass Embedded 1.86.3 against VPM, then verifies a synchronous stylesheet and 132 concurrent replies. A separate upstream compile checks the output. `archives.cjs` exercises both runtimes after clean and frozen installs with npm and Bun. Unit tests compare wire bytes, widths, offsets and decoded values against varint 6.0.0.

[Package](../../packages/vvarint)

Set `VBUFFER_BUILDER_PACKAGE=./packages/vbuffer-builder` when running the caller from the repository root to check both VPM leaves together. `builder-archives.cjs` repeats this with independently packed buffer-builder installs.
