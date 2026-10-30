# retry-request compatibility fixture

Development-only pinned tools and controls for `vretry-request`, targeting
retry-request **9.1.0**. The runtime package has no external dependencies. This
fixture and its SDK/transport packages are excluded from package archives.

The 30 upstream tests are pinned from googleapis/google-cloud-node commit
`ac7462ac8f1ff429c51aa5dafdfc3b9d4a6b0e0e`, directory
`core/packages/retry-request`. [The SHA-256 manifest](upstream/SHA256.json) verifies
the retained source files before each run. The immutable source manifest records
upstream's own development dependencies; those are not installed wholesale.
The fixture lockfile selects test tools and the published 9.1.0 control.

`run.cjs` runs the unchanged assertions against upstream and VPM in separate
processes. It selects the implementation import and adapts one cleanup callback:
Bun's `server.closeAllConnections()` can also stop the listener, so a following
`close()` may return `ERR_SERVER_NOT_RUNNING`. Only that already-closed cleanup
result is accepted. This correction applies to both implementations and both
runtimes. There are no skipped tests or changed retry assertions.

`timers.cjs` uses a fake clock to verify long-delay timer splitting, monotonic
retry budgets, and cancellation of initial waits. Controls reproduce upstream's
retry-after-abort and exhausted-deadline hangs and verify the VPM fixes.

Standalone `callers.cjs` substitutes only retry-request inside current **Cloud Storage 8.4.0**
and **google-gax 6.14.0**. It exercises Storage callback and readable download
retries using teeny-request 11.1.1 and a local HTTP server, plus google-gax's
retry-request server-streaming branch with in-memory gRPC-shaped streams.
It leaves gax's separate newer retry engine outside this package's scope.
`--check-control` first verifies that the identical rejected-download scenario
crashes upstream with `ERR_STREAM_UNABLE_TO_PIPE`, then verifies upstream's
successful download, callback retries and gax retries. VPM passes the original
download retry as well. The control's successful-download case returns 200 on
its first attempt; it is explicitly not a passing upstream retry claim.

```sh
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/retry-request-conformance/run.cjs
bun scripts/retry-request-conformance/run.cjs
node scripts/retry-request-conformance/timers.cjs
bun scripts/retry-request-conformance/timers.cjs
node scripts/retry-request-conformance/callers.cjs
bun scripts/retry-request-conformance/callers.cjs
node scripts/retry-request-conformance/callers.cjs --check-control
bun scripts/retry-request-conformance/callers.cjs --check-control
```

The root integration gate also invokes these SDK caller checks with its broader
VPM aliases, including vteeny-request. The teeny fixture separately holds
vretry-request constant while comparing HTTP transports. Retry aliases remain
limited to 9.1.0; older installed retry-request versions remain migration work.
