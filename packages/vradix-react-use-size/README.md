# vradix-react-use-size

Independent replacement for `@radix-ui/react-use-size` **1.1.5**, exposing
`useSize(element)` for React 19. It reports an HTML element's physical border-box
width and height, and is the hook used by current Radix Popper's arrow. One VPM
dependency: [vradix-react-use-layout-effect](../vradix-react-use-layout-effect).
No Babel or rectangle-polling dependency.

```js
import { useSize } from 'vradix-react-use-size';
const size = useSize(element); // { width, height } | undefined
```

Initial client measurement uses `offsetWidth`/`offsetHeight` in a layout effect.
ResizeObserver border-box notifications retain fractional dimensions and are
coalesced into one animation frame. Missing/empty border-box data falls back to
offsets. A null target or server render returns `undefined`; effects only
subscribe after commit. Imports are safe without a DOM. Node 24 and Bun are test
runtimes; measurement itself needs a browser document.

## Differences and fixes

- A new or null target never receives the previous target's size during render.
- Identical dimensions retain snapshot identity and avoid a committed rerender.
- Observation and animation frames belong to the target's window, including
  iframe elements. Cleanup disconnects and cancels work; late delivery is ignored.
- Logical ResizeObserver dimensions become physical width/height in vertical or
  sideways writing modes. The retained computed-style object is live per CSSOM;
  native Chrome verifies a later inherited writing-mode change. jsdom's style
  object is a snapshot, so its synthetic check covers the initial writing mode.
- If that window lacks ResizeObserver, initial and window-resize measurements
  still work. This fallback does **not** continuously track element-only changes.

The [conformance checks](../../scripts/radix-use-size-conformance/README.md)
exercise React 19.1/19.2, StrictMode, SSR, both original/fixed behaviors and the
unchanged Popper 1.4.0 caller. Installed archives are checked with npm and Bun,
Node/Bun imports, TypeScript 7 DOM-only types and real Chrome ResizeObserver.
[Benchmarks](bench/results/README.md) retain balanced isolated processes, identical
baseline controls and regressions; jsdom timings exclude native browser layout
and are not application latency claims. [Provenance](PROVENANCE.json) records the
pinned comparison sources. Implemented here; not yet released or adopted.

The [build-dependency audit](../../docs/BUILD-DEPENDENCIES.md) explains why the
manifest-only `useRect` dependency is not a prerequisite for current Popper.

In the recorded synthetic tests, unchanged-size notifications take 91.5% less
time on Node and 88.2% less on Bun. Switching targets costs 60.7% / 90.7% more
(about 5.4 / 5.6 microseconds) because the first render no longer displays the
previous target before the layout-effect measurement. Other measured directions
are not established across the controls. This is not a browser-layout speedup.
