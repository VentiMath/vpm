# vdecko

Independent replacement for Decko 1.2.0: `bind`, `memoize` and `debounce`, with
zero runtime dependencies. Supports ordinary functions and legacy method
decorators. Modern standard decorator contexts are not the legacy descriptor API.

```js
import { bind, memoize, debounce } from 'vdecko';
const read = memoize(key => key.toUpperCase(), { caseSensitive: false });
const update = debounce(10, value => console.log(value));
const bound = bind(function () { return this.id; }, { id: 'contest' });
```

`memoize` keys by the stringified first argument, including `undefined` and the
empty string. The cache belongs to the wrapper, so a decorated prototype method
shares it across instances, as upstream does. Supply `{ cache, caseSensitive }`
to seed/share a cache or fold case. Results, including `undefined` and promises,
are cached; thrown errors are not.

`debounce` keeps the latest receiver and arguments within a window measured from
the **first** call. Subsequent calls do not restart its timer. This matches Decko's
behavior despite differing from other libraries' debounce functions. A decorated
prototype method shares its pending window across instances. It returns nothing.

Corrections: `__proto__` is stored as an own memoization entry without changing a
supplied cache's prototype. Delayed callbacks clear pending state before invoking
user code, so recursive calls schedule another window and exceptions cannot
permanently disable the wrapper. Declarations include the function forms and
actual option objects that upstream's old declarations omit.

The recorded caller was Redoc's history and scrolling services. App main
`211e2186` removes that unused viewer. Those unchanged
services pass in Chrome with only Decko replaced. This does not claim app adoption
or verification of every Redoc screen. Node 24 and Bun 1.4.4 are tested.

Isolated measurements found binding 55–56% lower time on Node/Bun, cache hits
15% lower on Node and 41% lower on Bun, and memoized construction/misses
24% and 47% lower respectively. Lazy bound-method construction had no established
difference. These are wrapper costs, not page-load or timer-latency claims.

[Validation](../../scripts/decko-conformance/README.md),
[isolated measurements](bench/results/README.md), and
[provenance](PROVENANCE.json).
