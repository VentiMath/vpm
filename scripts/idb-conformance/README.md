# IndexedDB conformance

Pinned idb 8.0.4 and app 7.1.1 are black-box controls. Their runtime source is not
read or copied. Version 7's async-iterator entry is used only for those comparisons.

Run `npm ci --ignore-scripts` in this directory, then from the repository root:

```sh
node --test packages/vidb/test/*.test.cjs
bun test packages/vidb/test
node scripts/idb-conformance/types.cjs
node scripts/idb-conformance/browser.cjs
node scripts/idb-conformance/archives.cjs
```

The browser page runs unchanged Firebase app/installations against synthetic
IndexedDB databases. Its only registration response is mocked; unexpected network
URLs throw. Native and emulated backend comparisons preserve the explicit
transaction-outcome differences documented in the package README. No app source,
user records, credentials or deployment settings are changed.
