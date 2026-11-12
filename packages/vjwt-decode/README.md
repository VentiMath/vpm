# vjwt-decode

Independent, dependency-free JWT JSON decoding for browsers, Node 24 and Bun. Targets **jwt-decode 4.0.0** and preserves the default import used by the app's **3.1.2** caller.

```js
import jwtDecode, { InvalidTokenError } from 'vjwt-decode';
const { id } = jwtDecode(token);
// The current upstream-style import is also available:
// import { jwtDecode } from 'vjwt-decode';
```

`jwtDecode(token)` returns the payload; `{ header: true }` selects the header. `InvalidTokenError` distinguishes invalid input, missing segments, base64 and JSON failures. TypeScript generics describe caller-specific claims. Results are parsed afresh, without a mutable result cache.

This API decodes JSON; it does not authenticate a token, validate claims or check expiration. The audited app caller is the mock authentication API, which reads a mock-user ID after its own separate signature check. Production authentication is not being changed.

The implementation selects one segment, uses native base64 decoding and skips UTF-8 conversion for ASCII JSON. Unicode uses `TextDecoder`, avoiding an intermediate percent-escaped string. Like upstream, invalid UTF-8 falls back to Latin-1 JSON; this preserves the existing decoder contract. A byte-order mark is not silently removed. JSON property names such as `__proto__` remain data.

The current error categories are retained; native error suffixes vary by runtime, and the older app version has less-specific wording. Current named ESM/CommonJS imports and the legacy default import are both supported. No upstream runtime is copied.

[Conformance](../../scripts/jwt-decode-conformance/README.md), [isolated measurements](bench/results/README.md) and [provenance](PROVENANCE.json) record the controls and evidence. Built and tested source is separate from a published release or app adoption.
