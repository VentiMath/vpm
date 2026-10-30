# Storage client measurements

Storage 8.4.0 versus `vgoogle-cloud-storage`, on Node **24.22.1** and Bun
**1.4.0**, Apple M1 Pro, macOS arm64. Negative changes mean less time per
operation. These are local CPU/localhost measurements, not cloud latency or
application throughput claims.

Each runtime has three fresh processes and one identical-upstream control.
Each case has 150 ms warmup per variant, four full warmup blocks and 12
alternating paired rounds. The pilot targets 15 ms per block, capped at 100,000
operations. Results are retained; assertions run outside timing. There is no
sample trimming. JSON files retain every sample, runtime details and source
hashes for this client, its VPM dependency graph, fixture lock and harness.

Signed URLs use actual RSA-2048 signatures with an ephemeral key generated
outside timing. HTTP cases use real SDK requests against localhost, with
CRC32C validation on 64 KiB uploads/downloads. Upload body assertions and
response construction run in the same local server for both variants. No real
credentials or live cloud services are used. Client construction is warm module
construction, not process startup.

Upstream's short-lived download pipelines exceed the default ten EventEmitter
listeners. The benchmark sets the threshold to 32 **for both variants** to keep
warning output out of timings. Runtime code and correctness tests retain the
default. This does not change stream cleanup or suppress request errors.

| Case | Node upstream → VPM, µs | Paired change | Bun upstream → VPM, µs | Paired change |
| --- | ---: | ---: | ---: | ---: |
| Storage construction | 0.947 → 0.846 | −9.5% | 1.072 → 0.892 | −17.5% |
| Bucket + file handles | 16.983 → 16.947 | −2.4% | 18.629 → 17.578 | −5.2% |
| V2 URL, RSA-2048 | 875.168 → 879.058 | +0.5% | 706.657 → 701.480 | +1.0% |
| V4 URL, RSA-2048 | 893.695 → 894.155 | −0.1% | 730.574 → 725.710 | +0.4% |
| CRC32C, 64 KiB | 337.928 → 335.327 | −0.4% | 570.507 → 571.939 | −0.6% |
| HTTP object metadata | 202.885 → 157.001 | −22.6% | 94.706 → 105.225 | +9.4% |
| HTTP listing, one page | 188.442 → 151.302 | −16.5% | 120.080 → 138.854 | +14.9% |
| HTTP multipart upload, 64 KiB | 903.974 → 827.729 | −7.4% | 1220.306 → 1253.076 | +3.4% |
| HTTP download, 64 KiB | 341.314 → 276.864 | −18.6% | 197.485 → 230.452 | +9.5% |

Times are medians of 36 samples; changes are medians of paired ratios, so the
percentage need not equal the ratio of the two pooled time medians.

## Variation and limits

Node metadata, listing, upload and download improve in all three processes.
Their per-process changes are respectively −22% to −23%, −16% to −20%, −7% to
−8%, and −15% to −21%. Identical-upstream controls are +15.3%, +1.0%, −8.7%
and +3.4%. The metadata control is noisy, and the upload difference is smaller
than its control offset; the exact percentages should not be treated as precise
speedup estimates. Listing and download have clearer improvements.

All four Bun HTTP cases are **slower in every process**. Metadata changes range
from +0.1% to +17%, listing from +6% to +33%, upload from +2% to +13%, and
download from +8% to +14%. Their controls are +1.8%, −7.7%, +12.8% and +11.4%.
Upload/download differences are smaller than the corresponding control offsets;
metadata/listing still show an unfavorable trend. These measurements do not
support an across-the-board Bun HTTP improvement.

Construction improves across processes, but Bun's magnitude varies from 10% to
24%. Handle creation is variable on Bun and close to control noise on Node.
RSA signing and CRC32C are broadly unchanged: pooled paired differences are
about 1% or less, with some process outliers. Signing corrections remain enabled
in every VPM measurement.

## Reproduce

From the repository root, install the Storage comparison fixture, then run
`node packages/vgoogle-cloud-storage/bench/compare.cjs` or the same command with
`bun`. Set `OUTPUT` to retain a report and `CALIBRATION=1` for an upstream/upstream
control. Run benchmarks sequentially without concurrent test suites.

```sh
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vgoogle-cloud-storage'))" -- --verify-current
```
