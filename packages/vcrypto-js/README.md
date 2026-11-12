# vcrypto-js

Independent **CryptoJS 4.2.0 application contract**: synchronous SHA-256, HMAC-SHA256, and UTF-8/Base64/Hex encoders. No runtime dependencies.

```js
import SHA256 from 'vcrypto-js/sha256';
const version = SHA256(JSON.stringify(problemIds)).toString();
```

VentiMath's contest attempt adapters use SHA-256 to name long paper versions synchronously. Its mock authentication API uses HMAC-SHA256 and the encoders. The existing call sites and saved identifiers retain their byte-for-byte output. This package does not implement CryptoJS's other hashes, encryption, cipher modes, password derivation, streaming builders or inheritance framework.

Node and Bun package exports use native `node:crypto`. Browser exports use the independent FIPS 180-4 SHA-256 implementation and standard HMAC inner/outer-pad construction. Fixed vectors, CryptoJS controls, native Node crypto and browser Web Crypto verify results. The synchronous browser contract requires a synchronous implementation; native Web Crypto is asynchronous. No claim of certification or a new production-authentication mechanism is made.

Strings reject malformed UTF-16 rather than replacing it. UTF-8 decoding is fatal and preserves BOM characters. Native Base64 validation and strict even-length hexadecimal parsing reject invalid encodings that upstream may silently interpret as different bytes. Byte arrays and valid partial `WordArray` inputs are supported. Hashing/signing never mutate caller buffers; `clone`, `concat` and `clamp` provide the declared small WordArray surface. Typed-array views respect their selected bytes.

[Conformance](../../scripts/crypto-js-conformance/README.md) includes the unchanged contest version functions read-only, standard and generated vectors, Chrome, declarations and clean packed installs. [Measurements](bench/results/README.md) cover consumed digest/encoding results. [Provenance](PROVENANCE.json) records the independent standard-based implementation. Source completion is separate from release/adoption.
