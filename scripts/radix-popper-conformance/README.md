# Popper comparison fixtures

Locks Popper 1.4.0, Dropdown Menu 2.2.1, Popover 1.3.1 and React 19.1.0. The
`current` fixture supplies React 19.2.4. These are comparison dependencies, not
production dependencies of the VPM package.

```sh
npm --prefix scripts/radix-popper-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-popper-conformance/current ci --ignore-scripts --no-audit --no-fund
bun scripts/radix-popper-conformance/build.cjs
node --test packages/vradix-react-popper/test/popper.test.cjs
bun test packages/vradix-react-popper/test
node scripts/radix-popper-conformance/archives.cjs
```

`build.cjs` bundles both implementations symmetrically using Bun 1.4.4, preserving
the source modules and substituting only the Popper import for VPM plus its local
dependency closure. Generated files live under ignored `node_modules` folders.
A source/bundle fingerprint gate rejects stale generated fixtures before tests
and benchmarks. React stays external for Node/Bun checks so each test uses the selected peer
version. Browser builds include that selected React. Original caller source is
not edited. Upstream source hashes are pinned in
[provenance](../../packages/vradix-react-popper/PROVENANCE.json).

The unit controls check all exports, 12 server-side placements, missing contexts,
slots, virtual anchors, scope isolation, StrictMode, hydration, refs/focus,
onPlaced stability and subscription cleanup. Paired controls assert upstream's
retained removed-anchor observers, ineffective update-policy switch and stale
explicit z-index, and VPM's corrected behavior. Their controlled DOM geometry and
observer scheduling are not substitutes for the browser checks.

The native Chrome fixture checks 48 side/alignment/direction/arrow combinations
against independent coordinate expectations, plus viewport flip/shift and two
explicit-boundary cases. `compare-browser.cjs` compares all 52 positions and
transform origins across implementations. Additional checks cover portals,
clipped references, nested scopes, iframe positioning, sizing CSS writes and
observer teardown. Current upstream Dropdown Menu opens via ArrowDown, navigates
to its first item via Home, and closes via Escape with focus return. In this
fixture upstream initially focuses the menu container; first-item focus solely
from opening is not claimed. Popover opening, dismissal and focus return are
also tested. These are keyboard/event probes, not full assistive-technology
certification. `CHROME_BIN` can select the isolated Chrome executable.

The archive check installs the complete VPM dependency closure with local
tarball overrides in clean npm/Bun directories, then repeats frozen installs.
It checks CJS/ESM identity, DOM-free SSR, TS7 NodeNext/Bundler DOM types with
`exactOptionalPropertyTypes`, browser builds and both React versions in Chrome.
Local archive overrides are test infrastructure, not public install instructions;
future release packaging must pin the internal dependency URLs.

Benchmarks use production React, separate processes, balanced implementation
order, identical-upstream controls and source-hashed bundles. SSR and jsdom
updates measure the complete caller-facing VPM closure against upstream. Native
browser layout/paint and cold loading are outside their scope.
