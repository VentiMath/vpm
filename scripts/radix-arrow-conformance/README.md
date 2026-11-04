# Radix Arrow comparison fixtures

Pins `@radix-ui/react-arrow` 1.1.17, its real caller
`@radix-ui/react-popper` 1.4.0 and React 19.1.0. The separately locked `current`
directory supplies React/ReactDOM 19.2.4. Dependencies are test-only and are not
included in installable VPM archives.

```sh
npm --prefix scripts/radix-arrow-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-arrow-conformance/current ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-react-arrow/test/arrow.test.cjs
bun test packages/vradix-react-arrow/test/arrow.test.cjs
node scripts/radix-arrow-conformance/archives.cjs
```

`load.cjs` executes unchanged upstream CJS modules using the selected React
instance. In VPM mode it substitutes only the Arrow package and resolves that
package's VPM primitive/Slot/ref closure locally. Upstream Popper, Floating UI and
other caller dependencies remain unchanged. Both implementations receive the
same assertions; the upstream source hashes are checked against
[provenance](../../packages/vradix-react-arrow/PROVENANCE.json).

`run.cjs` checks 42 dimension combinations, fixed SVG geometry, ordinary versus
slotted children, prop precedence, escaping, ref/event composition, StrictMode,
distinct DOM instances, updates without focus loss, SSR/hydration and Popper's
four arrow directions. The unit fixture uses the controlled observer/animation
frame helper from the useSize fixture; it does not claim native layout coverage.

`archives.cjs` packs all four VPM packages, rejects test/benchmark leakage and
workspace ranges, and performs fresh/frozen npm and Bun installs. Node/Bun check
CJS/ESM identity and SSR. TypeScript 7 checks DOM-only NodeNext/Bundler consumers,
including SVG ref types and invalid dimensions. Browser builds replace only the
Arrow import, and native Chrome runs both unchanged upstream and VPM on both
React versions. It checks actual SVG bounds/color, focus, custom geometry/ref
cleanup, hydration and centered arrows meeting their Popper content edges for
all four sides in LTR and RTL. Chrome is isolated and its profile/server are
removed after the check; `CHROME_BIN` can select the executable.

The [benchmark](../../packages/vradix-react-arrow/bench/compare.cjs) uses production
React 19.1, default/slotted SSR and updates to 20 arrows in jsdom. Four separate
process comparison pairs alternate implementation order; two identical-upstream
control pairs expose noise. Results are validated outside timing and all samples
are retained. No browser paint, cold loading or application latency claim follows
from these measurements.
