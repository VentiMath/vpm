# React useSize conformance

Pinned baseline: `@radix-ui/react-use-size` 1.1.5; real caller:
`@radix-ui/react-popper` 1.4.0. React 19.1.0 matches the application and 19.2.4 is
checked separately. Fixtures are original npm archives locked outside runtime
packages. Only module resolution is redirected; their runtime implementations
are not changed. The VPM hook and layout-effect dependency are independently
implemented. Upstream source hashes are checked by the contract suite.

```sh
npm --prefix scripts/radix-use-size-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/radix-use-size-conformance/current ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-react-use-size/test/contracts.test.cjs
bun test ./packages/vradix-react-use-size/test/contracts.test.cjs
node scripts/radix-use-size-conformance/archives.cjs
```

Both runtimes execute isolated upstream/VPM controls on React 19.1/19.2. Checks
cover initial offsets, fractional border boxes, legacy single-box shape,
coalescing, unchanged snapshots, target/null transitions, observer ownership in
foreign windows, StrictMode cleanup and abandoned suspended renders. Upstream
controls explicitly reproduce its old-target, repeated-notification and
vertical-dimension differences. VPM additionally checks empty boxes, late
notifications and a window without ResizeObserver.

The unchanged Popper caller renders its actual arrow, observes the arrow wrapper,
receives an updated size and unmounts without observers or frames left behind.
The installed-archive gate verifies CJS/ESM, server/client use, TypeScript 7
NodeNext/Bundler DOM-only consumers and browser bundling with both package
managers and React versions. Chrome uses native ResizeObserver, real fractional
CSS border-box dimensions, a dynamic inherited writing-mode change and an iframe
observer. jsdom does not implement live computed-style objects; its unit fixture
sets writing mode before observation. The browser check verifies CSSOM liveness.
`CHROME_BIN` can select a browser executable; Linux CI uses the installed Chrome.

[Isolated measurements](../../packages/vradix-react-use-size/bench/results/README.md)
use React production mode and jsdom, one implementation per fresh process,
balanced order and identical-upstream controls. The normal cases use horizontal
writing mode; correctness cases do not contaminate the timing workload. RAF and
ResizeObserver delivery are controlled, while jsdom style/DOM operations remain
real. Warmup includes the first computed-style acquisition. They do not measure
real browser layout, paint, network or application throughput. Every raw sample
and relevant source hash is retained.
