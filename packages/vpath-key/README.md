# vpath-key

Independent PATH environment-key lookup targeting **path-key 4.0.0**, also
checked against VentiMath's **3.1.1** and unchanged **cross-spawn 7.0.6** resolver.
No runtime dependencies. Node 24 and Bun 1.4.4.

```js
import pathKey from 'vpath-key';
pathKey({platform: 'win32', env: {Path: '/example/bin'}}); // 'Path'
```

Returns `PATH` off Windows. On Windows, returns the last own enumerable spelling
of PATH, or `Path` when absent. Values are never read, environment objects are
not mutated, and results are not cached. Default environment/platform are read
at call time. The implementation scans ASCII key characters without reversing
the key array or creating uppercase copies. This preserves duplicate-key order.

CommonJS is callable and ESM has a default export. Only undefined triggers an
option default, matching version 4; version 3 also defaulted null/empty values.
The observed cross-spawn caller supplies an ordinary environment object and is
unaffected. Simulated Windows behavior is tested; native Windows process launch
is not certified. This package does not launch commands.

[Checks](../../scripts/path-key-conformance/README.md) include 8,192 generated
environments, all 16 PATH casings, getter/inheritance guards, unchanged resolver
calls and clean archives. [Measurements](bench/README.md) are isolated lookups,
not build-time speed claims. Built, not yet published or adopted by the app.
