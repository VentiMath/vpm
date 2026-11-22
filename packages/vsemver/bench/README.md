# Semantic version checks

Compare semver 7.5.4 (the app control) with vsemver on Node 24 and Bun 1.4.4. Each implementation runs in separate, alternating workers. Repeated Range construction creates a new mutable object each time but allows both implementations to reuse parsed ranges. The uncached case uses distinct ranges. VPM isolates comparator/version arrays from its private cache; this costs allocations. Babel compilation-targets runs unchanged with only semver substituted.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Parse release version | 0.169 | 0.172 | +1.8% | unestablished at this precision |
| Node 24 | Repeated Babel range check | 1.090 | 0.489 | -55.2% | lower time in every pair, beyond control spread |
| Node 24 | Repeated Range construction | 0.681 | 1.110 | +62.8% | higher time in every pair, beyond control spread |
| Node 24 | Uncached distinct ranges | 4.858 | 3.382 | -30.4% | lower time in every pair, beyond control spread |
| Node 24 | Capacitor version difference | 0.318 | 0.406 | +27.9% | higher time in every pair, beyond control spread |
| Node 24 | Babel compilation targets | 20.105 | 19.350 | -3.7% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Parse release version | 0.116 | 0.116 | +0.0% | unestablished at this precision |
| Bun 1.4.4 | Repeated Babel range check | 0.783 | 0.243 | -69.4% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Repeated Range construction | 0.507 | 0.888 | +77.4% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Uncached distinct ranges | 4.196 | 3.683 | -11.9% | unestablished at this precision |
| Bun 1.4.4 | Capacitor version difference | 0.355 | 0.289 | -18.8% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Babel compilation targets | 2.419 | 2.335 | -3.0% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)

Control variation was large in some Bun cases; changes within that spread are
unestablished. Repeated range construction remains slower, while recurring
satisfaction checks are faster. These timings do not establish an application
build speedup. Input validation, fixture coverage and cache-isolation tests are
unchanged by the allocation optimization.
