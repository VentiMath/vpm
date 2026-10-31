# vfirebase-admin measurements

Recorded October 31, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.0, against firebase-admin 14.5.0 with its own
dependencies. Node 24 was not available on this machine. Three fresh processes
per runtime, 12 alternating paired rounds per case, 150 ms warmup per variant
plus four full warmup blocks. Iterations use a 15 ms upstream pilot target
capped at 100,000. Outputs are retained and validated outside timing. One
additional process per runtime compares identical upstream implementations. No
trimming.

Each variant runs freshly compiled case code with its own measurement loop. The
second process on each runtime sets up VPM first; the others set up upstream
first. Values are pooled median nanoseconds per operation. Changes are medians
of paired sample ratios. Negative means less time. Controls show
identical-upstream drift. Inputs (a 2048-bit RS256 ID token and an FCM message
with Android, APNs and web push sections) are defined in
[the benchmark](../compare.cjs).

## Cold start

`node packages/vfirebase-admin/bench/import.cjs` (and the same with Bun) starts
15 fresh processes per library, alternating. Each initializes an app and Auth,
then Firestore, Messaging and Storage (no network). Medians from the same
machine:

| Runtime | Library | App and Auth | All five services | Modules |
| --- | --- | ---: | ---: | ---: |
| Node 22 | upstream | 132.7 ms | 381.9 ms | 653 |
| Node 22 | VPM | 68.7 ms | 177.6 ms | 335 |
| Bun 1.4.0 | upstream | 147.1 ms | 441.4 ms | 699 |
| Bun 1.4.0 | VPM | 105.4 ms | 230.9 ms | 336 |

Most of the difference is Firestore: upstream's loads a second gax stack and the
static protos when it is imported, and VPM's loads its transport on first
request.

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| auth / verify RS256 ID token signature | 87,284 | 38,769 | -56.3% | -55.7%, -56.8%, -54.9% | +2.5% |
| auth / decode ID token | 6,087 | 4,117 | -32.6% | -32.9%, -32.6%, -32.6% | -0.7% |
| messaging / copy and validate a message | 2,548 | 2,577 | +1.9% | -9.3%, +1.7%, +4.7% | +1.9% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| auth / verify RS256 ID token signature | 46,588 | 30,919 | -32.6% | -31.4%, -35.1%, -31.3% | +3.0% |
| auth / decode ID token | 6,561 | 3,443 | -46.3% | -47.5%, -45.3%, -43.9% | +5.0% |
| messaging / copy and validate a message | 1,507 | 1,555 | +1.5% | +3.0%, -5.1%, +7.8% | -2.0% |

Token verification and decoding run through `vjsonwebtoken` instead of
jsonwebtoken 9.0.3; every process and both runtimes agree, far outside the
controls. These are the signature and decoding steps of `verifyIdToken`, which
also fetches keys (cached) and checks claims. Message validation is Admin's own
code and is at parity.

`node packages/vfirebase-admin/bench/summarize.cjs --verify-current` checks that
all eight reports cover the same cases and that the recorded source hashes match
the current files.
