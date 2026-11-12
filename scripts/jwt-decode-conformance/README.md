# JWT decoding conformance

Controls: current **jwt-decode 4.0.0**, app **3.1.2**. No upstream implementation is copied into the runtime.

`run.cjs` compares 16,248 results across generated mock-user payloads, Unicode, headers, padding, scalar JSON, malformed bytes and input errors. Current error categories match; older error wording is intentionally excluded while its acceptance/rejection and error class are still asserted. Seven fixed regressions cover exports, signature-independent decoding, Unicode/percent text, Latin-1 compatibility, error categories, BOM handling, fresh results and prototype-looking JSON keys.

The browser fixture runs the same current/app decoding contract with native `atob` and `TextDecoder`, including the app's mock-user ID destructuring. The only app caller is `src/@mock-utils/api/authApi.ts` at the revision recorded in provenance. This is not a production-authentication replacement.

```sh
npm --prefix scripts/jwt-decode-conformance ci --ignore-scripts
node --test packages/vjwt-decode/test/decode.test.cjs
bun test packages/vjwt-decode/test/decode.test.cjs
node scripts/jwt-decode-conformance/run.cjs
bun scripts/jwt-decode-conformance/run.cjs
node scripts/jwt-decode-conformance/types.cjs
node scripts/jwt-decode-conformance/browser.cjs
node scripts/jwt-decode-conformance/archives.cjs
```

TypeScript 7 checks current named and app-default imports in CJS/ESM and bundler modes. Exact archives install cleanly and with frozen locks through npm and Bun, then run on Node and Bun. Benchmarks use separate processes, four balanced pairs and two identical-source controls; see the [report](../../packages/vjwt-decode/bench/results/README.md).
