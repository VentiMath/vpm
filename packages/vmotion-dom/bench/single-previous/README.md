# Bun setup before and after

The control is VPM commit `77440fc668f2d4a26ba93d1a7c634754a977e874`, reconstructed from Git by `scripts/motion-dom-conformance/setup-baseline.cjs`. No duplicate runtime is committed. Four balanced fresh-process comparison pairs and two identical-source control pairs retain all samples. These are JavaScript microbenchmarks, not application frame rates.

[Recording, controls and source hashes](bun-isolated.json).

| Case | Before ns | After ns | Paired change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| create and stop a scalar animation | 521 | 389 | -26.3% | 2.9% | lower time in every pair, beyond control spread |
| reset, replace and stop a MotionValue animation | 515 | 384 | -24.8% | 1.1% | lower time in every pair, beyond control spread |
| deliver repeating single-value updates | 32 | 36 | 6.8% | 10% | unestablished at this precision |

Reproduce from the repository root with `VMOTION_DOM_SETUP_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/single-previous/bun-isolated.json bun packages/vmotion-dom/bench/single.cjs`.
