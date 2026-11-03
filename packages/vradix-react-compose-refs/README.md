# vradix-react-compose-refs

Independently written `composeRefs` and `useComposedRefs`, matching
**@radix-ui/react-compose-refs 1.1.5** for React 19. The app's 1.1.2 version is
also retained as a comparison. React is the only peer dependency; there are no
other runtime dependencies.

```jsx
import {useComposedRefs} from 'vradix-react-compose-refs';

function Button({forwardedRef, localRef}) {
  return <button ref={useComposedRefs(forwardedRef, localRef)}>Save</button>;
}
```

`composeRefs(...refs)` returns a callback that assigns callback and object refs
in argument order, ignoring `null` and `undefined` refs. If any callback returns
a React 19 cleanup function, the composed callback returns a cleanup function;
otherwise it returns `undefined`. During cleanup, refs with a returned cleanup
run that function; other refs receive `null`. Attachment exceptions propagate
immediately, preserving upstream's order and partial-attachment behavior.

`useComposedRefs` keeps the composed callback stable while its input refs remain
stable. Keep the number and order of participating refs fixed, as with upstream's
hook dependency list. Server rendering is supported; refs attach only in the DOM.
React versions before 19 are outside the tested peer contract.

## Improvements and deliberate differences

- Ordinary attachment allocates no cleanup-result array. Storage is created only
  when a callback actually returns a cleanup function.
- Cleanup is idempotent and safe against reentrant invocation. Upstream runs the
  same cleanup callbacks again if the returned cleanup is called twice.
- A throwing cleanup does not strand the remaining refs: all are released in
  order, then the first thrown value is propagated unchanged. Upstream stops at
  the first exception, leaving later object and callback refs attached.
- Stable hook inputs reuse the composition without creating a new unused composed
  callback on each render.

These changes do not make arbitrary callbacks transactional, deduplicate refs,
or coordinate multiple independently created composers sharing the same ref.

## Verification

[Comparison fixtures](../../scripts/compose-refs-conformance/README.md) cover
125 mixed-ref combinations per implementation, callback ordering, attachment
errors, ignored return values and paired cleanup-error/idempotence controls.
Unchanged Radix Slot **1.5.0 and 1.2.3** callers run through original and VPM
composition on React 19, including StrictMode mount/cleanup, updates and unmount.
Hook identity changes, SSR, clean npm/Bun archives, CJS/ESM identity, TypeScript 7
NodeNext/Bundler declarations and browser bundling are checked on Node 24 and Bun.

[Isolated benchmarks](bench/results/README.md) retain balanced process pairs,
identical-upstream controls and all raw samples. Plain attachment takes 34% less
time on Node 24 and 66.8% less on Bun; mixed attachment/cleanup takes 29.6% and
37.4% less, respectively. Those directions hold in every pair beyond control
spread. Composition creation is inconclusive. Helper timings do not measure
application rendering speed.

Built, but not released or adopted by VentiMath. [Provenance](PROVENANCE.json)
records the reference package and independent implementation. Upstream MIT
attribution is retained; no clean-room claim is made.
