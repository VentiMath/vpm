# Navigation popover conformance

Control: **react-popper 2.3.0** with **@popperjs/core 2.11.8**, on **React 19.3.1**. The archived wrapper's peer range predates React 19, so its comparison fixture uses `--legacy-peer-deps`; the VPM consumer declares and tests the current React peer directly.

The actual callers are `FuseNavHorizontalGroup` and `FuseNavHorizontalCollapse`: render-prop `Manager`, `Reference`, `Popper`, root portals, conditional children and explicit LTR/RTL placements. No `usePopper`, custom modifier engine or synchronous `forceUpdate` caller is included in this scope.

- `run.cjs`: 24 SSR comparisons covering explicit side/alignment placements and absolute/fixed strategies.
- Package tests: configuration errors, SSR without DOM, ref contract, unsupported custom callbacks, explicit placement limits and closed-menu side effects.
- `browser.cjs`: 96 ordinary placement comparisons across two viewport widths, both directions and viewport edges. Extra scrolled/scaled containers, offsets and arrows, focus/selection preservation and repeated open/close cycles are checked. VPM also checks latest-measurement wins, one first-update callback, observer cleanup and React 19 callback-ref cleanup.
- The scaled-container case explicitly asserts the upstream clipped menu and VPM's visible flipped menu rather than normalizing away the difference.
- Development StrictMode has a separate upstream failure assertion: its initial menu remains at `(0, 0)`. VPM must produce `(100, 170)` for that reference. The development matrix then compares VPM StrictMode with the ordinary upstream control; the upstream failure is retained, not hidden.
- TypeScript 7 covers unchanged navigation render-prop consumers with strict ESM/CommonJS and bundler resolution.
- `archives.cjs` packs all five VPM packages in dependency order, pins internal archive paths and verifies clean/frozen npm/Bun consumers, Node/Bun SSR, types and exact wrapper bytes. Neither upstream Popper nor `warning` is installed.

```sh
npm --prefix scripts/react-popper-conformance ci --ignore-scripts --legacy-peer-deps
node --test packages/vreact-popper/test/navigation.test.cjs
bun test packages/vreact-popper/test/navigation.test.cjs
node scripts/react-popper-conformance/run.cjs
bun scripts/react-popper-conformance/run.cjs
node scripts/react-popper-conformance/types.cjs
node scripts/react-popper-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/react-popper-conformance/browser.cjs
node scripts/react-popper-conformance/archives.cjs
```

The [balanced isolated benchmark](../../packages/vreact-popper/bench/results/README.md) measures open/closed navigation SSR with the same React version. It does not measure browser layout/frame rate. Public upstream declarations informed the API boundary; the wrapper runtime is independently written, and existing VPM geometry is reused. Application adoption and releases are separate.
