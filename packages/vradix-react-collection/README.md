# vradix-react-collection

Independent implementation of the stable **@radix-ui/react-collection 1.2.0**
API used by current Radix Menu and Roving Focus. Four VPM dependencies; React and
ReactDOM 19 are peers.

```jsx
import { createCollection } from 'vradix-react-collection';

const [Collection, useCollection, createCollectionScope] = createCollection('List');

function ReadItems() {
  const getItems = useCollection(undefined);
  return <button onClick={() => console.log(getItems())}>Read current order</button>;
}

<Collection.Provider scope={undefined}>
  <Collection.Slot scope={undefined}>
    <div>
      <Collection.ItemSlot scope={undefined} value="first">
        <button>First item</button>
      </Collection.ItemSlot>
    </div>
  </Collection.Slot>
  <ReadItems />
</Collection.Provider>
```

## Contract and improvements

`createCollection` returns the Provider/Slot/ItemSlot components, a hook returning
a stable `getItems` callback, and the scope factory. Items carry committed custom
metadata and their element ref. Collection and item slots add no wrapper element;
the item marker remains `data-radix-collection-item`. Metadata stays out of DOM
props. The container's native props belong on its child element.

- Reads traverse marked descendants once and look up registered items by element.
  This replaces repeated `indexOf` searches during sorting. No persistent DOM-order
  cache or MutationObserver is required; synchronous DOM reordering is immediately
  visible to the next read.
- Layout registration exposes items to parent layout effects once the container
  ref is attached. Unchanged metadata preserves registrations. Ref changes,
  unmounts, and React StrictMode replay clean up the correct registration.
- Multiple items slotted onto one element remain distinct. Nested scopes isolate
  their records even when their marked elements are descendants of another list.
- Reads exclude registered items outside the current container, including detached
  and portalled elements. Upstream places those items at the start of its result.
  This intentional difference keeps an unrelated element out of the container's
  navigation list. Portal the entire collection root to retain its items.
- The unused upstream primitive dependency is omitted. The runtime uses VPM Slot,
  refs, context and layout-effect packages; the complete closure is five packages.

The experimental `unstable_createCollection` and its ordered dictionary API are
**not implemented**. Current Menu 2.2.1 and Roving Focus 1.2.1 use the stable API;
this package does not claim the experimental surface. Collection itself does not
implement keyboard navigation, focus rules, selection or ARIA roles.

## Verification

[Paired fixtures](../../scripts/radix-collection-conformance/README.md) run on
Node 24 and Bun with React 19.1/19.2. They cover SSR/hydration, metadata updates,
live order, node replacement, nested scopes, duplicate slots, ref cleanup and
StrictMode. Native Chrome runs the unchanged current Menu and Roving Focus callers:
disabled items, Home/End, reordering, typeahead, Escape/focus return, looping and
LTR/RTL. It also checks iframe ownership and focus-preserving DOM moves.

Clean npm/Bun fresh and frozen archive installs verify the five-package closure,
CJS/ESM identity, DOM-free SSR, TypeScript 7 DOM-only consumers and browser bundles.
Safari, Firefox and manual assistive-technology acceptance are not established.

[Balanced isolated benchmarks](bench/results/README.md) retain raw samples,
identical-code controls and source hashes. These are synthetic React/jsdom
workloads, not measured application latency or browser paint gains. In this
recording, 256-item reads take 8.8% less time on Node and 6.7% less on Bun;
unchanged 16-item renders take 49% and 16.2% less. SSR takes 53.8% and 11.6%
less. These directions exceed identical-code control spread in every pair;
16-item read differences are inconclusive on both runtimes.

Built as an integration candidate; not released or adopted by VentiMath.
[Provenance](PROVENANCE.json) records the inspected reference and independent
implementation. No upstream runtime is copied; this is not a clean-room claim.
