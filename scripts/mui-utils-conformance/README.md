# MUI utility conformance

Controls are MUI Utils/System/Material **9.5.0** and VentiMath's **7.2.0**, with React 19.3.1. Install using `npm --prefix scripts/mui-utils-conformance ci --ignore-scripts --no-audit --no-fund --legacy-peer-deps`.

- `run.cjs`: 6,071 current/app comparisons for theme/default/slot props, class names, component metadata, React refs and child filtering. The current `visuallyHidden` recipe differs intentionally from the old app control.
- `callers.cjs`: eight unchanged Material form/menu/tab/dialog SSR snapshots. Every utility import is replaced in the VPM variants; System, Material and Emotion remain their control versions.
- `browser.cjs`: current/app Chrome checks for controlled inputs, stable focused DOM, disabled-item skipping, wrapping, Home/End, menu typeahead, tab focus/selection, dialog opening/closing, stable latest callbacks, ref cleanup and unmount timer cancellation. Run both production and `VPM_REACT_MODE=development`/Strict Mode. The caller fixture retains the correct ESM entry paths for the old controls.
- [Regression tests](../../packages/vmui-utils/test/utils.test.cjs): seven groups cover prototype-named data/classes, cycle rejection, source ownership, slot event dispatch, timer replacement/disposal, debounce receivers, state comparison and validation. Run on Node and Bun.
- `types.cjs`: strict TypeScript 7 CJS/ESM/Bundler consumers plus unchanged Material declarations. Includes rejected wrong callback arguments and retained typed class keys/props.
- `archives.cjs`: exact local pins for `vclsx` and `vmui-utils`; fresh/frozen npm and Bun consumers, every declared runtime subpath, CJS/ESM identity, hooks SSR and independent types.

The audited app revision is `664673678be2699602121ff2ceee0189c12a7e12`. Its MUI components reach these helpers indirectly; the app has no direct @mui/utils import. This fixture verifies replacement source, not application adoption or all possible Material components.

[Isolated benchmarks](../../packages/vmui-utils/bench/results/README.md) use four alternating process pairs and two identical-source controls on Node 24/Bun 1.4.4. Validation stays outside the timed blocks; both raw recordings and source hashes are retained.
