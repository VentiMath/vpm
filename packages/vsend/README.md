# vsend

HTTP file delivery using VPM packages, with explicit conditional request rules,
validated options, and guarded stream cleanup. A counterpart to `send` 1.2.1 for
Node.js 20+ and Bun. All eleven direct runtime dependencies have VPM counterparts;
the complete external dependency tree contains thirteen VPM packages.

## Use

```js
const http = require('node:http');
const send = require('vsend');

http.createServer((req, res) => {
  // Pass the URL-encoded pathname, without its query string.
  const pathname = req.url.split('?')[0];
  send(req, pathname, { root: '/srv/public', maxAge: '1h' })
    .on('headers', response => response.setHeader('X-Content-Type-Options', 'nosniff'))
    .pipe(res);
}).listen(3000);
```

ES modules can use `import send from 'vsend'`. TypeScript declarations are
included. Structural request, response, file-stat, and stream interfaces avoid
requiring a separate types package just to import `vsend`.

`send(request, pathname, options)` returns an event emitter; `pipe(response)`
starts delivery and returns the response. A sender can be piped once. It is not
Express middleware: method restrictions, URL query parsing, and routing belong
to its caller. Without `root`, relative paths resolve against the working directory.

## Options and events

| Option | Default and behavior |
| --- | --- |
| `root` | Optional filesystem root. Pathnames are decoded once, normalized, and checked for lexical escape. |
| `dotfiles` | `'ignore'` gives 404; `'deny'` gives 403; `'allow'` permits dotfiles. Applies to index candidates too. |
| `index` | `['index.html']`; a relative name, array of names, or `false`. Nested relative names are allowed. |
| `extensions` | Disabled; a suffix or array of suffixes to try when an extensionless file is missing. |
| `acceptRanges` | `true`; permits one byte range or overlapping ranges combined into one. Multiple disjoint ranges fall back to the full response. |
| `etag`, `lastModified` | `true`; use weak stat-based tags and modification dates unless a header is already set. |
| `cacheControl`, `immutable` | `true` and `false`, respectively. |
| `maxAge` | `0`; milliseconds or a duration string, clamped to one year. Takes precedence over legacy `maxage`, including explicit zero. |
| `start`, `end` | Optional inclusive byte offsets. Must be non-negative safe integers, with `end >= start`. Range headers operate within this selected window. |
| `highWaterMark` | Native read-stream default; an override must be a positive safe integer. |

Supported options, including inherited values used by Express and serve-static,
are snapshotted at construction. Arrays are copied and frozen. Arbitrary options
such as `fd`, `fs`, `flags`, and `encoding` are not passed to `fs.createReadStream`.
Absolute index names, parent traversal components, and path separators in
extension suffixes are rejected before I/O.

Events retain their upstream signatures: `file(path, stat)`,
`headers(response, path, stat)`, `stream(readStream)`, `end()`,
`directory(response, path)`, and `error(httpError)`. A directory listener takes
ownership of that response; otherwise the sender redirects to a trailing slash.
An error listener similarly owns error handling, including clearing stale file
headers before writing an alternative body or closing a partial response.

File, header, and stream hooks may end or destroy the response; subsequent
delivery stops. A hook replacing the body must adjust its headers, including
Content-Length. Exceptions thrown by application hooks remain application errors.
Empty GETs finish without opening a file stream and emit `end` but no `stream`
event; HEAD and 304 responses emit neither. `end` means the source finished;
observe the response's lifecycle for completion of transmission.

## Improvements and compatibility changes

- **Strong preconditions:** `If-Match` compares strong tags, recognizes commas
  inside quoted tags, and rejects malformed lists. A weak stat ETag cannot satisfy
  it, even if its opaque value matches. `*` matches an existing file without an
  ETag. `If-Match` takes precedence over `If-Unmodified-Since`; a missing
  Last-Modified value does not itself make that date precondition fail.
- **Conditional precedence:** `If-None-Match` suppresses `If-Modified-Since`, even
  when empty. A matching tag yields 304 for GET/HEAD and 412 for other applicable
  methods. Date freshness alone does not turn POST into 304. GET/HEAD retain the
  upstream convention that a request's `Cache-Control: no-cache` forces a body.
- **Range validation:** `If-Range` requires an exact strong ETag or an equal
  Last-Modified date. Weak tags, substring matches, and later dates select the
  full response. Range applies only to GET and an otherwise 200 response;
  HEAD reports full length. Oversized suffixes and malformed numbers inherit
  the documented [`vrange-parser`](../vrange-parser) behavior.
