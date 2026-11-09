# vmotion-utils

Independent animation utilities targeting **motion-utils 14.7.0**. This is a
foundation beneath Motion's animation and React layers, used by VentiMath's
AMC/Putnam pages, calendar and directory headers. It has no runtime dependencies
and contains no upstream runtime implementation.

```js
import { cubicBezier, SubscriptionManager } from 'vmotion-utils';

const ease = cubicBezier(.42, 0, .58, 1);
const listeners = new SubscriptionManager();
const unsubscribe = listeners.add(value => console.log(value));
listeners.notify(ease(.5));
unsubscribe();
```

The root has the same 39 utility exports as the current control: scalar/array
helpers, easing functions and modifiers, Bezier inversion, step functions,
`memo`, `pipe`, diagnostics, `MotionGlobalConfig` and `SubscriptionManager`.
CJS and ESM share configuration and constructor identity. Node 24, Bun 1.4.4,
React 19.3.1 caller fixtures and Chrome are checked. The package is built;
publication and application adoption remain separate.

## Behavior and changes

- Removing a listener inside its callback does not skip the next listener.
  Additions wait until the next notification; removing another listener prevents
  its call; clearing ends the current notification. Nested calls remain supported.
- A stale disposer cannot remove a later registration of the same function.
  Registration IDs distinguish lifetimes, including after `clear()`.
- `memo` caches an `undefined` result instead of running initialization again.
  A thrown initialization remains retryable.
- Bezier inversion uses safeguarded Newton steps and a bisection fallback.
  Analytical quadratic and cube-root curves check accuracy independently of
  upstream. Non-finite controls and x controls outside [0, 1] reject explicitly.
- Step counts must be positive safe integers and direction must be `start` or
  `end`. Valid step outputs preserve Motion's current endpoint convention:
  `steps(4)(1)` is `.75`, and `steps(4, 'start')(0)` is `.25`.

The numerical target is current 14.7.0, checked at an absolute tolerance of
0.000002 for normalized curves. The application's 12.36.0 control has less
precise outputs: the built-in grid differs by at most about 0.0011. Its comparison
allows 0.0012 for named curves and 0.005 for custom curves; these are disclosed
migration tolerances, not claims of identical floating-point output.

Diagnostics follow the upstream development/production contract. Bundlers should
replace `process.env.NODE_ENV`, as they do for Motion itself. `warning` and
`invariant` are disabled in production; `warnOnce` remains active. Invalid curve
and step configuration rejects in both modes. Easing progress is intended for
[0, 1]; non-linear Bezier curves clamp outside that range.

## Scope and evidence

This package implements utilities, not Motion's renderer, gestures, layout
engine or React components. The unchanged Motion 14.7.0 and application 12.36.0
callers are fixture controls. They verify value subscriptions, sampled animation,
interpolation, staggering, real React fades, transform updates and unmounting.
Both controls reproduce the skipped-listener bug through `MotionValue`; the VPM
utility replacement fixes it in both callers.

[Conformance](../../scripts/motion-utils-conformance/README.md) records the
exact controls and caller scope. [Benchmarks](bench/results/README.md) retain
isolated-process samples and identical-source controls. Utility timings are not
claims of a faster application or complete Motion compatibility.

The recorded four-stage pipeline uses 63% less time on Node and 34% less on Bun;
a 32-listener registration/removal cycle uses 37% and 21% less. There are also
regressions: easing evaluation uses about 6% more time on Node and 12% on Bun
(roughly 0.14 / 0.24 microseconds per 100 samples). Bezier construction and single
listener notification add roughly 1 ns on Node and 4 ns on Bun. The 32-listener
notification difference is unestablished against the controls. These measurements
include validation and the subscription fixes; no overall performance win is claimed.
