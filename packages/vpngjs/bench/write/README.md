# Synchronous RGBA fixture writing

The application path is `new PNG({width:4,height:3})`, filling the owned pixels, then `PNG.sync.write`. Separate cases encode an existing fixture, a patterned image and noise. Pixel generation, decoding and equality assertions are outside timing. The Node 24.22.1 and Bun 1.4.4 runs use four balanced process pairs and two identical-source controls; raw samples are retained.

| Case | Node upstream → VPM (µs) | Bun upstream → VPM (µs) |
| --- | ---: | ---: |
| write fixture 4x3 | 11.6 → 7.0 | 10.0 → 21.4 |
| write patterned RGBA 256x128 | 2385.8 → 407.9 | 2852.4 → 290.4 |
| write noise RGBA 64x64 | 522.0 → 115.4 | 528.3 → 87.7 |
| construct/fill/write fixture 4x3 | 37.7 → 8.6 | 97.0 → 6.1 |

**These are noisy host observations, not a promised speedup.** The identical-source control spread is unusually large (up to 1,886% on one small Node case). The larger encodes took less time in every comparison pair, but these samples do not establish stable application latency. The small-fixture cases especially need a quiet-host measurement before making a performance claim. No sample trimming or app-throughput extrapolation is used.

| Input | Upstream bytes | VPM bytes |
| --- | ---: | ---: |
| fixture 4x3 | 78 | 78 |
| patterned RGBA 256x128 | 1371 | 3023 |
| noise RGBA 64x64 | 16521 | 16521 |

Both encoders preserve the exact RGBA pixels. The app fixture is 78 bytes in both implementations. The fixed Sub/Up writer does less filter selection work, but the patterned file is 2.2× larger than upstream’s adaptive result. This is a documented size tradeoff for the bounded fixture-writer scope. The existing VLX/vresvg PNG encoder is unchanged.

Run `node packages/vpngjs/bench/write.cjs` or the same path with Bun, with `OUTPUT` set to retain a report. The complete construct/fill/write path is the application comparison; a constructor-only pilot was stopped after upstream allocation overwhelmed the calibrated batch and exceeded the worker timeout. No result from that pilot is included.

[Node samples](node24.json) · [Bun samples](bun.json)
