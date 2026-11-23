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
initial markup for the checked app patterns matches both controls and hydrates in place.
For an initial keyframe array beginning with null, VPM retains its existing first
non-null value; both controls omit that initial style. This is an explicit
regression check, not a parity claim for that additional case.

The November 22 source refresh at VentiMath `2721de95` found 43 non-test import
files, including public error views and the powered-by link buttons. Imports remain limited to `motion` and `useAnimation`
from `motion/react`. These static counts include auxiliary screens; they do not
establish route reachability or app adoption. Controls are Framer Motion 14.7.0 and the app's 12.36.0, on React
19.3.1. Checks use synthetic contest/navigation examples and the app's animation
values; they do not run the whole application.

Drag, gestures, layout projection, exit/AnimatePresence, timelines, useAnimate,
SVG-specific animation geometry and other unobserved exports remain outside
this subset. Unsupported layout/gesture/exit props reject instead of appearing
to work. This package does not supply the missing Material component families.
The `motion-14.7.0-r2` consumer release pins both VPM dependencies to public archive
URLs. Fresh npm/Bun installs, strict declarations and the 46 browser scenarios
also pass against the app’s Material 7.2.0 and React 19.3.1. Actual VentiMath
main-branch adoption and production deployment remain separate. The application
reports a passing full site suite on PR #454 with r2, plus public-404 Chrome
final-state parity; signed-in Chrome comparisons remain unverified. See
[application evidence](../../docs/ADOPTION.md#motion-r2-application-verification)
and [installation](../../docs/INSTALLATION.md#motion).

[Conformance](../../scripts/motion-react-conformance/README.md),
[benchmarks](bench/results/README.md) and [provenance](PROVENANCE.json) document
the verified scope. SSR measurements are not browser frame-rate claims.
Earlier timing reports are historical. The current initial-render measurements
show 23–26% less Node time across all three workloads against both controls.
The fade entrance now takes 23% less Node time, reversing the earlier regression.
Bun takes 29–38% less time across these comparisons. The balanced fresh-process
pairs and identical-source controls establish these directions for the measured
SSR workloads; they do not establish browser animation or whole-app speed.

Runtime targets are Node 24, Bun 1.4.4, React 19.3 and modern browsers.


Custom root lifecycle follow-up: a React component may replace its DOM element
without unmounting its Motion wrapper. Animation ownership now follows that
replacement, releases the previous element, and resumes on a root that returns
after rendering null. A callback ref changing identity on the same element does
not restart playback. The app's polymorphic root boundary motivated this check;
current/app/VPM browser fixtures verify replacement endpoints and ref identity.
The pinned controls leave a root restored after null at opacity zero; VPM
deliberately resumes it to its target.
This does not establish identical intermediate animation trajectories or app
adoption. [Follow-up SSR measurements](bench/root-lifecycle/README.md) retain
isolated controls; this is a lifecycle correction, not a new speed claim.

Before the initial-render optimization, the lifecycle benchmark recorded about 7% more Node time for simple fade SSR
against both controls. Other Node directions are unestablished. Bun is lower
for all three Motion 14 cases (about 12%); app 12 fade is
unestablished, while variants and initial-false are lower. These SSR comparisons
do not measure the browser lifecycle correction.


Initial rendering now avoids temporary entry/keyframe arrays, combines native
prop filtering with unsupported-prop validation and allocates child tracking only
when a child mounts. No cross-request style cache or mutable input snapshot is
introduced. [Optimized SSR measurements](bench/initial-render/README.md) supersede
the earlier timing reports for this implementation. Browser ownership checks
continue to cover custom-root replacement/restoration, variants, stable refs,
StrictMode, unmount and reduced motion.

The benchmark labeled fade includes an opacity/translation entrance; it is not an opacity-only workload. Sparse initial keyframe arrays retain their existing endpoints.

The notification-bell follow-up checks the app's one-second interruption of its
six 200ms rotation cycles, followed by a reset with no explicit transition.
Both pinned controls and VPM return to zero rotation, unit scale and the active
theme color, retain the same node, and stay stopped across a parent rerender.
This adds consumer acceptance coverage without changing the runtime or making
a new performance claim.

[Release SSR measurements](bench/release.md) rerun the balanced isolated-process harness on Node 24 and Bun 1.4.4. They do not measure animation frame rate.

The `motion-14.7.0-r2` correction handles jsdom computed-style readers that return
authored transform functions instead of matrices. It uses Motion's identity
fallback for those values while retaining strict matrix validation. The reported
calendar (8 tests) and powered-by links (13 tests) files pass in an isolated copy
of the app adoption branch after this correction. A jsdom animation/control
regression now runs on Node and Bun, including against the packed release. This
does not claim that the entire site suite or app adoption has completed.