- **Completion and errors:** completion watching starts before filesystem work.
  A disconnect stops pending delivery and destroys an opened reader. Read error
  listeners are installed before stream hooks. Premature stream closure and
  short reads fail instead of successfully completing an incorrectly framed
  response; errors after headers close the connection unless a custom error
  listener takes ownership. HTTP/2 uses response lifecycle events, including
  for HEAD requests whose compatibility socket is not writable.
- **Headers and filesystem inputs:** generated responses remove conflicting
  Transfer-Encoding/Trailer fields. Full responses clear stale Content-Range;
  304 responses clear content headers. Non-regular filesystem objects are
  rejected before opening. Options are validated and copied as described above.

The conditional changes follow [RFC 9110 precondition
order](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.2.2),
[If-Match](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1),
[If-Range](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.5), and
[Range](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.2).

Dates retain `Date.parse` behavior rather than strict HTTP-date syntax. Equal
modification dates cannot prove that a file was unchanged within a second;
stat-derived validators retain that limitation. The root check is lexical,
**not a filesystem jail**: symlinks are followed, including outside the root.
Stat and open are separate operations; short-read detection does not make file
identity or contents atomic. These changes do not establish a general security
or performance improvement.

## Validation

Twenty-five tests cover an ordinary-request differential matrix, conditional
headers, ranges, option inheritance, path handling, event order, response hooks,
read failures, truncation, disconnection, keep-alive reuse, and real HTTP/2
GET/HEAD/range/304 responses. The differential fixture is unchanged `send` 1.2.1
loaded with the same VPM primitives to isolate the sender's behavior; it is not
the complete upstream test suite or dependency stack.

The shared integration gate exercises the pinned production consumer stack:

```sh
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
```

The gate passed 65 HTTP checks on Node and Bun through Functions Framework
5.0.2, firebase-functions 7.4.0, Express 5.3.0, and serve-static 2.2.1. It aliases
all VPM counterparts inside its own process and verifies each is reached,
including transitive calls. Checks include `res.sendFile`, `res.download`,
completion/error callbacks, static extensions/indexes, redirects with queries,
fallthrough, dotfiles, HEAD, ranges, and conditional responses. A 416 integration
case caught and corrected `vfinalhandler` dropping explicit Content-Range error
metadata. No application manifest is changed. The gate runs in CI on Node 20,
22, 24 and Bun; it does not validate an older Express 4 stack.

## Performance

```sh
node packages/vsend/bench/compare.cjs /path/to/node_modules/send
bun packages/vsend/bench/compare.cjs /path/to/node_modules/send
```

Pass the installed `send` 1.2.1 directory to compare its complete dependency
stack. Omitting it uses the shared-primitives fixture instead.

One local run on October 26, 2026, against installed `send` 1.2.1 and its upstream
dependencies. Cells are **send / vsend**, in median microseconds per completed
request. Seven alternating samples of 200 sequential requests follow 50 warmup
requests per implementation. Outputs are compared before timing and consumed
during timing. Both implementations use keep-alive, warm filesystem caches,
and localhost HTTP with no TLS.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| 4 KiB file GET | 222.1 / 244.0 | 205.2 / 214.3 |
| HEAD | 108.9 / 122.2 | 103.5 / 114.0 |
| Single 1 KiB range | 208.6 / 211.8 | 206.9 / 199.9 |
| 304 | 108.4 / 129.6 | 105.3 / 115.1 |

Ordinary GETs were **4–10% slower**, HEAD was **10–12% slower**, and 304 responses
were **9–20% slower**. The range case was close: 2% slower on Node and 3% faster
on Bun. These measurements include filesystem and HTTP work and show no broad
speedup. They do not measure concurrent production throughput, tail latency,
memory, HTTP/2 performance, or cold-cache behavior.

## Install from this repository

These packages are not published by VPM to a registry. Pack `vsend` and its
dependency closure with `bun pm pack` in each package directory:

```text
vsend, vdebug, vencodeurl, vescape-html, vetag, vfresh, vhttp-errors,
vmime-types, vms, von-finished, vrange-parser, vstatuses, vee-first, vmime-db
```

In the consuming manifest, set `dependencies.vsend` to the absolute `file:` path
of `vsend-0.1.0.tgz` and add `overrides` mapping each of the other thirteen names
to its own archive's absolute `file:` path. Then run `bun install`.
Packing rewrites `workspace:*` to exact `0.1.0` versions; the overrides resolve
those unpublished dependencies locally. Tests and benchmarks are excluded.
Installing `vsend` does not automatically redirect another package's `send`
imports; adoption requires explicit integration and validation.

## Origin and license

Derived from [`send` 1.2.1 at commit
096a614](https://github.com/pillarjs/send/tree/096a6148bea0b82ca974fe0016e6eac280869249).
The unchanged source and original license are retained as test fixtures.
MIT licensed, with upstream notices preserved in [LICENSE](LICENSE).
