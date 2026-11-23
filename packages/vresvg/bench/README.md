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
| raw ruled page | 10.5 → 20.6 ms | 10.6 → 23.8 ms |
| curved ruled page | 12.1 → 91.6 ms | 12.1 → 177.5 ms |
| tall page height cap | 75.3 → 257.6 ms | 75.6 → 248.7 ms |

Recorded on Node 24.22.1 and Bun 1.4.4. Every measured case is slower
than native resvg beyond the identical-source control spread. These timings
include PNG encoding; they do not isolate that cost from scan conversion.
