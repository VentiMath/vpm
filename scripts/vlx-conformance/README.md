# VLX reference fixtures

KaTeX 0.19.1, MathJax 4.1.3, its New Computer Modern font data 4.1.3 and resvg 2.6.2
are pinned comparison tools. Neither math engine is a VLX runtime dependency.
`reference.cjs` calls their published APIs without modifying their implementations.
The benchmark reuses a configured MathJax renderer rather than timing setup on
every expression. Macro-definition tests use fresh input state.

`run.cjs` checks 13 synthetic feature cases against current engines, independent
VLX layout, semantic token order and actual raster pixels. `VLX_OUTPUT=/path`
additionally writes a side-by-side SVG/PNG sheet and corpus JSON for inspection.
It does not include private problem content. Typography and accessibility require
further acceptance beyond these checks.

`build-font.cjs --check` reproduces the selected outline and numeric metric data.
The committed JSON contains no executable engine implementation. Its notices are
included in clean archives. `archives.cjs` verifies npm/Bun installation without
KaTeX or MathJax, Node/Bun CJS/ESM, DOM-free TS7 types, browser bundling and explicit
installation of the optional native PNG rasterizer.

Benchmark cases measure uncached expression conversion for two feature-matched
inputs. HTML compares KaTeX HTML+MathML against VLX SVG+MathML HTML; SVG compares
MathJax's initialized SVG renderer against VLX. VLX currently computes all formats
together. Output representation and supported scope differ; these are not general
engine rankings. Engine startup, page layout and actual browser paint are excluded.
