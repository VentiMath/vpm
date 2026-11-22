# vlru-cache

Independent bounded synchronous LRU caches for VentiMath's build and DOM tooling,
targeting the app-used surface of lru-cache 11.5.3. A Map holds key identity and a
doubly linked list tracks recency; no npm runtime dependencies or yallist remain.

```js
import { LRUCache } from 'vlru-cache';
const targets = new LRUCache({ max: 64 });
targets.set('node', '24');
targets.get('node');
```

Count and calculated-size limits evict the least recently used entry. The API
includes `set/get/peek/has/delete/clear/pop`, forward/reverse iteration,
`forEach/rforEach/find`, disposal before/after mutation, and bounded lazy TTL
with stale-read and age-refresh controls. Storing undefined deletes an entry.
Object/symbol keys retain identity. Size calculations must return positive safe
integers. The cache requires a count or size bound.

The CommonJS default constructor and ESM default alias support Babel's existing
`new LRU({max:64})`, `get` and `set` usage. They do not emulate all of v5:
modern set returns the cache, and keys returns an iterator. Legacy maxAge,
length, reset/del and dump/load APIs are outside this contract.

Async fetch/memo, automatic expiry timers, TTL-only unbounded caches, upstream
status instrumentation and internal storage inspection are not implemented.
Unsupported async/timer constructor options throw. This is an application-scoped
replacement, not a claim of the entire upstream API.

64,000 generated operations compare ordering, size, callbacks and return values
against 11.5.3. Controlled-clock expiry checks and unchanged Babel target selection,
CSS declarations, DOM queries and path resolution pass on Node 24 and Bun 1.4.4.
Tests verify that those callers actually execute the replacement's get/set.
Fresh/frozen npm/Bun installs and CJS/ESM TypeScript consumers also pass.

[Measurements](bench/README.md) report costs and controls separately. Package
availability does not mean the app has adopted this implementation.
