# vpaginator

Automatic API pagination and object streams for Google Cloud listing methods.
Targets **@google-cloud/paginator 7.2.0** on **Node 24+ and Bun**, with one
runtime dependency: `vextend`. Current Storage **8.4.0** bucket, file and HMAC-key
listing methods are tested with the replacement.

```js
const {paginator} = require('vpaginator');
class Catalog {
  list(query, callback) {
    // Fetch one page, then callback(error, records, nextQuery, apiResponse).
  }
}
paginator.extend(Catalog, 'list');
Catalog.prototype.listStream = paginator.streamify('list');
const catalog = new Catalog();
const [records, query, lastResponse] = await catalog.list({prefix: 'reports/'});
for await (const record of catalog.listStream({maxResults: 100})) {
  // Process each record.
}
```

`Paginator`, its shared `paginator` instance, and `ResourceStream` are available
as named CommonJS and ESM exports. `extend` preserves the original method as
`name_`, binds its receiver, and supports callbacks or promises through the
original caller's conventions. Repeating an extension does not wrap it again.
`streamify` returns a function using that original method. Direct construction
is `new ResourceStream(parsedArguments, requestFunction)`.

Automatic callback/promise results contain all records, the working query and
the last page's response arguments. `autoPaginate: false`, `maxResults`, or
`pageSize` selects manual callback/promise delegation, matching upstream. In
streams, `maxResults` (or `pageSize`) caps emitted records; `maxApiCalls` caps
requests and is removed from the API query. Counts must be nonnegative safe
integers or `-1` for unlimited; zero makes no stream requests.

## Behavior improvements

- Page arrays are snapshotted rather than spliced or retained for later mutation.
- Readable queues respect their high-water mark. At most one API request is in
  flight; one page snapshot can still be retained outside that queue. Automatic
  callback/promise aggregation necessarily retains all collected records.
- End, destruction and AbortSignal cancellation stop future pages and ignore
  late callbacks. Pending handles exposing `abort`, `cancel`, or `destroy` are
  canceled once. Storage's listing methods do not return their HTTP handles, so
  those methods can stop pagination but cannot abort an already dispatched HTTP
  request through this interface.
- Duplicate callbacks are ignored; malformed page arrays and null/undefined
  records fail explicitly. False, zero and empty strings remain valid records.
- Queries deep-copy own enumerable plain-object/array data through `vextend`;
  inherited fields are not copied. Non-plain objects such as signals retain
  identity. Finite limits and boolean flags are validated.
- Only stream buffering, `autoDestroy`, `emitClose`, `allowHalfOpen`, and `signal`
  options reach the native stream. User query fields cannot replace lifecycle
  methods or disable object mode. Direct lifecycle overrides are rejected.
- Prototype extension preflights requested methods before changing ordinary
  prototypes, refuses invalid names and preserves existing property attributes.

Native stream buffering still applies: calling `end()` stops future pushes,
but records already buffered can drain. Use `destroy()` to cancel consumption.
This package does not add a retry policy, a transport, or a page-token loop
policy. Caller request errors propagate unchanged.

## Evidence

All 65 upstream cases run against the original and VPM implementations on both
runtimes. The root suite adds 28 focused cases. Independent controls demonstrate
upstream page mutation, excess readable buffering, missing handle cancellation,
and ignored invalid limits. Storage caller checks exercise 16 adapter instances
per run. See the [conformance fixture](../../scripts/paginator-conformance/README.md),
[provenance](PROVENANCE.json), and [paired benchmarks](bench/results/README.md).
