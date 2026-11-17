# vidb

Independent promise-based IndexedDB helpers for VentiMath browser storage.
Targets **idb 8.0.4**, with compatibility checks against the app's **7.1.1**.
Zero runtime dependencies. This is a browser API wrapper, not an IndexedDB
implementation for Node or Bun.

```js
import { openDB } from 'vidb';
const db = await openDB('local-settings', 1, {
  upgrade(db) { db.createObjectStore('settings'); }
});
await db.put('settings', { theme: 'dark' }, 'preferences');
const preferences = await db.get('settings', 'preferences');
db.close();
```

`openDB`, `deleteDB`, `wrap` and `unwrap` mirror the documented API. Requests
become promises; native properties and methods remain available. Database
shortcuts cover store/index reads and committed single-store writes. Transactions
have a `done` promise and a `store` shortcut when exactly one store participates.
Cursor movement returns the next cursor; async iteration supports automatic or
explicit advancement. Wrapped objects preserve identity, and `unwrap` recovers
the native object or request. Typed schemas constrain store names, keys, values,
indexes and readonly transaction writes.

The browser still owns transaction lifetime. Awaiting a network request inside a
transaction can let it close; vidb does not keep it alive or retry writes.
Load the wrapper in the same realm as its IndexedDB objects. It does not add
cross-realm object branding, a storage backend, or legacy browser polyfills.

Two intentional corrections are tested:

- `transaction.done` follows actual commit or abort. A prevented request error
  can recover and commit; an abort retains the transaction's underlying error.
  Upstream can reject early with `AbortError` even when the transaction commits.
- Wrapping an already settled request resolves/rejects its existing result.
  It does not wait indefinitely for a success/error event that already happened.

VentiMath's Firebase app, installations and messaging dependencies use idb.
Unchanged app-heartbeat and installation SDKs are tested in native Chrome with
synthetic records and mocked network responses. No real Firebase account or data
is accessed. Live push registration and Amplify DataStore integration are not
claimed. This package is built; application adoption and publication are separate.

Node/Bun tests use pinned fake-indexeddb and current/app black-box controls.
Native Chrome tests cover upgrades, blocked deletion, clone semantics, indexes,
write rollback, cursors, recovered errors and Firebase persistence. Fresh npm/Bun
archives and strict TypeScript consumers are also checked.

[Measurements](bench/results/README.md) use isolated processes and same-code
controls. Storage-operation cases use fake-indexeddb, so they measure this test
backend plus wrapper overhead, not browser disk latency or app throughput.
