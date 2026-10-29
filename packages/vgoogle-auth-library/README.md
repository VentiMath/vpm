# vgoogle-auth-library

Google authentication clients on the VPM HTTP, metadata, logging and signing
stack. Based on `google-auth-library` **11.3.2**, for Node 22+ and Bun; tested on
Node 24 and Bun 1.4. CommonJS, native ESM named imports and self-contained
TypeScript declarations are included.

```js
const {GoogleAuth} = require('vgoogle-auth-library');
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});
const client = await auth.getClient();
const response = await client.request({url: 'https://storage.googleapis.com/storage/v1/b'});
```

Application-default credential discovery, service-account JWTs, OAuth refresh
credentials, Compute metadata credentials, ID tokens, impersonation and local
Cloud Storage signing retain the current upstream client structure. Explicit
service-account credentials can use `new GoogleAuth({authClient: new JWT({...})})`.
`getRequestHeaders()` returns Fetch `Headers`, as in upstream 11; callers expecting
version 9's plain header objects need an upgrade. `request()` returns a Gaxios
response; `fetch()` exposes the current Fetch-style interface.

## Dependencies and transport

The four runtime dependencies are [vgaxios](../vgaxios),
[vgcp-metadata](../vgcp-metadata), [vgoogle-logging-utils](../vgoogle-logging-utils)
and [vjws](../vjws). Their runtime dependency trees are also VPM packages.
Native Buffer Base64 conversion and VPM algorithm-aware signature verification
remove the `base64-js` and `ecdsa-sig-formatter` dependencies.

Ordinary HTTP requests use native fetch through `vgaxios`. Node agents, proxies,
client certificates and `compress: false` use its `vnode-fetch` transport. The
authentication API does not require a separate node-fetch 3 implementation.
Metadata requests inherit `vgcp-metadata`'s finite deadlines, direct routing and
private diagnostics. Other HTTP behavior follows the documented `vgaxios` options.

## Correctness and privacy changes

- Self-signed JWT caches distinguish URL/scope boundaries and serialized additional
  claims. Reserved claims reject even when falsy or when an entry is cached.
  Changing the email, private key or key ID invalidates old entries. Returned
  headers never expose cached containers. The cache holds at most 500 entries.
- Immutable private PEM keys are parsed once per credential owner and replaced
  when the key changes. There is no global private-key cache. Mutable byte keys
  bypass token/key reuse.
- Internal `GoogleToken` exchanges share one in-flight request, including forced
  refreshes and key-file loading. Missing tokens and invalid expiration values
  reject before caching. Key files supply the assertion issuer before signing.
- `GoogleToken.revokeToken()` returns a settling promise, sends the token in a
  POST form body, and clears the cache after successful revocation. A failed
  revocation or a concurrently obtained newer token is preserved.
- ID-token verification requires canonical compact JWS, RS256 or ES256 with a
  matching key family, an own certificate entry, finite numeric `iat`/`exp`, and
  an increasing token lifetime. Audience, issuer, five-minute clock skew and the
  default one-day maximum future expiry retain upstream semantics. Tokens over
  1 MiB and nonpositive/nonfinite maximum expiry settings reject.
- ID-token verification errors omit tokens, decoded claims and certificate data.
  Default request/response debug interceptors emit static lifecycle messages,
  without URLs, headers, method labels or token-response bodies. The internal
  token exchange preserves transport errors instead of copying response text
  into their message. This is not a guarantee that arbitrary custom transport
  errors or every upstream-derived provider error omit sensitive content.

`JWTAccess.getCachedKey()` uses an opaque collision-free format; consumers should
not depend on its spelling. String timestamps and padded/standard-Base64 ID tokens
that upstream accepted are intentionally rejected. Upstream credential-selection
rules, configuration warnings and externally supplied credential-file trust
requirements remain in place.

## Verified scope

All 545 selected upstream tests pass on Node 24 and Bun, with upstream controls.
Seventeen focused VPM tests pass on both runtimes. The checked upstream suites cover GoogleAuth discovery, JWT/JWTAccess, OAuth2,
refresh clients, Compute, IAM, ID-token clients, impersonation, crypto, login
tickets, pass-through clients, utilities and internal GoogleToken helpers. Focused
regression tests also exercise concurrent refreshes, rotated credentials, isolated
headers, malformed tokens, log privacy, revocation and real local HTTP requests.
Cloud Storage-style signing, project lookup and authenticated headers are included
in the version-scoped integration gate.

Other upstream-derived providers and exports remain available, including workload
identity, AWS, downscoping and executable credential providers. Their dedicated
provider suites and live cloud deployments are **not** covered by this package's
current verification claim. Browser bundling is not a supported target. The older
Google Auth 9/10 packages are not aliased to this replacement.

See the [upstream test fixture](../../scripts/google-auth-conformance/README.md),
[benchmark evidence](bench/results/README.md), [provenance](PROVENANCE.json), and
[central improvements](../../IMPROVEMENTS.md).
