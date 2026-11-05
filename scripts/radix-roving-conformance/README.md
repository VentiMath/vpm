# Roving Focus controls

Pins Roving Focus 1.2.1 and its unchanged Dropdown Menu 2.2.1 caller. Production
bundles alias the Roving Focus package and its VPM closure; upstream and VPM use
the same React, browser and caller fixtures.

```sh
npm --prefix scripts/radix-roving-conformance ci --ignore-scripts
npm --prefix scripts/radix-roving-conformance/current ci --ignore-scripts
bun scripts/radix-roving-conformance/build.cjs
node --test packages/vradix-react-roving-focus/test/*.test.cjs
bun test packages/vradix-react-roving-focus/test
node scripts/radix-roving-conformance/archives.cjs
```

Nine groups per runtime compare separate upstream/VPM client/server processes
on React 19.1.0/19.2.4 and check pinned source hashes. Cases cover SSR/hydration,
refs, render-prop children, entry/keyboard cancellation, controlled proposals,
disabled items, live ordering, Shift+Tab exit, orientation, RTL and loop edges.
Paired controls establish the delayed-focus, stale-focusability, nonfocusable
current-item and iframe differences documented in the package README.

Clean npm/Bun fresh and frozen installs of the 14-package closure verify
CJS/ESM, SSR and TypeScript 7. Native Chrome compares both variants and both
React versions from the installed archives. It checks all direction/orientation
combinations, nested scopes, queue teardown, iframe focus, replaced slotted-root
listeners, Dropdown Menu opening/navigation/Escape return, and real browser
Tab/Shift+Tab navigation dispatched through CDP. Headless focus emulation makes
the page active so upstream native focus handlers run as they do interactively.

Generated comparison bundles are guarded by source hashes. Synthetic React/jsdom
benchmarks run one implementation per fresh process, with balanced order and
identical-code controls. No browser latency claim follows from those timings.
