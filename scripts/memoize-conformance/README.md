# Memoize-one compatibility fixtures

Reference: memoize-one **6.0.0**, source commit
[d5acc534](https://github.com/alexreardon/memoize-one/tree/d5acc5343970ee4b615d4d1d5da85c2436752a79).
Original runtime tests and license are hash-pinned under `upstream`. Their
TypeScript syntax is erased, imports redirected and the 78 unchanged assertions
run under Mocha with the official Jest mock/expect implementations. No skips.

```sh
npm --prefix scripts/memoize-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/memoize-conformance/run.cjs --upstream
node scripts/memoize-conformance/run.cjs
node scripts/memoize-conformance/callers.cjs
node scripts/memoize-conformance/archives.cjs
```

Repeat runtime tests and callers with Bun. The real react-window1.8.11 component
mounts with React19.1, suppresses duplicate visible-range notifications and updates
on resize, against memoize-one5.2.1,6.0.0 and VPM. Focused package tests reproduce
three upstream clear/reentrancy failures, preserve errors and compare 4000 calls.
Benchmarks use separate balanced processes and identical-source controls.
