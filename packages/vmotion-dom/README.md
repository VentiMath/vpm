# vmotion-dom

Independent numeric animation primitives targeting **motion-dom 14.7.0**, with
12.36.0 as the application's comparison control. This is the first implementation
unit of Motion DOM, not a complete renderer or a package ready for app adoption.

```js
import { interpolate, stagger } from "vmotion-dom";
const opacity = interpolate([0, 0.5, 1], [0, 0.3, 1]);
const delay = stagger(0.05, { from: "center" });
opacity(0.25); // .15
delay(0, 5); // .1 seconds
```

## Implemented

- `mixNumber(from, to, progress)` blends two numbers, including extrapolation.
- `interpolate(input, output, options)` maps numeric keyframes, supporting
  descending ranges, duplicate boundaries, clamping, extrapolation and per-segment
  easing. Non-numeric outputs need an explicit `mixer` factory.
- `stagger(duration, options)` maps list indices to delays: first, last, center,
  edges or a numeric origin, optional starting delay and Motion easing definitions.

Interpolation snapshots the ranges and easing list. Mutating the caller's arrays
does not change an existing timeline. Custom mixer outputs are shallow snapshots;
the caller's factory owns how object values are captured. Invalid, empty, mismatched,
non-finite or non-monotonic numeric ranges reject during construction. Long ranges
use binary segment lookup. The runtime is independently authored and depends only
on `vmotion-utils`.

## Still to build

Motion values and frame scheduling come next, followed by animation playback and
DOM effects. Color/complex-string mixers, grid/random staggering, WAAPI,
gestures/layout and the React renderer remain unimplemented. Unsupported grid and
random staggering reject explicitly. This package must not replace `motion-dom`
under Framer Motion yet. VentiMath's contest fades, calendar and directory headers
are the intended callers; their adoption is not claimed.

[Conformance](../../scripts/motion-dom-conformance/README.md) compares numeric
contracts against current and application controls, with separate correctness
checks, strict types and packed installs. [Measurements](bench/results/README.md)
use isolated processes and identical-source controls. These scalar timings do not
establish an application frame-rate improvement.

The recorded numeric mapping and construction cases use less time on both
runtimes: long-timeline lookup is about 72% lower on Node and 80% lower on Bun;
16-keyframe construction is about 81%/44% lower. The default numeric path avoids
allocating a function for every segment while retaining range snapshots and
validation. List staggering is lower on Node; Bun's direction is unestablished
(the paired median is about 8% higher, with an order-sensitive outlier retained).
These measurements cover the implemented scalar unit only.
