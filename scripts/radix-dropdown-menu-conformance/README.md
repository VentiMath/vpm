# Dropdown Menu controls

Pinned Dropdown Menu 2.2.1 is the control for the independent VPM wrapper and its
complete dependency closure. React 19.1.0/19.2.4 peers are shared between variants;
only the dropdown import is substituted. Production bundles are separate from
development conformance bundles. Source hashes reject stale builds.

```sh
npm --prefix scripts/radix-dropdown-menu-conformance ci --ignore-scripts
npm --prefix scripts/radix-dropdown-menu-conformance/current ci --ignore-scripts
bun scripts/radix-dropdown-menu-conformance/build.cjs
node --test packages/vradix-react-dropdown-menu/test/*.test.cjs
bun test packages/vradix-react-dropdown-menu/test
node scripts/radix-dropdown-menu-conformance/archives.cjs
```

Nine runtime groups check upstream/VPM server/client on both React versions and
upstream source hashes. Shared client assertions cover all activation keys,
trigger/content ARIA linkage, pointer button policy, disabled and canceled events,
controlled/default state, slots and refs (including Amplify-shaped nested buttons), modal/nonmodal dismissal, cancelable
focus return, composed scopes, submenu direction/state, checkbox/radio selection,
CSS aliases and owner-document behavior. SSR/hydration retains the original DOM.
Paired controls distinguish IME activation and iframe entry improvements.

Chrome runs the shared assertions and native CDP keyboard/pointer sequences:
open, navigate, contain Tab, select, close and restore focus. jsdom only models
visible boxes and observers; it does not prove layout or browser performance.
Archives install every VPM dependency in fresh npm/Bun consumers, repeat with
locks, verify Node/Bun CJS/ESM SSR and TS7 DOM-only declarations, and run both
Chrome variants using installed packages on both React versions.

```sh
bun -e "await require('./scripts/radix-dropdown-menu-conformance/build.cjs')({production:true})"
OUTPUT=packages/vradix-react-dropdown-menu/bench/results/node-isolated.json node packages/vradix-react-dropdown-menu/bench/compare.cjs
OUTPUT=packages/vradix-react-dropdown-menu/bench/results/bun-isolated.json bun packages/vradix-react-dropdown-menu/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-dropdown-menu
```

Benchmarks measure closed-trigger SSR, open 16-item SSR, unchanged open renders
and canceled selection. Four balanced comparison pairs plus two identical-code
control pairs retain all samples. Each worker loads one variant and cleans up
its previous DOM outside timing; no shared-process JIT comparison is used.

`VPM_ARCHIVE_NPM_CACHE` and `VPM_ARCHIVE_BUN_CACHE` select reusable caches. If
registry access is unavailable, `VPM_ARCHIVE_OFFLINE=1` seeds the Bun consumer
with an offline npm lock. That fallback checks npm-to-Bun lock migration rather
than independent Bun resolution; normal CI runs without it.

The dedicated release packer/checker additionally preserves the upstream import
name, pins all internal dependencies to sibling release URLs, and verifies that
an unchanged caller requiring the older 2.1.16 baseline shares the same instance.
See the [release recipe](../../docs/INSTALLATION.md#radix-dropdown-menu). Published
mode downloads and checks every archive, then uses fresh npm/Bun caches and
repeats frozen installs before checking the caller again.
