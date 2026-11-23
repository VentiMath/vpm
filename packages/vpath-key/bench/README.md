# PATH key lookup measurements

Node 24.22.1 and Bun 1.4.4; four balanced isolated process pairs and two
identical-source control pairs. Raw samples and source hashes are retained.
Numbers are nanoseconds per lookup, not whole-build timings.

| Runtime | Case | Upstream | VPM | Evidence |
| --- | --- | ---: | ---: | --- |
| node24 | POSIX | 3 | 3 | unestablished at this precision |
| node24 | Windows short | 69 | 27 | lower time in every pair, beyond control spread |
| node24 | Windows 64 keys | 939 | 163 | lower time in every pair, beyond control spread |
| node24 | Windows duplicate | 48 | 27 | unestablished at this precision |
| bun | POSIX | 3 | 1 | unestablished at this precision |
| bun | Windows short | 65 | 15 | lower time in every pair, beyond control spread |
| bun | Windows 64 keys | 604 | 93 | lower time in every pair, beyond control spread |
| bun | Windows duplicate | 58 | 12 | lower time in every pair, beyond control spread |

Short and 64-key Windows scans improve beyond control noise on both engines.
POSIX timings and the Node duplicate case do not establish a difference. These
are simulated Windows environments on macOS, not native Windows measurements.
