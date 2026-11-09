# Bun setup before and after

The control is VPM commit `77440fc668f2d4a26ba93d1a7c634754a977e874`, reconstructed from Git by `scripts/motion-dom-conformance/setup-baseline.cjs`. No duplicate runtime is committed. Four balanced fresh-process comparison pairs and two identical-source control pairs retain all samples. These are JavaScript microbenchmarks, not application frame rates.

[Recording, controls and source hashes](bun-isolated.json).

| Case | Before ns | After ns | Paired change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 30 | 30 | 2.9% | 1.5% | unestablished at this precision |
| read changing transform matrices | 291 | 286 | -1.6% | 18.2% | unestablished at this precision |
| read computed opacity | 9 | 9 | 2.3% | 2.1% | unestablished at this precision |
| resolve current numeric keyframe and wildcards | 61 | 60 | -2.3% | 5.4% | unestablished at this precision |
| resolve DOM start and CSS variable endpoint | 813 | 689 | -23.1% | 3.6% | unestablished at this precision |

Reproduce from the repository root with `VMOTION_DOM_SETUP_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/reads-previous/bun-isolated.json bun packages/vmotion-dom/bench/reads.cjs`.
