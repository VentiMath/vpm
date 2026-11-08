# Swipeable conformance

Pinned runtime control: react-swipeable 7.0.2. React 19.1/19.2, Node 24 and Bun are the
VPM targets. The upstream suite, helpers, four snapshots and MIT license are
retained with SHA-256 hashes. No upstream runtime is copied into the VPM package.

```sh
npm --prefix scripts/swipeable-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/swipeable-conformance/archives.cjs
```

The build adapter changes import locations, strips TypeScript and updates only the
old Jest snapshot guide URL for the current snapshot reader. For VPM, exactly five
listener-count assertions expect four listeners instead of three because VPM also
handles `touchcancel`. All 28 cases and all four snapshot expectations otherwise
remain unchanged. Both implementations execute on Node and Bun.

`regressions.cjs` mounts the public hook with actual React and jsdom. Twelve
scenarios check cancellation, multiple/changed fingers, unmount, target replacement,
disabling mouse tracking, window blur, mutated payloads, expired taps, iframe mouse
tracking, orphan ends and StrictMode. Eleven have explicitly asserted upstream
negative controls; StrictMode is shared compatibility. Package tests add seven
controller-level regression groups, including exact native-listener removal and
composed ref handoffs.

Chrome compares 48 deterministic gesture traces, including six explicit corrections
where expired gestures no longer emit taps. Eight source-audited app contracts
exercise configurator/messenger LTR/RTL closing. CDP sends trusted touch input to
verify native vertical scrolling is retained by default and prevented only when
requested for a handled direction, then sends a trusted mouse drag.

The private app verification is read-only and optional for public CI:

```sh
node scripts/swipeable-conformance/check-app.cjs /path/to/ventimath-private
```

It checks current `origin/main` callback/configuration and handler spread sites,
and records hashes. The verified app commit/hashes are in
[provenance](../../packages/vreact-swipeable/PROVENANCE.json). Browser fixtures model
those exact options and close guards, using synthetic scroll hosts; they do not
mount complete MUI/Astryx panels, access accounts or establish app adoption.

Archive checks compare packed bytes, install with fresh npm/Bun consumers, repeat
with frozen locks, validate CJS/ESM SSR and TypeScript 7 DOM consumers, and run the
public-hook suites and Chrome tests. React 19.1 is checked with npm, 19.2 with Bun;
Node and Bun execute each consumer. Chrome requires an installed browser
(`CHROME_BIN` override) and a local loopback listener. Consumers/profiles/servers
are removed on completion.

[Benchmarks](../../packages/vreact-swipeable/bench/results/README.md) use fresh
isolated workers, balanced AB/BA order and identical-source controls. Gesture and
hook-rerender cases use a deterministic hook/host harness, not timed React DOM.
Production React SSR initialization is a separate real-React workload. None is a
measurement of mobile responsiveness or application rendering latency.
