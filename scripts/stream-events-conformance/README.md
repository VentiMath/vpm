# stream-events compatibility fixture

Development-only checks for `vstream-events`, targeting **stream-events 1.0.5**.
The runtime package has no dependencies. This fixture reuses the separately
locked [retry-request fixture](../retry-request-conformance/README.md); no extra
installation or workspace dependency is needed.

The four upstream tests and implementation are pinned from
`stephenplusplus/stream-events` commit
`b53b9533cbccbad8dd50633ab95b6f3fe4e6258e` (tag `v1.0.5`). The
[SHA-256 manifest](upstream/SHA256.json) checks every retained source file before
execution. The upstream manifest declares MIT; the explicit license file was
added in commit `5cd27e04319f81836fb8018df36f5c09534194ab` and is retained here.

`run.cjs` runs all four original assertions against the published upstream
package and VPM. It changes only the implementation and fixture import paths.
The original runner catches failures and prints them without a failing exit;
the adapter additionally asserts four results and zero failures. There are no
skipped or weakened assertions. Both variants use pinned **duplexify 4.1.3**, as
current SDK callers do, rather than the upstream test manifest's old 3.x range.
Controls reproduce upstream's shared-counter duplicate events and corrupted
method return values, then check VPM's independent notifications and exact result.

`callers.cjs` substitutes only the stream decorator in **teeny-request 11.1.1**.
A local HTTP server verifies lazy reading and exact delivery of a 128 KiB body.
It then runs the existing **Cloud Storage 8.4.0** callback/download retries and
**google-gax 6.14.0** retry-stream checks with `vretry-request` and the selected
decorator. `--upstream` uses upstream stream-events with the same transports and
retry wrapper. That control permits upstream's repeated `writing` notifications;
VPM must emit exactly once. These are local caller checks, not live cloud tests.

```sh
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/stream-events-conformance/run.cjs
bun scripts/stream-events-conformance/run.cjs
node scripts/stream-events-conformance/callers.cjs
bun scripts/stream-events-conformance/callers.cjs
node scripts/stream-events-conformance/callers.cjs --upstream
bun scripts/stream-events-conformance/callers.cjs --upstream
```

Root integration includes the same direct teeny-request streaming check and the
shared SDK checks, with a version-scoped alias for stream-events 1.0.5. Its output
reports actual replacement calls. The fixture, SDKs and benchmarks stay outside
published VPM package archives.
