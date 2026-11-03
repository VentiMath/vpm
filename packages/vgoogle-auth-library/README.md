# vgoogle-auth-library

Independent implementation of the Google Auth **11.3.2** APIs used by VentiMath's
backend SDKs, for Node 24+ and Bun. Application-default discovery, service-account
JWTs, OAuth refresh credentials, Compute credentials, ID tokens, impersonation,
authenticated requests and Storage signing are implemented without the former
upstream runtime. [Provenance](PROVENANCE.json) records the source references and
scope. This is not a replacement for every provider in the Google Auth SDK.

CommonJS, native ESM named imports and self-contained TypeScript declarations are
included. The package version matches the upstream API baseline.

```js
const {GoogleAuth} = require('vgoogle-auth-library');
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});
const client = await auth.getClient();
const response = await client.request({url: 'https://storage.googleapis.com/storage/v1/b'});
```

`GoogleAuth` accepts service-account or authorized-user JSON, an explicit credential
file, an existing auth client, an API key, or application-default credentials.
ADC checks the environment-selected file, the gcloud configuration directory and
then Compute metadata. Explicit malformed credential files fail without silently
falling back. Project, quota-project and universe settings propagate to SDK callers.

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
  OAuth and ID-token refresh failures clear their pending state so retries work;
  older OAuth refreshes cannot overwrite explicitly replaced credentials.
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
  into their message. Arbitrary custom transport errors can still contain
  sensitive content.
- Compute ID-token audiences are query encoded, preserving embedded `&` and other
  URL characters that the upstream implementation can truncate.
- Authentication retries preserve caller-owned options and headers, retry a
  rejection at most once and never replay consumed Node or Web streams.

`JWTAccess.getCachedKey()` uses an opaque collision-free format; consumers should
not depend on its spelling. String timestamps and padded/standard-Base64 ID tokens
that upstream accepted are intentionally rejected. Credential files remain trusted
configuration: they select keys, accounts and, for impersonation, the token endpoint. Do not load credentials from an untrusted
source.

## Performance

Fresh process-isolated comparisons against 11.3.2 use the same pinned 2,048-bit
RSA fixture in every worker. New-audience signing takes 33.8% less time on Node
and 13.7% on Bun; ID-token verification improves 47.2%/19.2%. Cached JWT headers
still add 39 ns on Node (343 to 382 ns; +12.3% paired) for isolated headers and
credential-aware caching, while Bun improves 44.6%. Local HTTP and cached project
lookup are inconclusive. These are local workload results, not app speed claims.
The [full report](bench/results/README.md) includes all cases, controls and outliers.

## Verified scope

Twenty-eight focused tests pass on Node 24 and Bun. Public-API comparisons run
against both this implementation and Google Auth 11.3.2 using generated fixture
keys and local HTTP/metadata servers. They cover file/environment/stream and
well-known ADC, quota and project handling, token exchange, concurrent refresh,
callbacks, authenticated requests/fetch, identity tokens, impersonation and signing.
Tests explicitly preserve VPM's cache-isolation and encoded-audience corrections.

Caller gates exercise Firebase Admin's real service-account and refresh-token
transport, Storage operations and signing, and Firestore/GAX requests, streams,
transactions and emulator credentials. Fresh npm/Bun archives and TypeScript 7
consumers are checked. No live cloud deployment is claimed.

The retained 545-test upstream suite still runs against **upstream only** as
reference evidence. Many tests assert private classes and internal layout that
this implementation intentionally does not preserve; they are not counted as
replacement conformance. Public caller checks and focused regressions establish
the supported contract.

AWS/workload identity and executable providers, downscoping, GDCH, browser auth,
and interactive OAuth authorization-code/PKCE flows are outside the supported
contract. Unsupported credential-file providers reject explicitly. Only documented
root exports are public; old upstream internal file paths are removed. Older SDKs
need explicit caller checks before being aliased to this package.

See the [upstream test fixture](../../scripts/google-auth-conformance/README.md),
[benchmark evidence](bench/results/README.md), [provenance](PROVENANCE.json), and
[central improvements](../../IMPROVEMENTS.md).
