# VLX reference fixtures

KaTeX 0.19.1, MathJax 4.1.3, New Computer Modern font data 4.1.3 and resvg 2.6.2
are pinned controls. Neither math engine is a VLX runtime dependency.
`check-lock.cjs` requires every resvg platform binary in the lockfile, including
Linux CI artifacts when the lock is prepared on macOS.

`run.cjs` covers 30 synthetic notation cases with independent VLX layout,
semantic token comparison, raster ink and rule checks. `VLX_OUTPUT=/path` writes
a side-by-side SVG/PNG sheet and capability report. Equivalent Unicode font
characters, double primes, invisible operator markers and existing accent wrapper
differences are normalized for token comparison. This does not certify spacing,
full structural semantics or screen-reader behavior. MathJax's responsive equation
tag SVG is checked semantically and labeled as such in the static preview.
Spanning array cells are implemented and tested in VLX even though both controls
reject the synthetic `multicolumn` case.

`reference.cjs` uses published engine APIs. Font tables are loaded before conversion
to avoid MathJax dynamic-font state leaking across fresh conformance documents.
Performance cases reuse a configured renderer and exclude initialization. Macro
conformance cases still receive fresh parser state. The static comparison strips
MathJax's data-latex attributes because its HTML serialization may contain literal
less-than signs that cannot be embedded as XML attributes.

`build-font.cjs --check` reproduces the selected numeric metrics and outlines.
The JSON contains no executable engine code. Clean archives include attribution.
`archives.cjs` installs with npm/Bun, explicitly points the unreleased vpngjs
sibling to its packed archive, checks CJS/ESM and DOM-free TS7, builds browser math
without Node dependencies, then explicitly installs the optional native rasterizer
and renders expression and problem PNGs. Release packaging must pin sibling VPM
archives in dependency metadata, as with other VPM releases.

## Local application checks

Private sources and problem text are never copied into this repository. These
optional tools read a supplied local application checkout and default to its
`origin/main` Git ref:

```sh
node scripts/vlx-conformance/app.cjs /path/to/ventimath-private
node scripts/vlx-conformance/audit-app.cjs /path/to/ventimath-private
```

`app.cjs` executes all 28 unchanged backend picture tests on Bun, substituting
only the renderer import. It verifies that VLX was exercised and records the test
source hash. The existing `scripts/png-conformance` fixtures must be installed.
`audit-app.cjs` loads the current frontend normalization function into a temporary
directory and examines the local olympiad/university ingestion JSON files.
It reports complete-statement and math-span rendering counts, file counts and
hashes. It is not a deployed-data inventory. Optional `VLX_AUDIT_FAILURES` must
point outside this public repository; failures may contain private source text.
The latest aggregate result is [app-coverage.json](app-coverage.json).

## Measurements

The shared harness runs four balanced comparison process pairs and two identical
source control pairs; no samples are discarded. Public expression cases compare
KaTeX HTML+MathML with VLX SVG+MathML HTML, and initialized MathJax SVG with VLX
SVG. Three inputs cover a fraction/root, styled text/primes/binomial, and a ruled
array. VLX computes its three formats together. Results are workload-specific;
initialization and browser paint are excluded.

For complete PNGs, the optional local runner compares the actual application
renderer at the selected Git ref against VLX using synthetic prose/choice and
array/figure pages. It includes composition, image validation and rasterization;
fonts and renderer initialization are outside timing. Save raw results outside
this public repository because they record temporary private-source paths:

```sh
OUTPUT=/tmp/vlx-pages-node.json node scripts/vlx-conformance/bench-app.cjs /path/to/ventimath-private
OUTPUT=/tmp/vlx-pages-bun.json bun scripts/vlx-conformance/bench-app.cjs /path/to/ventimath-private
```

Both tools are local read-only checks. They do not modify the application, release
packages, or change adoption status.

## Browser acceptance

`browser.cjs` bundles the real root/DOM entries and launches an isolated Chrome
profile. It checks 30 unclipped formula viewports, one exposed MathML root per
formula, fraction reading order, script/root/limit/table roles, phantom exclusion,
light/dark colors, 200%/400% text enlargement, 320px reflow, local keyboard scrolling,
forced colors including authored colors, selected-source copying and lifecycle
cleanup. `VLX_BROWSER_OUTPUT=/path` writes screenshots, the accessibility tree
and a source-hashed JSON report. It does not use an existing browser profile,
change a saved theme, alter the OS clipboard, or enable a screen reader.

The committed [browser result](browser-coverage.json) records browser-tree evidence,
not actual VoiceOver/NVDA speech. See the [acceptance scope](../../packages/vlx/ACCESSIBILITY.md).
The Node CI job runs this gate. Clean archives also compile the new browser-only
DOM declarations separately, while keeping root declarations free of DOM types.
