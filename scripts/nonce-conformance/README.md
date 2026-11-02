# Nonce comparison

Uses the existing [sidecar fixture](../sidecar-conformance/package.json) lockfile:
get-nonce 1.0.1, react-style-singleton 2.2.3 and jsdom 26.1.0. They are comparison
dependencies only. Run `node scripts/nonce-conformance/run.cjs` and repeat on Bun.
Checks precedence, late bundler changes, reset, empty strings, absence, shared
CJS/ESM state, and the unchanged stylesheet caller's nonce/lifecycle behavior.
This does not claim browser CSP enforcement coverage.
