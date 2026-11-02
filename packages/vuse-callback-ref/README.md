# vuse-callback-ref

Independent **use-callback-ref 1.3.3** APIs for React 19. Observable refs notify
when their value changes; merged and transformed refs connect a component's own
ref to its caller's ref. The `react-remove-scroll` UI beneath Radix uses this
behavior. React remains a peer; `tslib` and all runtime dependencies are removed.
Built and tested, not yet released or adopted by VentiMath.

```tsx
import * as React from 'react';
import {useMergeRefs} from 'vuse-callback-ref';

function Panel({ref: parentRef}: {ref?: React.Ref<HTMLDivElement>}) {
  const ownRef = React.useRef<HTMLDivElement>(null);
  return <div ref={useMergeRefs([ownRef, parentRef])}>Content</div>;
}
```

All nine exports are available through CJS and ESM: `assignRef`,
`createCallbackRef`, `useCallbackRef`, `mergeRefs`, `useMergeRefs`, `transformRef`,
`useTransformRef`, `refToCallback` and `useRefToCallback`. Hook refs retain their
identity. Observable refs compare with `===`, matching upstream (including NaN).
Callbacks receive the new and previous values. Changing only a transformer or
target does not immediately reassign a transformed ref; the next value change
uses the new callback, as in upstream.

## Corrections

- `useMergeRefs` preserves `0`, `false` and `""` initial values.
- Each render snapshots ref membership. Mutating a reused array cannot hide a
  removed ref or prevent an added ref receiving the current element.
- Merged assignments attempt every ref, even when one callback throws. Cleanup
  clears the remaining refs before rethrowing the first error.

The library preserves 1.3.3's callback-notification contract: detachment calls a
callback with `null`; callback-returned React 19 cleanup functions are not executed
by these object-ref adapters. This is separate from React's native callback-ref
cleanup handling. Native React 16–18 and React Native are outside verification.

## Evidence

All **22 unchanged upstream tests** and four regression/caller groups
pass on Node 24 and Bun with React 19. The actual `react-remove-scroll` UI verifies
object/callback ref replacement, child forwarding and unmounting with scrolling
disabled; this does not claim complete scroll-lock or browser gesture coverage.
Packed npm/Bun installs verify CJS/ESM identity, SSR, browser bundling and strict
TypeScript 7 consumers. [Fixture](../../scripts/callback-ref-conformance/README.md).

[Measurements](bench/results/README.md) isolate cases and implementations in fresh
processes with balanced order and identical-source controls. They measure local
CPU and jsdom rendering, not application frame rate.

The runtime and declarations are independently authored. Original source and
tests remain in the comparison fixture under the [MIT license](LICENSE), with
[provenance](PROVENANCE.json).
