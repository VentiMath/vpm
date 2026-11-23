# Handwritten-page rendering

Compare `vresvg` with `@resvg/resvg-js` 2.6.2, using synthetic paper/pen SVGs and
the app's 1200px width / 4800px maximum-height sizing. Each operation constructs
the renderer, draws the page and encodes its PNG. Input generation is outside
timing. Upstream font discovery is explicitly disabled: handwriting uses paths,
so charging native resvg for system font scanning would hide rendering costs.

The shared isolated-process harness runs four balanced AB/BA comparison pairs
and two identical-upstream control pairs. Each process retains twelve samples;
matched pairs use the same iteration count. Node 24 and Bun run separately.
See `results/` for source hashes, raw samples, controls and runtime information.

The native renderer remains faster. These are synthetic rendering measurements,
not an end-to-end production latency claim. Removing native packages is the
current benefit; curved-stroke rasterization remains a performance followup.

```sh
OUTPUT=packages/vresvg/bench/results/node24.json node packages/vresvg/bench/compare.cjs
OUTPUT=packages/vresvg/bench/results/bun.json bun packages/vresvg/bench/compare.cjs
```

| Synthetic page | Node: native → VPM | Bun: native → VPM |
| --- | ---: | ---: |
| raw ruled page | 10.2 → 19.4 ms | 10.2 → 23.5 ms |
| curved ruled page | 11.6 → 87.8 ms | 11.6 → 83.1 ms |
| tall page height cap | 71.2 → 245.0 ms | 71.6 → 255.3 ms |

Recorded on Node 24.22.1 and Bun 1.4.4. Every measured case is slower
than native resvg beyond the identical-source control spread. These timings
include PNG encoding; they do not isolate that cost from scan conversion.

Refreshed for the VLX 0.3.4 shared geometry-accounting fix. Bun's raw-page pair
ratios range from +27% to +239%; its pooled median is not a precise slowdown
estimate. Every pair remains slower than native beyond the control spread.
The fix changes resource accounting, not drawing or encoding algorithms; these
new measurements do not establish a speedup over prior VPM releases.

The app separately reports Node single-call times of 0.52 / 1.59 / 2.35 seconds
for synthetic 1,200 / 4,300 / 8,500-glyph pages, versus native
0.09 / 0.29 / 0.42 seconds. Those include its caller and are not the fixtures or
balanced-process methodology above. Deployment memory/load remains unverified.
