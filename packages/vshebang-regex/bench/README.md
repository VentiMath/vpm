# First-line shebang matching measurements

Node 24.22.1 and Bun 1.4.4; four balanced isolated process pairs and two
identical-source control pairs. Fixtures are prepared outside the timed loop.
Raw reports retain source hashes, execution order and all samples.

| Runtime | Case | Upstream ns | VPM ns |
| --- | --- | ---: | ---: |
| Node | Short script | 40 | 40 |
| Node | No marker | 14 | 14 |
| Node | 150-byte caller buffer | 46 | 45 |
| Node | 4,096-character first line | 1,996 | 2,007 |
| Bun | Short script | 37 | 36 |
| Bun | No marker | 11 | 11 |
| Bun | 150-byte caller buffer | 32 | 32 |
| Bun | 4,096-character first line | 2,028 | 2,022 |

No case establishes a speed difference beyond process and control variation.
This leaf removes an upstream runtime implementation; it makes no build-speed
claim. Measurements concern regex matching, not file I/O or process execution.
