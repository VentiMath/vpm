# vgcp-metadata

Google Cloud metadata retrieval on the VPM HTTP, logging and exact-JSON stack.
A counterpart to `gcp-metadata` 9.2.3 for Node 24+ and Bun, with CommonJS, native
ESM named imports and TypeScript declarations.

```js
const metadata = require('vgcp-metadata');
const controller = new AbortController();
const project = await metadata.project('project-id');
const token = await metadata.instance({
  property: 'service-accounts/default/token',
  timeout: 3000,
  signal: controller.signal
});
```

## Accessors and data

`instance`, `project` and `universe` accept a property string or an options object
with `property`, `params`, `headers`, `timeout`, `signal` and `maxContentLength`.
Nested paths, trailing slashes and existing query strings are supported; prefer
`params` for query values. Paths reject traversal segments (including encoded
forms), encoded separators, backslashes, control characters and fragments.

`GCE_METADATA_IP` takes precedence over `GCE_METADATA_HOST`; either accepts an
HTTP(S) origin, optionally without the scheme. Credentials, non-root paths,
queries and fragments in host overrides are rejected. Custom headers accept Fetch
`Headers`, tuple lists and plain records, and are copied before requests begin;
`Host` and a conflicting `Metadata-Flavor` cannot override routing. Responses
must contain exactly `Metadata-Flavor: Google`. Proxies and redirects are bypassed.

JSON is decoded through [vjson-bigint](../vjson-bigint), preserving large numeric
IDs as immutable exact values with string conversion. BigNumber arithmetic is
not provided. Plain text and syntactically invalid JSON remain strings, as in
upstream. JSON depth/number bounds still apply; bounds failures reject the request.

## Deadlines and bulk requests

All network operations, including retries, have a finite deadline. `timeout`
accepts integers from 1 to 3,600,000. `requestTimeout()` returns the default:
3,000 ms off Google Cloud and 60,000 ms when residency detection finds Google
Cloud. Upstream disables the timeout there, because the metadata server can
answer slowly under load or at instance start and a short budget would fail token
fetches that succeed upstream; VPM keeps a deadline, sized to Cloud Functions'
default execution timeout. For long polling, choose a deadline longer than the server's
`timeout_sec`. An optional abort signal cancels the operation and is detached
when it settles. Caller abort reasons are not copied into errors.

`maxContentLength` defaults to 16 MiB and permits 1 byte through 64 MiB. Exact-JSON
parsing permits up to 64 MiB of UTF-16 input, with a 512-container depth and
100,000-character numeric limit. The HTTP byte limit applies first.

`bulk(accessors)` accepts at most 1,024 entries and performs up to 16 requests at a
time. Entries use `metadataKey` in place of `property`, plus `noResponseRetries`
and `fastFail`. Every entry is validated and copied before any request starts;
duplicate keys and sparse lists reject. Results use a null prototype. On failure,
new work stops; already active reads settle within their deadlines.

`noResponseRetries` accepts 0..10 and defaults to 3. Zero is honored. As in the
upstream transport, an overall three-retry cap also applies; retryable HTTP
responses use that cap. All retries share the total deadline. Redirect rejection,
body limits and TLS validation errors are not retried; network retries use an
explicit transient-error allowlist.

## Availability and residency

`isAvailable()` shares and caches its result for the current host, detection mode
and retry setting. Changing these settings invalidates reuse;
`resetIsAvailableCache()` forces a new check. A reset does not cancel existing
callers, which retain their bounded result.

Without a host override, availability checks race the default IP and DNS endpoint.
The first **valid success** wins; a fast failure no longer hides a later success.
Losing work is canceled. `bulk` entries can request this behavior with `fastFail`;
an explicit host override always uses only that host.

`METADATA_SERVER_DETECTION` supports `assume-present`, `none`, `bios-only` and
`ping-only`, ignoring surrounding whitespace and capitalization. Unknown values
reject. `DETECT_GCP_RETRIES` accepts decimal integers 0..10; the default is zero
no-response retries. These controls are environment heuristics, not authentication.

Residency helpers and `gcpResidencyCache`, `getGCPResidency` and `setGCPResidency`
retain the upstream interface. BIOS paths are frozen; MAC heuristics require a
complete address and tolerate denied interface inspection. Cloud Run Worker Pools
are recognized alongside services, jobs and Cloud Functions. `setGCPResidency(null)`
redetects. Residency does not disable request deadlines.

## Diagnostics and compatibility

Returned transport errors retain VPM `GaxiosError` identity, `status` and a minimal
`response.status` for Google authentication callers. They omit original request
URLs, headers, response bodies, nested errors and cancellation reasons. Error codes
are limited to known network codes, `ETIMEDOUT`, `ERR_CANCELED`,
`ERR_METADATA_FLAVOR` and `ERR_METADATA_REQUEST`. Debug output and warnings use
static messages. Native-fetch cause chains and Bun socket codes are normalized
with bounded traversal; an unexpected failure in either endpoint is not hidden
by an expected network failure in the other. Logger output uses the current
`gcp-metadata` namespace and DEBUG severity, without metadata values or credentials.

Intentional changes include finite deadlines, no redirects/proxies, validated
options, endpoint-aware caching, first-success races, bounded bulk work and
sanitized errors. Code that inspects original transport error payloads must migrate.

Ordinary metadata requests use native fetch through `vgaxios`; the transport's
Node fallback remains available for configurations that require it. No new runtime
dependency is introduced by this upgrade.

## Verification

Twenty-seven focused tests cover failure races, cancellation, bounds, real local
HTTP, privacy, cache invalidation, modern headers, nested errors and bulk scheduling.
All 77 upstream 9.2.3 tests run from hash-checked sources on Node and Bun, with
explicit adaptations for finite deadlines and private diagnostics. Upstream control
runs use the same fixture corrections and retain original behavioral assertions.

Google Auth 10.6.1 and 11.3.2 Compute access/ID tokens, project lookup, custom
universe lookup, 404 universe fallback and 403/404 token errors are exercised over
local HTTP through the VPM metadata and native-fetch stack. The older Google Auth
9.15.1 integration remains covered. These checks do not establish compatibility
with every Google Auth API or validate a live cloud deployment. Installed archives
and self-contained public declarations are also checked.

See [benchmark evidence](bench/results/README.md), [provenance](PROVENANCE.json),
and [central improvements](../../IMPROVEMENTS.md).

Google's [metadata query documentation](https://cloud.google.com/compute/docs/metadata/querying-metadata)
and [proxy troubleshooting guidance](https://cloud.google.com/compute/docs/troubleshooting/troubleshoot-metadata-server#troubleshoot_failed_requests_while_using_a_network_proxy)
describe the required flavor header, directory/query behavior and direct metadata access.
