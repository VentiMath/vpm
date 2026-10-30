# vjws

Compact JSON Web Signatures with strict parsing, byte-preserving payloads and
stream collection that copies accumulated data once. Replaces `jws` 4.0.1 using
one dependency, [`vjwa`](../vjwa), instead of `jwa` and `safe-buffer`.
Supports Node.js 24+ and Bun, with CommonJS, native ESM and self-contained types.
Current performance measurements target Node 24 and Bun.

## Signing and verification

```js
const jws = require('vjws');

const token = jws.sign({
  header: { alg: 'HS256', typ: 'JWT', kid: 'application-key' },
  payload: { sub: 'student' },
  secret: 'application-secret'
});

const valid = jws.verify(token, 'HS256', 'application-secret');
const decoded = valid ? jws.decode(token) : null;
```

`sign(options)` returns a compact token. `header.alg` selects HS256/384/512,
RS256/384/512, PS256/384/512 or ES256/384/512. `ALGORITHMS` lists those 12 signed
algorithms and is immutable. Explicit `none` is also supported for unsigned
messages; it provides no authentication.

Signing keys use `secret`, `privateKey` or `key`, in that nullish-precedence
order. Strings, byte views, native KeyObjects, supported CryptoKeys and native
import options pass through to `vjwa`; see its [key contract](../vjwa/README.md).
Empty string and Buffer secrets are preserved. An empty secret is supported for
compatibility, not recommended for authentication.

String payloads use `encoding` (default UTF-8). Buffer, ArrayBuffer, SharedArrayBuffer
and ArrayBufferView payloads preserve exact bytes and view offsets. Other values
use JSON serialization, except numbers retain the upstream string conversion.
Undefined/unserializable payloads throw. Headers are always UTF-8 JSON objects.
Each header is serialized once per call, and the algorithm is selected from that
exact serialized value, including any getters or `toJSON` result.

`verify(token, algorithm, key)` requires an explicit, case-sensitive algorithm
chosen by the caller and matching the header. It returns a boolean for signature
verification. Missing/unsupported algorithms and invalid keys throw; malformed
compact tokens return `false` before key import. The algorithm argument must come
from a trusted policy, not simply be copied from an unverified header.

## Parsing and decoding

`isValid(token)` checks structure only. `decode(token, options?)` returns
`{ header, payload, signature }`, or `null` for malformed structure. Neither API
authenticates the token. Token input may be a string or bytes.

All parsing requires exactly three canonical base64url segments and a valid
UTF-8 JSON object header with an own, nonempty string `alg`. Empty payloads are
valid. Padding, whitespace, alternate alphabets, nonzero unused bits and extra
segments are rejected. Unknown noncritical header members remain available;
duplicate JSON names follow JSON.parse's last-member behavior.

Unencoded payloads (`b64:false`), detached payloads and unknown critical extensions
are unsupported. The only supported `crit` value is `['b64']`, with `b64:true`.
Ordinary decoding may expose an unimplemented algorithm name; verification and
signing still require a supported algorithm.

By default, the decoded payload is UTF-8 text. `options.encoding` selects another
text encoding. `options.json:true` or `header.typ === 'JWT'` requests UTF-8 JSON;
invalid JSON or invalid UTF-8 then throws `SyntaxError`, while signature
verification alone can still succeed for those bytes. Decoding always returns
fresh objects, so changing a decoded result cannot alter later verification.

This package does not validate JWT expiration, issuer, audience or other claims.
Applications need a JWT policy layer in addition to JWS signature verification.

## Streams

```js
const { Readable } = require('node:stream');
const signer = jws.createSign({
  header: { alg: 'HS256' },
  payload: Readable.from(['first ', 'second']),
  secret: 'application-secret',
  maxBuffer: 1024 * 1024
});
signer.on('error', console.error);
signer.on('done', token => console.log(token));
```

`createSign(options)` accepts direct values or streams for payload/key inputs.
An omitted payload or key stays writable through `signer.payload` or `signer.key`;
call `.end()` when finished. `secret`, `privateKey` and `key` reference the same
key input. For `none`, an omitted key is already complete. Explicitly supplied
null/undefined HMAC keys throw; an omitted HMAC key can be filled manually.

`createVerify({ algorithm, signature, secret/publicKey/key, encoding, maxBuffer })`
provides analogous writable `signature` and key inputs. Its `done` event carries
`(valid, decoded)`. Decoded data remains untrusted even when `valid` is false.
JSON decoding errors become stream errors, just as crypto errors do.

Operations are native object-mode Readables: signing emits one token, verification
one boolean. They support piping, cancellation and async iteration. `end` follows
normal Readable consumption semantics. `done` is available without consuming the
Readable. Manual `.sign()`/`.verify()` returns `undefined` until both inputs finish,
then returns the result; it never signs partial input or emits duplicate success.

Native Readables and legacy `jws` Stream inputs are accepted. Source errors and
premature closes propagate, and owned listeners are removed on completion
or cancellation. Source streams are collected directly; public writable inputs
are native Writables created on demand. Caller-owned sources are detached rather than destroyed.
Collected chunks are copied on receipt to prevent later caller mutation, then
concatenated once. `maxBuffer` is an optional nonnegative byte limit **per collected
input**; it does not limit direct values. The default is the runtime's maximum
Buffer length. Exceeding the limit emits `ERR_JWS_INPUT_TOO_LARGE`.

## Compatibility and evidence

Intentional differences from upstream include correct UTF-8 headers, exact binary
payloads, empty inputs, explicit header/algorithm agreement, canonical parsing,
critical-extension validation and standard stream lifecycle behavior. No global
payload or key cache is introduced. Each of the two private header caches holds
at most 16 bounded records: 15 repeated headers and one admission candidate,
with keys limited to 4,096 characters. Large encoded payloads reuse a lazy 64 KiB
scratch buffer, cleared after every validation block. Node uses canonical lengths/tail bits, alphabet-alias checks and
exact decoded byte counts. Bun retains exact encoding round trips because its
Buffer.write decoder treats some invalid ASCII differently. Differential tests
cover every byte value and the decoding block boundaries.

The [focused tests](test/jws.test.cjs) cover all 12 signed algorithms, malformed
tokens, byte offsets, Unicode, input mutation, native keys, errors, cancellation
and legacy stream interoperability. The [upstream runner](test/upstream.test.cjs)
runs all 31 original test cases against each implementation. Its native key
generation, test adapter and one invalid-token input adaptation are documented in
[PROVENANCE.json](PROVENANCE.json); the original source is retained unchanged.
Real `jsonwebtoken` and Google `JWTAccess` consumers are exercised by the
[integration gate](../../scripts/integration.cjs), including callback-based JWT
signing. Installed archive checks cover npm, Bun, CJS, ESM and TypeScript.

The [current benchmark](bench/followup.cjs) compares upstream `jws`+`jwa`,
`vjws` before these optimizations and the current implementation. The
[original comparison](bench/results/README.md) also isolates inherited `vjwa` costs.
See [current results and methodology](bench/results/followup/README.md) and the
[central comparison](../../IMPROVEMENTS.md). These are package measurements, not
application throughput claims.

```sh
node --test packages/vjws/test/*.test.cjs
bun test ./packages/vjws/test
OUTPUT=packages/vjws/bench/results/followup/node-1.json node packages/vjws/bench/followup.cjs
node packages/vjws/bench/summarize-followup.cjs --verify-current
```

MIT. The upstream license and pinned runtime/test provenance are retained.
