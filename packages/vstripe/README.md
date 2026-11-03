# vstripe

Independent implementation of the Stripe APIs VentiMath uses: Checkout session
creation and signed snapshot webhook events. Targets **stripe 23.1.0**, with
comparison controls against the app's **17.7.0**. Node 24 and Bun; no runtime
package dependencies. Current upstream 23.1.0 also has no runtime dependencies;
that reduction is relative to the app's 17.7.0, not a gain over current upstream.
Built, unreleased and not yet adopted.

```js
import Stripe from 'vstripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{price: 'price_example', quantity: 1}],
  success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://example.com/cancel',
}, {idempotencyKey: 'your-stable-order-id'});
const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
```

## Supported contract

`checkout.sessions.create(params, requestOptions?)` recursively form-encodes
plain data, including inline prices, product descriptions, arrays, metadata and
redirect URLs. It returns the parsed session with non-enumerable `lastResponse`
(request ID, headers, status and idempotency key). Error classes under
`Stripe.errors` distinguish authentication, permission, invalid request, card,
rate limit, idempotency, connection and other API failures.

The default API version is **2026-10-28.endive**, matching stripe 23.1.0. The app
currently uses 17.7.0: consumption must review its API-version migration or set
`apiVersion` explicitly. This implementation does not change the app's deployed
SDK or webhook endpoint API version. Signed event contents are the bytes Stripe
sent, not upgraded response objects.

Constructor options: `apiVersion`, `timeout` (80,000 ms per attempt),
`maxNetworkRetries` (2), `stripeAccount`, `host`, `port`, `protocol`. VPM extensions:
`fetch` for an injected native-compatible transport and `maxResponseBytes`
(default 8 MiB). HTTP is allowed only for loopback tests. Request options:
`apiVersion`, `timeout`, `maxNetworkRetries`, `stripeAccount`, `idempotencyKey`
and VPM's `signal` cancellation extension. Unknown options fail explicitly.

Each POST gets a cryptographically random idempotency key unless supplied; its
key and encoded body remain unchanged across retries. Network failures, HTTP 409
and 5xx are retried; `stripe-should-retry` overrides HTTP retry decisions. Backoff
starts at 500 ms, with bounded exponential jitter and numeric Retry-After up to
60 seconds. `maxNetworkRetries: 0` really disables retries. Use a caller-supplied
key for deduplication across separate application invocations.

`webhooks.constructEvent` and its async companion verify HMAC-SHA256 with
constant-time digest comparisons before parsing JSON. Inputs are raw strings or
Uint8Array/Buffer bytes. Rotating secrets' multiple `v1` signatures are supported.
The optional tolerance defaults to 300 seconds; zero explicitly disables the
clock check (current 23.1 behavior; 17.7 substitutes the default). Optional
`receivedAt` is milliseconds since epoch, as upstream. The `signature` helpers
and test-header generation have sync/async variants. Custom crypto providers and
thin event notifications are outside scope. Verification authenticates data;
it does not schema-validate it or provide payment fulfillment/deduplication.

## Deliberate validation differences

- Signature verification uses the original bytes, rejecting invalid UTF-8 rather
  than authenticating replacement characters. Duplicate/malformed timestamps,
  nonfinite/negative tolerance, and timestamps more than tolerance into the future
  are rejected. The latter adds a symmetric clock window to upstream's age check.
- Request data must be plain, acyclic data with finite numbers and unambiguous
  bracket-free field names. Only own properties are encoded. The limits are
  32 levels, 20,000 visited values and 1 MiB encoded data.
- Timeouts must be positive integers; retry counts range from 0 to 10. Response
  buffering is bounded, the timeout covers the body read, and redirects are never
  followed with the API credential. Error messages omit raw webhook bodies.

This is not the full Stripe SDK: no other resource endpoints, thin-event APIs,
callback-style requests, proxy/agent options, custom crypto, telemetry/event
emitters or generated SDK-wide type catalog. Unsupported options throw.

[Conformance](../../scripts/stripe-conformance/README.md) uses synthetic data and
loopback servers for exact app-shaped requests, API errors and verification
against both upstream versions. Packed npm/Bun consumers and TypeScript 7 are
checked. [Benchmarks](bench/results/README.md) compare constructor cost, signed
webhooks and a synthetic Fetch request pipeline; they do not measure Stripe's
network or production payment latency. [Provenance](PROVENANCE.json) records scope
and inspected upstream hashes.

References: [Checkout creation](https://docs.stripe.com/api/checkout/sessions/create)
and [signed webhooks](https://docs.stripe.com/webhooks?lang=node).
