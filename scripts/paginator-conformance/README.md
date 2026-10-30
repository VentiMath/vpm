# Paginator conformance and Storage callers

Pinned **@google-cloud/paginator 7.2.0**, from
[google-cloud-node at 703154ba](https://github.com/googleapis/google-cloud-node/tree/703154ba1720ff2d1a5832ad0683a3c3bcbbadd1/core/paginator).
Retained source, tests and license are checked against `upstream/SHA256.json`.
The package archive contains only runtime code, declarations and documentation;
these upstream packages and test helpers are development fixtures.

Run from the repository root:

```sh
npm --prefix scripts/paginator-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/paginator-conformance/run.cjs
node scripts/paginator-conformance/run.cjs --upstream
node scripts/paginator-conformance/regressions.cjs
node scripts/paginator-conformance/callers.cjs
node scripts/paginator-conformance/callers.cjs --upstream
```

Repeat with `bun` in place of `node`. Runtime support is Node 24+ and Bun.
TypeScript 7 compiles the retained upstream test sources without type-checking
upstream's private test annotations. Mocha executes all **65 cases** with Jest's
expect and mock implementations plus Sinon fake timers. No cases are skipped.
The index suite's mock is placed before its import, reproducing Jest hoisting;
additional nonmocked helper exports are preserved. The method-array test is
provided its missing second method before wrapping, for both implementations.
Original assertions remain intact. Each suite uses an isolated child process.

`regressions.cjs` compares page-array mutation, excess readable buffering, handle
cancellation and invalid-limit behavior directly with upstream. The root suite
adds **28 tests** for limits, snapshots, lifecycle, pipeline backpressure,
callbacks, errors, prototype wrappers and cancellation.

Caller checks use the separately pinned retry-request fixture's Storage **8.4.0**
and its paginator **7.2.0**. They load the real SDK classes with the selected
paginator, then stub the request boundary with asynchronous page responses.
They exercise bucket/file/HMAC-key resource construction, continuation tokens,
last-response metadata, callbacks, promises, manual pagination, streamed limits
and errors, with **16 verified paginator stream instances**. These checks do not
contact Google or measure network performance. The root integration suite also
runs this caller check with VPM substitutions installed.

Storage's listing methods do not return the HTTP request handle. Canceling their
pagination stops future pages and ignores late responses; aborting an in-flight
HTTP request needs a caller that returns an abortable handle.

[Benchmark methodology and retained measurements](../../packages/vpaginator/bench/results/README.md)
cover query parsing, delegation, callback/promise paging, and normal/slow object
streams. Performance differences are separate from correctness claims.
