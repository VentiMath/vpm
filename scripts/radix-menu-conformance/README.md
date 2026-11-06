# Menu controls

Pins Menu 2.2.1 and unchanged Dropdown Menu 2.2.1. VPM aliases only Menu and
resolves its full VPM closure; caller code and React are shared. The app currently
receives the older Dropdown Menu family through Amplify UI; this work targets
the current API rather than freezing that installed version.

```sh
npm --prefix scripts/radix-menu-conformance ci --ignore-scripts
npm --prefix scripts/radix-menu-conformance/current ci --ignore-scripts
bun scripts/radix-menu-conformance/build.cjs
node --test packages/vradix-react-menu/test/*.test.cjs
bun test packages/vradix-react-menu/test
node scripts/radix-menu-conformance/archives.cjs
```

Nine groups per runtime cover upstream/VPM server and client processes with
React 19.1.0/19.2.4 and upstream hashes. Shared tests cover aliases, scopes, SSR,
hydration, disabled items, looping/typeahead, selection cancellation, checkbox
and radio notifications, indicators, slots, React 19 refs, StrictMode, LTR/RTL
submenus and modal cleanup. Paired controls reproduce duplicate-label cycling,
delayed focus stealing, IME searches and hover timers surviving disabled props.

Chrome reuses the shared tests and checks iframe focus/pointer/guard ownership,
unchanged modal/nonmodal Dropdown Menu, diagonal submenu grace and expiry.
Real CDP input opens menus, skips/navigates items, contains Tab, selects by Enter
and pointer, closes and restores focus. jsdom models visible boxes and observers;
real geometry assertions run in Chrome. No visual styling is imposed on consumers.

The complete dependency closure is packed, then installed with npm/Bun both
fresh and frozen. Consumers verify Node/Bun CJS/ESM identity and SSR, TypeScript 7
DOM-only NodeNext/Bundler types, and Chrome on both React versions. Bun fixture
resolution honors CommonJS requests separately from ESM imports. The stylesheet
helper's production React binding has its own archive regression gate.

Production benchmarks have separate bundles and hash guards. Each isolated
worker measures SSR, unchanged renders and canceled selection for 16 items.
Cases release their previous DOM/listeners outside timing. Four balanced pairs
and two identical-code controls retain every sample; no shared-process JIT mix.

```sh
bun -e "await require('./scripts/radix-menu-conformance/build.cjs')({production:true})"
OUTPUT=packages/vradix-react-menu/bench/results/node-isolated.json node packages/vradix-react-menu/bench/compare.cjs
OUTPUT=packages/vradix-react-menu/bench/results/bun-isolated.json bun packages/vradix-react-menu/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-menu
```

When registry access is unavailable, `VPM_ARCHIVE_OFFLINE=1` uses an offline
npm-generated lock for the fresh Bun consumer before checking Bun installation
and runtime behavior. Set `VPM_ARCHIVE_NPM_CACHE` to the populated npm cache;
Menu also accepts `VPM_ARCHIVE_BUN_CACHE`. This fallback verifies lock migration,
not independent Bun registry resolution. CI normally resolves without this flag.
