# Motion consumer-release SSR check

Node 24.22.1 and Bun 1.4.4, React 19.3.1. Six prepared 12-element trees are
measured in fresh isolated processes with balanced AB/BA pairs and identical-source
controls. These are server render timings, not browser frame-rate measurements.

| Case | Node time change | Bun time change |
| --- | ---: | ---: |
| Motion14 fade SSR | -23.8% | -31.4% |
| Motion14 variants SSR | -25.1% | -24.8% (unestablished) |
| Motion14 initial-false SSR | -26.9% | -36.6% |
| App12 fade SSR | -24.6% | -27% (unestablished) |
| App12 variants SSR | -27.2% | -28.6% (unestablished) |
| App12 initial-false SSR | -28.2% | -34.3% |

All Node pairs are lower; control spread is larger for the app-12 comparisons.
Bun variants against Motion 14 and app-12 fade/variants have inconsistent process
directions, so their medians do not establish an improvement. The other Bun
cases are lower in every pair beyond control spread. No runtime optimization
was made for this release. Raw samples and source/bundle hashes:
[Node](release-node.json), [Bun](release-bun.json).
