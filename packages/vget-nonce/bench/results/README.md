# Nonce measurements

Recorded November 2, 2026 on Node 24.22.1 and Bun 1.4.0 against get-nonce 1.0.1.
Four fresh-process comparison pairs and two identical-source controls alternate
AB/BA, with matched iteration counts. Warmup and validation are outside timing;
all samples and final source hashes remain in [Node](node.json) and [Bun](bun.json).

Configuring and reading a nonce measures about 2–3 ns on Node and 1 ns on Bun.
The paired changes (+8% Node, −0.1% Bun) are **inconclusive**: their direction
varies across pairs and does not establish a difference beyond the controls.
There is no demonstrated performance improvement or application speed claim.

Reproduce with `OUTPUT=packages/vget-nonce/bench/results/node.json node
packages/vget-nonce/bench/compare.cjs`, then the corresponding Bun command.
