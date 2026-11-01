# vfullcalendar-core

An independently implemented native-fetch feed request and the shared option
contracts for FullCalendar 7, targeting
**@fullcalendar/core 7.1.3**, the latest stable release checked November 1, 2026.
Zero dependencies; an ES module for browsers, Node.js 24+ and Bun.

```js
import {requestJson, JsonRequestError} from 'vfullcalendar-core/protected-api';

try {
  const [events, response] = await requestJson('GET', '/api/events#week', {start: '2026-11-01', end: '2026-12-13'});
  // fetched /api/events?start=2026-11-01&end=2026-12-13
} catch (error) {
  if (error instanceof JsonRequestError) console.warn(error.message, error.response.status);
}
```

In FullCalendar 7 this package is no longer the calendar: the framework
connectors are self-contained, and the plain JavaScript calendar is the
`fullcalendar` package. What remains is `./protected-api`:

- The option interfaces connectors extend with `declare module`
  (`BaseOptions`, `BaseOptionsRefined`, `EventSourceOptions`,
  `EventSourceOptionsRefined`, `EventRefiners`) and the `RawOptionsFromRefiners`,
  `RefinedOptionsFromRefiners` and `Identity` helper types.
- `requestJson(method, url, params)`, the request behind JSON feed event
  sources: GET parameters go in the query string, other methods send them as a
  form-encoded body; it resolves with `[parsed, response]` and rejects with
  `JsonRequestError` (`message`, `response`) for a non-2xx status or a body that
  is not JSON. Network failures reject with fetch's own error.
- `identity(value)`.

`@fullcalendar/react` 7.1.3 bundles its own copy of `requestJson`; the copy
behaves exactly as this package's original.

| Upstream dependency | Here |
| --- | --- |
| `@full-ui/headless-calendar` 7.1.3 (peer) | Not needed: neither entry imports it |
| `temporal-polyfill` ^1.0.1 (peer) | Not needed: neither entry imports it |

## Changes from 7.1.3

- **Fragment URLs keep their parameters.** GET parameters were appended to the
  end of the URL, after any `#fragment`, which fetch never sends: a feed at
  `/feed.php#calendar` received no `start` or `end`, in the original and in the
  copy `@fullcalendar/react` bundles. The query now goes ahead of the fragment,
  and no `?` or `&` is left dangling (`/feed?` became `/feed?&start=...`).
  The fragment is then removed before fetch, including on POST and empty-parameter
  requests. A recording server showed Bun 1.4.0 forwarding fragments literally;
  stripping them here makes the wire target consistent across runtimes.
- **Declarations without DOM types.** They named the DOM's `Response`, so a
  project compiled without DOM or Node types (a worker, or a server build with
  `"types": []`) could not import them. The response type is now the runtime's
  fetch `Response` when one is declared, and otherwise the part FullCalendar
  reads; it is exported as `FetchResponse`.
- **No console output on import.** Importing the package entry printed
  "@fullcalendar/core should not be imported directly", although the package
  declares `sideEffects: false`, so bundlers dropped the message while Node and
  Bun printed it. The entry now exports nothing; a v6-style named import such as
  `Calendar` still fails at link time with the missing name.

## Evidence

- [Callers](../../scripts/fullcalendar-core-conformance/callers.cjs): eleven JSON
  feed calls and a refused connection through the original, the copy
  `@fullcalendar/react` bundles and VPM against a recording server; requests and
  results are identical apart from the URL changes above.
- [Regressions](../../scripts/fullcalendar-core-conformance/regressions.cjs):
  each change above reproduced with the original, then checked here.
- [Focused tests](test/core.test.cjs) and [type tests](test/types.ts).

The request pipeline and declarations are written here; the former adapted
build is no longer shipped. URL assembly, transport failure and JSON decoding
have separate responsibilities. The implementation is informed by the public
contract and inspected upstream behavior, not a clean-room claim.

The upstream package has no tests of its own, and these are network-bound calls
with no performance claim. MIT licensing, the pinned source and the changes are
recorded in [PROVENANCE.json](PROVENANCE.json).
