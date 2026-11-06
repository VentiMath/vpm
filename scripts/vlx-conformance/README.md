# VentiLaTeX (VLX) reference fixtures

Contest-relation regressions cover `\cong`, `\sim`, `\nmid`, `\leqslant`
and single-symbol `\not`, including negated slanted inequalities. The synthetic
cases compare mathematical tokens against both pinned engines and render real
PNG pixels. Command spellings are documented in
[KaTeX's supported functions](https://katex.org/docs/supported.html).
The production audit now checks all 99,184 KaTeX-accepted expressions in the
supplied November 3 dump. All render. After source repairs to 165 statements, two current rubrics and 94 answer/choice values,
all 99,635 expressions render using strict bare-TeX VLX r5. The follow-up fixed three
undefined custom macros and three damaged string escapes, plus neighboring
missing backslashes in the same rubric fields. Historical rubric revisions are
preserved, not included as current content. The 451 originally baseline-rejected
expressions retain their original classification; source repairs are not new
engine capability. [production-coverage.json](production-coverage.json) contains aggregates
and hashes only. `audit-production.cjs PRIVATE.jsonl --check` verifies a normalized
inventory with `{site, doc, tex, display, katexOk}` records. The original private
extractor preserves each caller's preprocessing; its hash is recorded. Private
source text and document identifiers are never committed.

KaTeX 0.19.1, MathJax 4.1.3, New Computer Modern font data 4.1.3 and resvg 2.6.2
are pinned controls. Neither math engine is a VLX runtime dependency.
`check-lock.cjs` requires every resvg platform binary in the lockfile, including
Linux CI artifacts when the lock is prepared on macOS.

`run.cjs` covers 53 synthetic notation cases across `corpus.cjs`, `production-corpus.cjs` and `extended-corpus.cjs` with independent VLX layout,
semantic token comparison, raster ink and rule checks. `VLX_OUTPUT=/path` writes
a side-by-side SVG/PNG sheet and capability report. Equivalent Unicode font
characters, double primes, invisible operator markers and existing accent wrapper
differences, equivalent double-vertical glyphs and combining Unicode accents are normalized for token comparison. This does not certify spacing,
full structural semantics or screen-reader behavior. MathJax's responsive equation
tag SVG is checked semantically and labeled as such in the static preview.
Slanted roman text, crossed-o letters, array spacing and rejection of formula-only wrappers
have independent geometry/semantic tests. MathJax rejects `\textsl`, math-mode
`\o` and `\vspace` in those fixtures; these are recorded as unsupported controls,
not skipped VLX assertions. [LaTeX kernel documentation](https://latex-project.org/help/documentation/source2e.pdf)
provides the command reference.

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
`archives.cjs` installs with npm/Bun, explicitly points the workspace vpngjs
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
SVG. Five inputs cover a fraction/root, styled text/primes/binomial, a ruled
array, contest relations and continued fractions/operator wrappers. VLX computes its three formats together. Results are workload-specific;
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

## Document equation references (0.2.0)

`packages/vlx/test/equations.test.cjs` exercises automatic numbers, forward and
back references, per-row align/gather tags, starred environments, suppressed rows,
custom tags, local counters, stable IDs, errors/fallbacks and resource bounds.
`equation-reference.cjs` initializes the pinned MathJax 4.1.3 control and resets
its counters for each document. Numbering expectations follow the documented
[AMS/all modes](https://docs.mathjax.org/en/stable/input/tex/eqnumbers.html);
there is no upstream runtime code in VLX.

`equations-react.cjs` runs against clean installed archives on Node and Bun. It
checks native output against the string emitter, independent IDs, edited source,
focus retention, fallback, StrictMode and SSR hydration. The native Chrome React
gate follows reference links with Enter, checks their accessibility-tree names
and verifies that renumbering retains the same label target. These checks do not
establish actual screen-reader speech or non-Chrome behavior.

Reproduce the dedicated benchmark with the shared balanced-process harness:

```sh
node scripts/vlx-conformance/prepare-equation-baseline.cjs
OUTPUT=packages/vlx/bench/equation-results/node-isolated.json node packages/vlx/bench/equations.cjs
OUTPUT=packages/vlx/bench/equation-results/bun-isolated.json bun packages/vlx/bench/equations.cjs
node scripts/render-bench-report.cjs packages/vlx equation-results equations.cjs
```

The preparation script extracts commit `235846009f114f0f34189dc8ea4d76e4aa87dc7c`
to an ignored fixture for the three existing-API controls; no old implementation is
committed. Two synthetic documents compare complete parse/number/resolve/render
work against initialized MathJax. VLX returns SVG plus MathML in HTML, while
MathJax returns SVG in HTML; this is not identical output or browser layout.
Initialization, network, React commits and assistive technology are outside the
timing. Raw samples and source hashes are in the
[equation report](../../packages/vlx/bench/equation-results/README.md).

## Browser acceptance

`browser.cjs` bundles the real root/DOM entries and launches an isolated Chrome
profile. It checks 53 unclipped formula viewports, one exposed MathML root per
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

`VPM_VLX_PACKAGE_DIR=/absolute/path/to/node_modules/vlx` runs the same browser
checks against an installed release instead of workspace source. The
[release checker](../check-vlx-release.cjs) uses this path after verifying the
archive's complete source manifest; its `--published` mode installs the root
public URL with no overrides and checks frozen npm/Bun lockfiles. See the
[release recipe](../../docs/INSTALLATION.md#vlx-math-rendering).

`react.cjs` verifies source/error isolation, SSR loading, StrictMode cleanup and
missing-observer windows against clean installed consumers. `react-consumer.cjs`
compiles both TS7 module modes and checks the emitted dynamic chunk graph.
`react-browser.cjs` verifies in real Chrome that plain prose requests no glyph
chunk, then first math fetches it, renders and unmounts. For both lazy and preloaded
mounts, it checks all three components through 60 parent updates: formula identity,
focus and scroll are preserved with zero HTML writes. Changed TeX and provider
defaults remain live. The preloaded identity regression fails on r5. Chrome also rejects both r5
(80 HTML writes across the first 20 updates) and a memoization-only repair
(four writes from one lazy remount): both lose focus and scroll. The complete
fix passes with zero writes. Hydration preserves server nodes, and a missing
glyph chunk reaches the application error boundary. These run for clean
archives and the release checker, including published-URL installs.

The DOM regression check asserts zero computed-style reads for fitting/hidden
math, shared per-document styles, and preservation of caller-owned attributes.
React consumers verify synchronous first rendering after preload, inherited
provider defaults and explicit overrides. Chrome startup allows 30 seconds,
uses disk-backed shared memory, reports early exit/stderr, and kills a failed
launch. It does not retry failed browser assertions. The previous CI timeout
alone did not establish whether Chrome was slow or crashed.


`bench-react.cjs PREVIOUS_RELEASE.tgz` compares preloaded React parent updates
against an immutable prior archive using the same isolated process harness. It
packs the current package, loads one implementation per worker, and uses identical
React/jsdom fixtures. Unchanged single-formula and 20-formula updates plus changed
TeX are measured; browser paint and application tests are excluded. Set `OUTPUT`
to record raw samples. Temporary extracted code is removed after the run.


## Native React output (r7)

The layout has structured-node and escaped-string emitters, sharing every
geometry rule. `output-reference.json` records r6 hashes and dimensions for
114 inline/display cases. The explicit maintenance command `snapshot-output.cjs`
accepts an extracted immutable baseline, an output filename and the r6 release
manifest; it verifies every baseline source hash. Ordinary tests never regenerate that
reference. `react.cjs` compares current string output, native DOM and SSR against
it while forbidding all `innerHTML` writes by the renderer. The sole presentation
normalization maps the fixed `vlx-slanted` class to the equivalent oblique MathML
style; Chrome independently checks its computed value. This avoids relying on
`MathMLElement.style`, which jsdom lacks. Namespace, attributes, text and child
structure are otherwise preserved.

`react-browser.cjs` runs the native corpus with Chrome geometry/accessibility
checks and an enforced Trusted Types policy. No permissive HTML policy is
installed. Initial mounts, changed formulas and unchanged updates write no HTML.
SSR/hydration, failed chunks, source fallback, copy/scroll lifecycle and stylesheet
cleanup remain covered by the clean-archive and public-release gates.

`bench-react.cjs` now also measures cached/uncached first mounts, a 20-formula
paper and a 12×12 matrix. `bench-output.cjs EXTRACTED_BASELINE_PACKAGE` measures
string output separately, avoiding jsdom/DOM garbage-collection history.
`bench-browser.cjs PREVIOUS_RELEASE.tgz` uses production React in fresh Chrome
processes, four balanced comparison pairs and two identical-baseline controls.
It includes synchronous DOM updates and forced layout, with 150 ms warmup and
12 untrimmed samples per case; it excludes network, module startup and paint.
Use `OUTPUT=/absolute/path/report.json` with each runner to retain measurements.

## Picture corrections (0.2.1)

`packages/vlx/test/picture-regressions.test.cjs` checks standalone display sizing,
explicit style overrides, bold choice labels, repeated/explicit paragraph breaks,
and root-degree geometry/MathML. All four groups fail against immutable 0.2.0
source `98b7ad6baf3a244a0b5b51c7b43c98e03764eedb` and pass against 0.2.1.
The release checker runs these tests against both exact installed archives.

`picture-corpus.cjs` supplies five synthetic indexed-root cases and synthetic pages.
Native React/SSR checks cover all ten inline/display root layouts in addition to
114 unchanged r6 controls. Chrome checks the degree lies over the hook and before
the radicand. Root placement uses the 60% default degree-raise proportion from
[MathML Core radicals](https://w3c.github.io/mathml-core/#radicals-msqrt-mroot);
ordinary square-root geometry is unchanged.

Prepare the immutable baseline and render the before/after/MathJax controls:

```sh
node scripts/vlx-conformance/prepare-picture-baseline.cjs
node scripts/vlx-conformance/picture-preview.cjs /absolute/path/to/preview
```

The private November 3 full-problem input (SHA-256
`04d6529bfc8ba18e052ee946e474133226eebe430da7a05a551ba9305432c759`)
retains 20,803 successes out of 20,835, with no new failures. Of the successful
SVGs, 18,153 are byte-identical and 2,650 change. The 32 original missing-glyph
or malformed-source failures remain. This check substitutes placeholder PNGs at
recorded figure widths; it is not a visual comparison of all real figures.

[Picture measurements](../../packages/vlx/bench/picture-results/README.md) compare
0.2.0 with 0.2.1 in isolated processes, using identical inputs and retaining all
pairs and controls. The corrected picture output deliberately changes geometry,
so the measurements include that work and are not application latency claims.
