# vfinalhandler

Final HTTP error and 404 responses for Node.js 24+ and Bun. A counterpart to
`finalhandler` 2.1.1 with guarded completion, consistent response framing, and
bundled TypeScript declarations.

All six direct dependencies are VPM packages: [`vdebug`](../vdebug),
[`vencodeurl`](../vencodeurl), [`vescape-html`](../vescape-html),
[`von-finished`](../von-finished), [`vparseurl`](../vparseurl), and
[`vstatuses`](../vstatuses). Through those packages it also uses `vms` and
`vee-first`. This completes one HTTP utility chain; it does not reduce its
declared dependency count or replace Express itself.

## Use

```js
const http = require('node:http');
const finalhandler = require('vfinalhandler');

http.createServer((req, res) => {
  const done = finalhandler(req, res, {
    env: 'production',
    onerror(error) { console.error(error); },
  });

  // Pass done to your router, or call it when no route handled the request.
  // Call done(error) for an unhandled error.
  done();
}).listen(3000);
```

ES modules can use `import finalhandler from 'vfinalhandler'`.

## API and compatible behavior

`finalhandler(request, response, options?)` returns `done(error?)`. Calling it
without a truthy error produces a 404 HTML page naming the method and original
pathname, omitting the query. URLs are encoded and HTML text is escaped.

For errors, status selection is `error.status`, then `error.statusCode`, then
`response.statusCode`, then 500. Each candidate must be an integer from 400 to
599. `error.headers` is used only when the error supplies a valid status. Other
response headers remain unless they describe the replaced body or its framing.

`options.env` defaults to `NODE_ENV`, then `development`. Production pages contain
only the status phrase, even if an error has `expose: true`. Other environments
use `error.stack`, then `error.toString()`, then the status phrase. Newlines and
repeated spaces retain upstream HTML formatting. HEAD sends the same content
length as GET without a body; HTTP/2 does not assign a reason phrase.

`options.onerror(error, request, response)` runs through `setImmediate` for the
first accepted error, including when the response can no longer be changed.
The callback is not awaited. Invalid non-null callback values fail at handler
construction. The `DEBUG=finalhandler` logging namespace is retained.

Unread request bodies are unpiped and drained with `von-finished` before writing.
This preserves connection reuse. Application/server request timeouts still govern
clients that do not finish sending their bodies.

## Improvements and intentional differences

- **One completion:** the first accepted call wins, preventing duplicate writes.
  A 404 ignored because headers have already been sent does not consume the
  handler; a later error can still close that partial response. Errors passed
  after an accepted call are not written, but they are still reported through
  `onerror`, since frameworks such as Express log errors only through it.
- **Recheck after draining:** if another writer sends headers while the body is
  draining, a pending error closes the partial response and a pending 404 is
  ignored. Completed/destroyed responses and aborted requests receive no new
  writes. Errors arriving after a completed response do not destroy its otherwise
  reusable connection.
- **Consistent framing:** removes `Transfer-Encoding` and `Trailer` before setting
  `Content-Length`. Upstream can send both transfer encoding and content length,
  which Node and Bun HTTP clients reject. Error headers cannot reintroduce those
  fields or obsolete `Content-Encoding` and `Content-Language`. A previous
  Content-Range is removed, but an explicit 416 error's Content-Range is
  preserved: send/serve-static use it to report the full representation length.
  Content type/length, CSP, and `nosniff` are controlled by the generated page.
- **Valid numeric statuses:** rejects NaN and fractional codes. Unknown integer
  4xx/5xx codes remain usable, with `Unknown Error` as their phrase instead of an
  undefined message.
- **Stable header snapshot:** array values such as `Set-Cookie` are copied before
  draining, so later mutation does not change the pending response.
- **Readable missing paths:** absent, invalid, or empty pathnames use `resource`.
  The existing VPM URL and HTML fixes apply to the generated pages.

These changes do not establish a security vulnerability in upstream or an
application-wide performance improvement. Node still validates custom headers;
invalid header values and exceptions from application getters/callbacks are not
silenced. The library retains legacy URL parsing semantics through `vparseurl`.

## Validation

The package has 30 tests, including 480 normal-response combinations compared
with unchanged `finalhandler` 2.1.1 source, every standard error status, lifecycle
races, header snapshots, and real HTTP/1 and HTTP/2 connections. The differential
fixture uses the same VPM primitives to isolate handler behavior. Its source is
pinned to the upstream commit linked below and excluded from installable archives.

