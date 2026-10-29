# Authentication benchmark evidence

Comparison: `vgoogle-auth-library` 0.1.0 against `google-auth-library` 11.3.2.

Eight checked-in reports contain three fresh processes and an identical-upstream control on each runtime. Each case uses 150 ms warmup per variant, four warm blocks and 12 alternating paired rounds. Results are retained and checked outside timing. All samples are retained; no trimming. RSA keys are 2048-bit. Network measurements use a local HTTP server, with cached credentials and no cloud service latency.

Times below are pooled median nanoseconds per operation; percentage changes are medians of paired VPM/upstream ratios, so they need not equal the ratio of the displayed pooled medians. Negative changes mean less time. Process ranges and control measurements are available from the summarizer.

## Node 24.22.1

| Case | Upstream ns | VPM ns | Paired change | Control |
| --- | ---: | ---: | ---: | ---: |
| OAuth2 client creation | 1,458 | 1,545 | +5.4% | -0.1% |
| cached self-signed JWT headers | 441 | 489 | +11.1% | +0.8% |
| self-signed JWT for new audiences | 1,063,571 | 704,875 | -33.6% | +0.7% |
| cached OAuth2 request headers | 618 | 618 | -0.2% | -1.2% |
| cached GoogleAuth project lookup | 54 | 54 | -0.7% | +1.2% |
| forced JWT token exchange with stub transport | 1,039,714 | 695,101 | -33.1% | -0.5% |
| RSA ID-token verification | 49,227 | 26,216 | -46.3% | +1.0% |
| authenticated HTTP JSON request | 250,734 | 201,935 | -23.5% | +3.4% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Control |
| --- | ---: | ---: | ---: | ---: |
| OAuth2 client creation | 1,174 | 1,329 | +12.9% | +0.4% |
| cached self-signed JWT headers | 219 | 134 | -22.6% | -3.8% |
| self-signed JWT for new audiences | 831,727 | 724,096 | -13.0% | +0.2% |
| cached OAuth2 request headers | 426 | 420 | +2.0% | +4.5% |
| cached GoogleAuth project lookup | 50 | 51 | -0.8% | +1.8% |
| forced JWT token exchange with stub transport | 843,617 | 722,888 | -14.1% | +1.3% |
| RSA ID-token verification | 23,461 | 18,272 | -22.3% | -1.4% |
| authenticated HTTP JSON request | 97,717 | 95,599 | -4.6% | -0.7% |

## Interpretation

Per-owner native private-key reuse reduces repeated RSA signing costs. Strict ID-token verification is also faster with VPM public-key reuse. Node authenticated HTTP improves in all three processes; the +3.4% identical-upstream HTTP control shows the noise floor is wider for networking than for the crypto cases. Bun HTTP is near parity. Cached project lookup is effectively unchanged.

Small regressions remain: OAuth2 construction costs about 87 ns more on Node and 155 ns more on Bun; Node cached JWT headers cost about 48 ns more. Those headers now check credentials and keep cached values isolated. Bun cached JWT and OAuth2 headers vary from gains to regressions across processes; do not treat their aggregate percentages as stable application improvements. These results do not establish application startup or end-to-end deployment improvements.

## Reproduce

```sh
npm --prefix scripts/google-http-conformance ci --ignore-scripts
OUTPUT=/tmp/auth-node.json node packages/vgoogle-auth-library/bench/compare.cjs
OUTPUT=/tmp/auth-bun.json bun packages/vgoogle-auth-library/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/auth-control.json node packages/vgoogle-auth-library/bench/compare.cjs
node packages/vgoogle-auth-library/bench/summarize.cjs --verify-current
```

Reports record runtime/CPU/platform metadata and hashes of the auth runtime, relevant VPM dependencies, harness and pinned upstream dependency lock. The final command checks all eight reports and their current source hashes.
