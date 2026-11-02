# vuse-sidecar

Independent **use-sidecar 1.1.3** APIs for React 19. Sidecars separate a component's
visual UI from its effects; media carry their components or messages. The actual
`react-remove-scroll` sidecar beneath Radix is a verified caller. React is a peer;
`tslib` and `detect-node-es` are removed. Built and tested, not released or adopted.

```tsx
import {createSidecarMedium, exportSidecar} from 'vuse-sidecar';
const medium = createSidecarMedium<{enabled: boolean}>();
const Effect = exportSidecar(medium, ({enabled}) => {
  // Install the component's behavior with ordinary React effects.
  return null;
});
const element = <Effect sideCar={medium} enabled />;
```

All seven exports are available through CJS and ESM: `createMedium`,
`createSidecarMedium`, `exportSidecar`, `useSidecar`, `sidecar`, `renderCar` and
`setConfig`. Runtime and declarations are independently authored.

## Contract and corrections

Before assignment, a medium reads its last live value or its default. Each
`useMedium` call returns an idempotent cleanup. Cleanup removes **that registration**,
including duplicate values and NaN; upstream removes all equal values and cannot
remove NaN. An assigned medium cannot be read. Assignment is a one-consumer
transition: existing entries deliver immediately, including synchronous reentrant
writes; later asynchronous writes deliver in FIFO microtask batches. Cleanup does
not cancel entries already detached for delivery. Callback exceptions propagate;
there is no error-isolation promise for medium consumers.

A sidecar medium initially reads `null` and defaults to `{async: true, ssr: false}`.
`exportSidecar` registers its component and returns a marked wrapper that removes
the `sideCar` prop before rendering the target. `useSidecar` resolves an importer
or a supplied medium and returns `[component, error]`. Async media delay cache
reuse until their loading effect; synchronous media may reuse a cached component.
Node environments suppress loading unless `ssr` is enabled. Server rendering
never runs the loading effect, so SSR does not fetch missing components.

The cache is keyed by both importer and medium. Changing either starts the new
request and ignores late results from the old one. Unmounted or discarded
StrictMode effects cannot seed the cache or overwrite the active component.
Thrown imports, rejected promises and missing exports/media become handled load
errors. `sidecar` renders its fallback node; upstream returns a function that
React does not render. `setConfig({onError})` now receives active load failures.
If that handler throws, its error is logged without replacing the load error.

`renderCar` starts with `defaults(props)` and publishes the source component's
render-prop arguments after commit. It uses current child render functions and
supports conditional invocation of the render prop without changing the source's
hook order. Defaults establish the initial state, not a value reset on every
parent render. React 16–18 and React Native are outside verification.

## Evidence

All 14 original assertions plus 14 focused groups pass on Node 24 and Bun with
React 19. Original controls reproduce the deliberate behavior changes. Three
additional isolated controls cover synchronous throws, null exports and missing
media without hiding upstream's uncaught/unhandled failures. The unchanged
`react-remove-scroll` caller verifies sidecar mounting, nested lock counts,
disabling and cleanup in jsdom; full browser wheel/touch containment belongs to
that caller and is not claimed here.

Clean npm/Bun archives verify CJS/ESM identity, SSR, browser bundling without
upstream runtime helpers and strict TypeScript 7 JSX consumers. See the
[fixture](../../scripts/sidecar-conformance/README.md) and
[measurements](bench/results/README.md). Benchmarks isolate implementations in
fresh processes with balanced order and identical-source controls; they measure
local CPU and jsdom work, not application frame rate.

Original tests and the [MIT license](LICENSE) remain attributed in
[provenance](PROVENANCE.json).
