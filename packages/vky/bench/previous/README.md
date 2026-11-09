# vky code-change comparison

Both implementations run on Bun 1.4.4. The baseline is the first
independent vky implementation at commit 552f1a3df695e4cc0f4846c22d272aa9742ffd04.
This isolates the cancellation-scope change from the Bun runtime upgrade.

The same five workloads and process-isolated AB/BA harness are used as in the
[upstream comparison](../results/README.md): four comparison pairs, two
identical-baseline control pairs, untrimmed samples, warmup and validation outside
timing. In the [raw recording](bun-isolated.json), fields named upstream refer to
the previous VPM implementation, not Ky.

| Case | Previous ns | Current ns | Paired time change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| create client | 368 | 347 | -6.8% | 10.2% | unestablished at this precision |
| GET JSON | 12687 | 10993 | -11.3% | 3.2% | lower time in every pair, beyond control spread |
| POST JSON | 13229 | 11555 | -12.6% | 4.2% | unestablished at this precision |
| HTTP error JSON | 16570 | 14345 | -14% | 5.5% | lower time in every pair, beyond control spread |
| retry 503 | 23629 | 20461 | -14.1% | 7.8% | unestablished at this precision |

GET+JSON is about 11% lower in every pair beyond controls. POST, client creation
and retry changes are unestablished. The error case is lower in every pair but
has a large process range; do not turn its median into an application guarantee.

## Reproduce

Use Bun 1.4.4 or newer and a checkout with commit 552f1a3 available:

```sh
npm --prefix scripts/ky-conformance ci --ignore-scripts --no-audit --no-fund
BENCH_PREVIOUS=1 OUTPUT=packages/vky/bench/previous/bun-isolated.json bun packages/vky/bench/compare.cjs
```

The driver reconstructs and hashes the previous package under the ignored fixture
cache. It does not commit a second runtime copy. Old Bun 1.4.0 timings stay in
repository history with their actual runtime version.
