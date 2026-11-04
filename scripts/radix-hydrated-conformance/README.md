# Hydration hook controls

Pins use-is-hydrated 0.1.3 and its unchanged Roving Focus 1.2.1 caller.

```sh
npm --prefix scripts/radix-hydrated-conformance ci --ignore-scripts
npm --prefix scripts/radix-hydrated-conformance/current ci --ignore-scripts
bun scripts/radix-hydrated-conformance/build.cjs
node --test packages/vradix-react-use-is-hydrated/test/*.test.cjs
bun test packages/vradix-react-use-is-hydrated/test
node scripts/radix-hydrated-conformance/archives.cjs
```

Nine groups per runtime compare upstream/VPM on React 19.1.0/19.2.4 in separate
client/server processes and verify pinned upstream hashes. SSR returns false,
client-only mounts return true, and separate hydrating roots independently
transition false to true without replacing nodes. SSR remains false even after
a client mount. StrictMode and Roving Focus's hydrated focusable-item count pass.

Clean npm/Bun fresh/frozen archives test CJS/ESM, SSR, TypeScript 7 and native
Chrome. Chrome focus emulation explicitly makes the headless page an active
page: without it, programmatic focus changes activeElement but may not dispatch
the focus events needed by the upstream caller. Both variants use the same setup.
Tests reject recoverable hydration errors and verify keyboard entry after the
caller's passive mount effects. Generated source/test bundles have freshness
hashes; benchmark processes are isolated and balanced with identical-code controls.
