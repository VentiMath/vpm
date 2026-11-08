# Transition conformance

Pinned upstream/app control: react-transition-group **4.4.5**; official source
commit and installed caller hashes are in [provenance.json](provenance.json).
The runtime was written independently. No upstream runtime or test suite is
copied into the package. These are public-contract differential tests, not a
claim that the upstream legacy test suite runs unchanged on React 19.

- `ssr.cjs`: 44 server-rendered state/markup combinations.
- `contracts.cjs`/`run.cjs`: 29 snapshots, with assertions covering lifecycle
  signatures/order, mount/unmount, CSS phases, immediate/listener completion,
  interrupted and duplicate callbacks, returning group keys, retained DOM,
  stable effect-driven exit callbacks, forwarded props and development StrictMode. Run on Node 24 and Bun.
- `improvements.cjs`: fallback timers really clear on reversal, completion and
  unmount; retained DOM loses only tracked classes. These are explicit changes.
- `build.cjs`/`browser.cjs`: 49 matching Chrome snapshots, including the contracts
  above and unchanged MUI Collapse, Fade, Grow, Slide, Zoom, DateCalendar and
  ButtonBase ripple. Main document and iframe, normal/reduced picker animations,
  visible rerender focus and DOM identity, class application and cleanup.
- `archives.cjs`: byte-checked tarball, fresh/frozen npm and Bun installs, CJS/ESM
  root and subpaths, TS7 NodeNext/Bundler, packed Node/Bun checks and actual MUI
  Chrome controls with React 19.1 and 19.2. No internal overrides or old runtime
  dependency closure. Fixture controls remain pinned separately.

Private app source is not committed. The recorded navigation Collapse and
calendar/notes picker callsites identify the caller chain. Browser fixtures
use synthetic navigation content and dates; no authenticated application,
production data, deployment or comprehensive visual acceptance is claimed.

```sh
npm --prefix scripts/transition-group-conformance ci --ignore-scripts
node scripts/transition-group-conformance/archives.cjs
node packages/vreact-transition-group/bench/compare.cjs
bun packages/vreact-transition-group/bench/compare.cjs
```

Live transitions require explicit refs. Switch/ReplaceTransition and legacy
implicit DOM discovery are not within the verified application scope.
