# vmotion

An independent **Motion 14.7.0 React layer** over VPM's `vmotion-dom`, focused on
VentiMath's actual callers. No upstream Motion or Framer Motion runtime ships.
This is an application subset, not the complete Motion API or an app cutover.

```jsx
import { motion, useAnimation } from 'vmotion/react';

<motion.div initial="hidden" animate="show" variants={{
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
}}>
  <motion.button variants={{
    hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 }
  }}>Open contest</motion.button>
</motion.div>
```

The checked application patterns are native div/span/button roots, Material
`component={motion.div}`/`motion.button`, opacity/translation/scale entrances,
inherited variants through ordinary wrappers, child staggering, `initial={false}`,
and the notification bell's repeated rotation, CSS-variable color and interrupted
reset. `useAnimation` (also `useAnimationControls`) provides start/set/stop;
`start` returns a completion promise. Function variants receive `custom`.
`MotionConfig` supplies default transitions and reduced-motion policy;
`useReducedMotion` exposes the user preference with a null server snapshot.

React owns the nodes. Equal animation specifications do not restart when a
parent rerenders. Focus, refs and DOM identity survive theme and ordinary prop
updates. Animation work and element bindings are released on unmount, including
Strict Mode replay. Variant groups keep independent animation boundaries and
newly mounted children animate without restarting an unchanged parent. SSR
initial markup matches the current and app controls and hydrates in place.

The source inventory at VentiMath `3aa9eb28` found 43 non-test files and 110 Motion
JSX roots, importing only `motion` and `useAnimation` from `motion/react`. Those
are static counts, including auxiliary screens, not route reachability or proof
of app adoption. Controls are Framer Motion 14.7.0 and the app's 12.36.0, on React
19.3.1. Checks use synthetic contest/navigation examples and the app's animation
values; they do not run the whole application.

Drag, gestures, layout projection, exit/AnimatePresence, timelines, useAnimate,
SVG-specific animation geometry and other unobserved exports remain outside
this subset. Unsupported layout/gesture/exit props reject instead of appearing
to work. This package does not supply the missing Material component families.
Full production integration and a consumer release still need separate checks.

[Conformance](../../scripts/motion-react-conformance/README.md),
[benchmarks](bench/results/README.md) and [provenance](PROVENANCE.json) document
the verified scope. SSR measurements are not browser frame-rate claims.
The measured 12-root SSR workloads take 6–8% less time on Bun than the app
control and 11–14% less than Motion 14. On Node, fade SSR takes about 8% more
than the app control; variants and initial=false have no established difference.
Versus Motion 14, Node takes 2.5–5.9% more. Raw process-pair variation and
identical-source controls are retained; no browser-performance claim follows.

Runtime targets are Node 24, Bun 1.4.4, React 19.3 and modern browsers.
