# PNG reader controls

`pngjs` 7.0.0 is the current comparison target. Resvg 2.6.2 and MathJax 3.2.2
match the app's existing image caller; they are fixture dependencies, not VPM
runtime dependencies or new implementation targets.

The 176 small PNG images in `images/` come from pngjs commit
`c565210c602527eb459f857eeb78183997482d5b`, primarily Willem van Schaik's PngSuite.
Its redistribution permission and README are retained. `images.json` pins every
file hash. The 15 MiB `large.png` image is excluded; application inputs are capped
at 10 MiB. Runtime code was independently written; no upstream decoder was copied.

162 valid images compare exact metadata and RGBA bytes on both runtimes. Thirteen
invalid files are rejected by both. The fourteenth has no IDAT: VPM must reject
it, while upstream's private inflate path may accept or reject it. Focused tests
reproduce duplicate-header, ignored-ancillary CRC and truncated-zlib acceptance,
and check bounds, exact inflated lengths, filters, chunk order and ownership.
Standard-specific controls preserve permitted IDAT padding and mask transparency
key high bits; empty palette transparency is accepted.

`app.cjs /path/to/ventimath-private [ref]` exports the actual app's image source and
unchanged tests into a temporary directory, runs upstream and VPM in separate Bun
processes, and deletes the source copies afterwards. It reports source hashes
and the checked commit. Private sources are not needed for public CI: committed
corpus controls and a real resvg caller run on Node 24/Bun there.

`archives.cjs` installs packed VPM with npm/Bun and verifies Node/Bun CJS/ESM and
TypeScript 7 consumers without Node or DOM declarations. The isolated benchmark
uses corpus images and deterministic resvg output; generation and assertions
are outside timing, and each operation returns a fully decoded image.
