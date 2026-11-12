# Hash and encoding conformance

Control: **CryptoJS 4.2.0**, also the app's pin. The independently written SHA-256/HMAC implementation is checked against native `node:crypto`, browser Web Crypto, FIPS 180-4's SHA-256 definition and RFC 4231's fixed HMAC vectors.

`run.cjs` checks 7,216 comparisons for each of the native-runtime and independent-browser implementations: every byte length from 0 through 1,023, varied key lengths, Unicode, BOM, embedded NUL and a million-character input. Six fixed regressions cover padding boundaries, selected typed-array views/partial words, input isolation, cloning/concatenation, invalid encodings and long keys. Invalid hexadecimal/Base64 inputs intentionally reject instead of retaining upstream's silent byte changes.

`app.cjs` reads the two actual contest version functions from the private app's main revision and executes 402 comparisons without writing or retaining their code. Chrome runs 58 checks with independent Web Crypto plus the contest/mock-token call patterns. The app's mock HMAC mechanism is not represented as production authentication. TypeScript 7 and clean/frozen npm/Bun installs verify root and subpath imports.

```sh
npm --prefix scripts/crypto-js-conformance ci --ignore-scripts
node scripts/crypto-js-conformance/run.cjs
bun scripts/crypto-js-conformance/run.cjs
VPM_CRYPTO_NATIVE=1 node scripts/crypto-js-conformance/run.cjs
VPM_CRYPTO_NATIVE=1 bun scripts/crypto-js-conformance/run.cjs
node --test packages/vcrypto-js/test/hash.test.cjs
bun test packages/vcrypto-js/test/hash.test.cjs
node scripts/crypto-js-conformance/app.cjs
node scripts/crypto-js-conformance/browser.cjs
node scripts/crypto-js-conformance/types.cjs
node scripts/crypto-js-conformance/archives.cjs
```

[Isolated measurements](../../packages/vcrypto-js/bench/results/README.md) retain and validate the consumed result, use separate balanced workers and identical-source controls. These measure synchronous hashing/encoding, not whole-page or authentication throughput.

The Node/Bun benchmark selects `index.native.cjs`, the entry their package conditions resolve. The synchronous browser kernel has correctness checks but no browser timing claim; timings from a JavaScript engine running the fallback would not describe the native package entry.
