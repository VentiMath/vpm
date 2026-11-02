# vget-nonce

An independently written replacement for **get-nonce 1.0.1**, the nonce accessor
used by react-style-singleton underneath react-remove-scroll. No dependencies.

```js
import {setNonce, getNonce} from 'vget-nonce';
setNonce('server-provided-value');
getNonce(); // 'server-provided-value'
setNonce(undefined); // restore bundler fallback
```

The nonempty configured value takes precedence over `__webpack_nonce__`.
An empty string falls back, matching upstream. Without either source, the result
is undefined. The lexical webpack identifier is preserved for bundler rewriting.
CommonJS and ESM imports share state; the declaration also permits an explicit
reset, which upstream's runtime accepts but its declaration omits.

This module does not generate nonces, configure CSP, or provide per-request
storage. Set the browser application's nonce before injecting styles. Do not use
a shared module variable to store concurrent server requests' nonce values.

Node 24, Bun, browser bundle, original/VPM behavior and the actual
react-style-singleton stylesheet caller are checked by the
[fixture](../../scripts/nonce-conformance/README.md).
[Measurements](bench/results/README.md) concern this tiny accessor only.
Built but not released or adopted in VentiMath.
[Provenance](PROVENANCE.json) records the comparison target.
