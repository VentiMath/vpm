# vky

An independently written HTTP client built on native `fetch`. The root entry
implements the Ky 2.2.0 request APIs used by VentiMath; `vky/legacy` preserves the
existing application's Ky 1.8.1 calling conventions during migration. Both use
one request pipeline, with no runtime dependencies or copied Ky runtime.

```js
import ky, {isHTTPError} from 'vky';

const api = ky.create({baseUrl: 'https://example.test/api/'});
const problems = await api.get('problems', {searchParams: {paper: 'sample'}}).json();
try {
  await api.post('signups', {json: {name: 'Ada'}});
} catch (error) {
  if (isHTTPError(error)) console.log(error.response.status, error.data);
}
```

The root entry uses `prefix`/`baseUrl`, state-object hook arguments and populated
`HTTPError.data`. As in Ky 2, reading error data consumes the response body.
The legacy entry uses `prefixUrl`, positional request/response hooks and leaves
`HTTPError.response` readable. It also keeps the older empty-JSON result (`''`);
the root rejects empty JSON. Error classes have shared identity across entries.

```js
import ky, {HTTPError} from 'vky/legacy';

const api = ky.create({
  prefixUrl: 'https://example.test/api',
  hooks: {beforeRequest: [(request) => request.headers.set('X-Client', 'example')]},
});
try {
  await api.get('scoresheets/sign').json();
} catch (error) {
  if (error instanceof HTTPError) console.log(await error.response.json());
}
```

## Verified scope

String, URL and Request inputs; GET/POST/PUT/PATCH/DELETE/HEAD and current QUERY;
headers, search parameters, native Fetch options, JSON/form/binary/stream bodies;
`create`/`extend`; JSON/text/bytes/ArrayBuffer/Blob/FormData shortcuts; custom fetch
and JSON conversion; init, before-request, before-retry, after-response and
before-error hooks; conditional HTTP errors; retry policy, delay, server backoff,
jitter and timeout retry; caller cancellation, per-attempt/body timeouts, a total
deadline and actual-byte response-size limits. Native Fetch owns networking,
credentials, redirect policy and browser CORS enforcement.

Modern query layers append values, while `undefined` removes that parameter.
Legacy query options replace the input query. Modern before-request hooks run
once; legacy hooks run before each attempt. A modern returned Request continues
the hook chain; the legacy entry stops it, preserving mock-worker preparation.
Before-retry hooks may return a Request, Response, `ky.stop`, or replacement
`timeout`, `fetch` and `throwHttpErrors` options. Other replacement keys reject.

VentiMath's shared API clients, catalog requests, signup validation, signed
scoresheet error parsing and raw-status callers informed this scope. No app
cutover is included. Use the legacy entry for unchanged app callers; moving them
to the root requires an explicit URL/hook/error-handling migration.

## Boundaries and differences

This is not a claim of complete Ky API parity. Upload/download progress,
Standard Schema JSON validation, `ky.retry`/ForceRetryError and all possible
third-party extensions are outside the verified scope. Progress options and
schema arguments reject; unavailable exports are not advertised. Error message
wording and undocumented normalized-option details can differ. Browser checks
currently cover Chrome, not Safari/Firefox.

Configuration such as retry counts, timer durations, hooks and size limits is
validated before transport. Cancellation is checked before hooks and races
custom transports that ignore their signal. Shortcut body reads cancel their
reader on timeout/abort; body failures never replay a completed mutation. Finite
size limits count actual streamed bytes, independent of `Content-Length`.
These are verified properties, not claims that every upstream version lacks them.

Node 24, Bun and browsers providing native Fetch, Web Streams and
`AbortSignal.any` are supported targets. There is no React dependency.

## Evidence

[Provenance](PROVENANCE.json), [conformance checks](../../scripts/ky-conformance/README.md)
and [controlled measurements](bench/results/README.md) describe exact coverage.
Benchmarks measure client overhead with a deterministic Fetch fixture, not server
latency. A smaller dependency-free implementation does not by itself establish an
application speedup; upstream Ky also has no runtime dependencies.

The recorded Node run uses about 30% less time for GET+JSON and 57% less for
client creation. Node POST/error differences are unestablished. On Bun, client
creation uses 59% less time, but GET/POST JSON remain slower: about 39/51 µs versus
16/18 µs upstream. Reading streams with explicit cancellation ownership is a
known cost here; the package is not uniformly faster. Zero-delay retries avoid a
timer turn, so their large improvement must not be extrapolated to real server
backoff or network latency. All process samples and control spreads are retained.