Real connection tests cover unread/piped uploads, client aborts, HEAD, keep-alive
reuse, production message hiding, and the upstream framing failure. All tests
pass on Node 24.22.1 and Bun 1.4.0. Type checks exercise HTTP/1 and HTTP/2, CommonJS,
and ES module imports. Declarations do not require separate Node.js types.

The repository's [integration gate](../../scripts/integration.cjs) aliases this
package into ventimath's pinned Cloud Functions upgrade target (Functions Framework 5.0.2,
firebase-functions 7.4.0, Express 5.3.0, send 1.2.1, serve-static 2.2.1) and runs
real HTTP checks on Node and Bun in CI. Through it, Express's default 404 and error
handling, mounted paths, error logging after an accepted response, and
conflicting framing headers run against this package. A range error from
`vsend` also verifies that its 416 response keeps `Content-Range: bytes */20`.

## Performance

From the repository root, pass an installed upstream package to compare the
complete dependency stacks:

```sh
node packages/vfinalhandler/bench/compare.cjs /path/to/node_modules/finalhandler
bun packages/vfinalhandler/bench/compare.cjs /path/to/node_modules/finalhandler
```

Without the path, the benchmark uses the pinned upstream handler with shared VPM
primitives. That default measures handler differences rather than the full stack.

One local full-stack run on October 26, 2026. Cells are **upstream / VPM**, median
nanoseconds per call over seven alternating samples of 50,000 calls after warmup.
Each call gets a fresh completed request and an in-memory response. Results are
consumed; socket I/O, request draining, and application routing are excluded.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Short 404 pathname | 1,052 / 1,397 | 925 / 1,102 |
| Long 404 pathname (8 KiB) | 31,748 / 13,016 | 39,920 / 20,099 |
| Production error | 719 / 816 | 742 / 867 |
| Development stack | 3,025 / 3,110 | 3,145 / 3,297 |
| HEAD error | 719 / 811 | 755 / 881 |

Long-path response generation was about 2–2.4 times faster. **Short 404s were
19–33% slower**, and ordinary production/HEAD errors were 13–17% slower in this
run. Development-stack results were close, with VPM 3–5% slower. The added checks
and existing short-path parsing tradeoff have costs. The main gains here are
correctness and response lifecycle handling; no throughput or latency improvement
for a real application is claimed. Measurements vary across runs and runtimes.

The upstream stack was `finalhandler` 2.1.1, `debug` 4.4.3, `ms` 2.1.3,
`encodeurl` 2.0.0, `escape-html` 1.0.3, `on-finished` 2.4.1, `ee-first` 1.1.1,
`parseurl` 1.3.3, and `statuses` 2.0.2.

## Install from this repository

Run `bun pm pack` in each of the nine package directories. In a consuming
project, supply the archives explicitly, including the two transitive packages:

```json
{
  "dependencies": {
    "vfinalhandler": "file:/absolute/path/to/vpm/packages/vfinalhandler/vfinalhandler-0.1.0.tgz"
  },
  "overrides": {
    "vdebug": "file:/absolute/path/to/vpm/packages/vdebug/vdebug-0.1.0.tgz",
    "vencodeurl": "file:/absolute/path/to/vpm/packages/vencodeurl/vencodeurl-0.1.0.tgz",
    "vescape-html": "file:/absolute/path/to/vpm/packages/vescape-html/vescape-html-0.1.0.tgz",
    "von-finished": "file:/absolute/path/to/vpm/packages/von-finished/von-finished-0.1.0.tgz",
    "vparseurl": "file:/absolute/path/to/vpm/packages/vparseurl/vparseurl-0.1.0.tgz",
    "vstatuses": "file:/absolute/path/to/vpm/packages/vstatuses/vstatuses-0.1.0.tgz",
    "vms": "file:/absolute/path/to/vpm/packages/vms/vms-0.1.0.tgz",
    "vee-first": "file:/absolute/path/to/vpm/packages/vee-first/vee-first-0.1.0.tgz"
  }
}
```

Run `bun install`. Packing replaces workspace references with package versions;
the overrides supply their local archives. These packages have not been published
by VPM to a registry. Replacing an application's transitive `finalhandler` requires
explicit dependency configuration; installing `vfinalhandler` alone does not do it.

## Origin and license

Derived from [`finalhandler` 2.1.1](https://github.com/pillarjs/finalhandler/tree/aa2851f6b6cf48238a307299be691721530e9172),
by Douglas Christopher Wilson. The upstream source fixture is verified against
that commit. MIT licensed; original notices are preserved in [LICENSE](LICENSE).
