# Stripe Checkout and webhook conformance

`stripe` 23.1.0 is the target; `stripe-app` pins 17.7.0 for the checked application
baseline. The runtime is independently implemented. Synthetic fixtures reproduce
the parameter/result shapes of the application's two SDK calls; no private
application source, credentials or payment data are included.

`run.cjs vpm|upstream|app` tests wire encoding, Checkout response metadata, typed
API errors and raw-body signatures. Upstream controls explicitly select the Node
entry point on both runtimes: Bun otherwise selects the SDK web export with its
async-only default crypto provider. Local HTTP servers are loopback only.
The app-baseline control separately records its old tolerance-zero behavior.
Package regression tests cover strict signatures, invalid UTF-8, future timestamps,
response limits, incomplete body timeouts, redirects, immutable retry bodies/keys,
retry advice, cancellation and malformed input. Original controls demonstrate
upstream acceptance of malformed timestamps and replacement-decoded bytes.

```sh
npm --prefix scripts/stripe-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vstripe/test/*.test.cjs
bun test packages/vstripe/test
node scripts/stripe-conformance/archives.cjs
```

Benchmarks use a shared synthetic Fetch function and response, with an explicit
transport injection appropriate to each API. This measures local request pipeline
CPU cost, not connection establishment or remote response time. Each implementation
runs in isolated balanced processes with identical-source controls.
