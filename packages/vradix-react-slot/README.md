# vradix-react-slot

Independently written React 19 slot composition, matching **@radix-ui/react-slot
1.5.0**. `Slot` merges props onto a child element without adding a wrapper. It
provides `Slot`, its `Root` alias, `Slottable`, `createSlot` and `createSlottable`.
Its only runtime dependency is `vradix-react-compose-refs`; React 19 is a peer.

```jsx
import {Slot, Slottable} from 'vradix-react-slot';

function Button({children, icon, ...props}) {
  return <Slot {...props}>{icon}<Slottable>{children}</Slottable></Slot>;
}
```

Child props take precedence. Styles merge with child values winning; class names
join parent first. Composed event handlers run child first, then parent, preserving
the child's return value. A prevented event still reaches the parent handler, which
can inspect `defaultPrevented`; a thrown child handler stops the parent. ARIA
description IDs are deduplicated in child-first order.

`Slottable child={element}` also accepts a render function that receives the
element's children. Named factories preserve the same behavior with useful display
names and errors. Ref composition stays stable when refs are unchanged; React 19
cleanup functions are released once and all refs are cleared even if a cleanup
throws. Fragments do not receive a newly forwarded ref.

## Improvements and deliberate differences

- Ordinary single-element slotting skips child traversal and child-list allocation.
- Handler composition scans parent props; a child with many unrelated props does
  not need an additional full handler scan.
- Multiple `Slottable` targets throw instead of silently choosing the last target
  and combining unrelated content. A cyclic lazy child throws instead of looping.
- The render-function declaration rejects an explicit element `child` paired with
  non-function `children`, which would otherwise fail when rendered.
- The independently written ref helper owns cleanup and avoids allocating cleanup
  storage for ordinary refs.

The target is the current API. The app's 1.2.3 baseline is checked for ordinary
props, events and slotting, but its older behavior is not the target for render
functions, ARIA concatenation, strict invalid-child errors or marker identity.
Current markers use the shared `Symbol.for('radix.slottable')` protocol; old
1.2.3 markers use private symbols and cannot be mixed across package copies.
React versions before 19 are outside the tested peer contract. Ref cleanup does
not make arbitrary handler side effects transactional.

## Verification

[Conformance fixtures](../../scripts/slot-conformance/README.md) compare the
current release, the app baseline and VPM, including generated prop combinations,
invalid inputs and paired corrections. Unchanged Radix Primitive 2.1.3 callers
exercise `asChild`, StrictMode refs, updates, events, fragments, render functions,
lazy components and hydration. Clean npm/Bun archives verify both module formats,
SSR, TypeScript 7 declarations and browser bundling on Node 24 and Bun.

[Isolated measurements](bench/results/README.md) compare React's development
server renderer with each Slot/ref implementation. They do not measure browser layout,
paint or whole-application performance.

Ordinary button SSR takes 13.5% less time on Node 24 and 15% less on Bun in every
process pair beyond the control spread. Bun's 64-prop child takes 11.5% less time.
The other directions are inconclusive; all samples and controls remain in the report.

Built, but not released or adopted by VentiMath. [Provenance](PROVENANCE.json)
records the independent implementation and exact upstream reference. Upstream MIT
attribution is retained; no clean-room claim is made.
