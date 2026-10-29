# vgtoken

Google service-account access and ID tokens, using `vgaxios` for HTTP and `vjws`
for RS256 assertions. The API follows gtoken 7.1.0, including promise/callback
methods, token getters, key files, custom transporters and delegated subjects.

```js
const {GoogleToken} = require('vgtoken');
const token = new GoogleToken({
  keyFile: '/run/secrets/service-account.json',
  scope: ['https://www.googleapis.com/auth/cloud-platform'],
  eagerRefreshThresholdMillis: 60_000,
});
const {access_token} = await token.getToken();
```

## Changes

- Concurrent requests share one exchange, including `forceRefresh`. Force bypasses
  a completed cache; it joins an exchange already running for the same configuration.
- Parsed RSA keys are reused within the instance. Replacing `key` imports a new key.
  Changes to issuer, subject, scope, claims, key, key file or transporter invalidate
  the cache. An old request cannot publish results or clear a newer request's state.
- Token expiry must be a nonnegative safe integer number of seconds. Expiry is
  measured from the exchange start. Missing expiry remains uncached; zero expires
  immediately. A response must contain an access token or ID token.
- Token responses are copied and frozen. Only the documented token fields and
  `scope` are retained. Additional claims are copied as JSON and deeply frozen;
  assign a new `additionalClaims` object to change them.
- Errors expose a stable `TokenError.code`, optional HTTP `status`, and a safe
  message. They omit transport configuration, response bodies, causes and remote
  descriptions, which can contain assertions or credentials. Standard OAuth error
  codes such as `invalid_grant` remain available.
- Revocation shares concurrent calls, cancels an outstanding refresh, and holds new
  refreshes until revocation settles. Successful revocation clears token/expiry
  state while retaining configuration. Failed revocation retains the current token.

The exchange uses Google's current `https://oauth2.googleapis.com/token` endpoint
and assertion audience. Assertion expiry must follow issuance by at most one hour,
and the key must be RSA. Additional claims can override standard claims only when
those values remain valid. See [Google's service-account protocol](https://developers.google.com/identity/protocols/oauth2/service-account).
Revocation sends the URL-encoded token in a POST body to
`https://oauth2.googleapis.com/revoke`, following
[Google's revocation examples](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke).

## Limits and cancellation

`timeout` defaults to 30,000 ms and accepts positive integer milliseconds up to
2,147,483,647. It bounds the whole operation, including retry waits. `maxResponseSize`
defaults to 1 MiB. Redirects are disabled for credential-bearing requests.

`getToken({signal})` supports an AbortSignal. Cancelling one waiter leaves other
waiters running; cancelling the last waiter aborts the shared transport. Abort
reasons supplied by callers are not included in errors. The operation settles on
its deadline even if a custom transporter ignores cancellation; synchronous work
cannot be interrupted, and late results are discarded. Custom transporters must
honor the supplied response-size and redirect limits and should honor `signal`.

Credential files must be regular files of at most 1 MiB with valid UTF-8.
`.json` files require `private_key` and `client_email`; `.pem`, `.der` and `.crt`
accept PEM text, matching upstream's text-key convention. Binary DER and PKCS#12
are unsupported. Inline `key` takes precedence over `keyFile`, including a key
previously loaded from that file. Clear `key` to reload a changed file. Raw token
fields remain assignable for compatibility; manually populated cache values are
caller-owned.

## Verification and performance

Focused tests cover verified signatures, forced-refresh races, cancellation,
revocation, invalid expiry and responses, credential files, and HTTP form encoding,
redirect refusal and response limits. The pinned upstream runner executes all 45
tests, with documented expectations for the behavior above. The integration gate
exercises Google auth's actual `JWT.authorize()` and `fetchIdToken()` methods.

```sh
node --test packages/vgtoken/test/*.test.cjs
bun test packages/vgtoken/test/token.test.cjs
node scripts/google-http-conformance/gtoken.cjs
bun scripts/google-http-conformance/gtoken.cjs
node packages/vgtoken/bench/summarize.cjs --verify-current
```

[Benchmark results](bench/results/README.md) retain paired Node 24/Bun measurements,
three fresh processes per runtime, identical-upstream controls and source hashes.
They measure package work and local HTTP, not Google service latency or deployed
application performance.

Node.js 20+ and Bun. CommonJS and native ESM exports. Public declarations require
no ambient Node, Undici or DOM types. MIT license; upstream sources, fixture key
and immutable archive provenance are recorded in [PROVENANCE.json](PROVENANCE.json).
