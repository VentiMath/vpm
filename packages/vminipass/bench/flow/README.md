# Flowing-write dispatch follow-up

The initial Bun result was about 20% slower than Minipass 7.1.3. Profiling the
implementation at 822ffba8 found 1,084 self samples in our generic `emit`
forwarder and 3,292 in native EventEmitter dispatch. Buffer operations barely
appeared. Every flowing chunk paid for rest arguments and spread forwarding.

The single-payload data path now calls EventEmitter directly with two arguments.
Other events preserve arbitrary argument counts, and writes still call the
public `emit` method, including subclass overrides. No listener internals,
destroy checks, pipe handling or lifecycle rules are bypassed.

The same fresh-process benchmark runs four balanced AB/BA pairs and
identical-source controls. Negative changes mean less time than upstream:

| Case | Node paired change | Bun paired change |
| --- | ---: | ---: |
| object queue 1000 | -63.1% | -72.5% |
| flowing object writes 1000 | -26.1% | -40.7% |
| buffer concat 128 chunks | -42.6% | -45.1% |
| UTF8 decoder 64 chunks | -22.2% | -13.0% |
| object collect 100 | -51.0% | -53.5% |
| object async iterator 100 | -32.5% | -12.8% |

Bun flowing-write medians are 13,898 ns upstream and 8,245 ns VPM per 1,000
writes. Every Bun pair was lower beyond the identical-source control spread.
This resolves the measured regression; it is not a whole-build speed claim.
Node was noisy: only object collection clears control spread, so the other
Node directions remain unestablished despite lower observed medians.

Twelve focused tests cover listener mutation, once listeners, subclass dispatch,
extra event arguments and destruction during a piped write. The 50,000-operation
differential contract, 30 unchanged upstream files (308 TAP assertions), 83 real
caller checks and packed npm/Bun installs also pass.

[Node raw samples](node.json) · [Bun raw samples](bun.json). Both include source
hashes, process order, calibration and controls. Reproduce with `OUTPUT` set to
a new file and `node` or `bun packages/vminipass/bench/compare.cjs`.
