# vetag

Compatible HTTP entity tags for Node.js 24+ and Bun, with no external runtime
dependencies. A counterpart to `etag` 1.8.1 using native one-shot hashing when
available, with a `createHash` fallback for older supported runtimes.

## Use

```js
const etag = require('vetag');

etag('hello');
etag(Buffer.from('hello'), { weak: true });
etag(Uint8Array.from([1, 2, 3]));
etag({ size: 123n, mtime: new Date(1000) });
```

ES modules can use `import etag from 'vetag'`. Bundled TypeScript declarations
accept `string`, `Uint8Array` (including Buffer), and stat objects with `size`
and `mtime`. No separate Node.js types are required by the declarations.

## Compatibility and improvements

Strings are hashed as UTF-8. Body tags retain upstream's exact length and SHA-1
format, including its empty-body constant, so adopting this package does not
invalidate existing compatible validators. `options.weak` overrides the default:
false for bodies and true for file metadata.

- One-shot native hashing avoids a separate hash object on supporting runtimes.
- `Uint8Array` inputs hash only their visible bytes, honoring view offsets and
  lengths without modifying the input.
- Actual `fs.Stats`, bigint Stats, and minimal `{ size, mtime }` objects work.
  Bigint sizes remain exact. Metadata tags retain the existing size/mtime format
  and millisecond resolution. Node derives a bigint Stats `mtime` by truncating
  nanoseconds while a plain Stats `mtime` is rounded, so switching a file to
  bigint stats can change its tag by one millisecond.
- Sizes must be non-negative safe integers or non-negative bigints. Invalid
  sizes and invalid/non-Date modification times throw `TypeError`, preventing
  misleading tags containing NaN or rounded unsafe numeric sizes.

Other typed arrays, DataView, and ArrayBuffer are not accepted. Strings are not
implicitly coerced. These are HTTP validators; no stronger hash algorithm or
application-wide security improvement is claimed.

## Validation and performance

Seven tests cover ordinary bodies, 500 generated UTF-16 strings and their byte
encodings, sliced arrays, real/bigint file metadata, cross-realm Dates, invalid
inputs, and the hashing fallback. Tag values are compared with unchanged upstream
source. The repository's [integration gate](../../scripts/integration.cjs) aliases this package into ventimath's pinned Cloud Functions upgrade target (Functions Framework 5.0.2, firebase-functions 7.4.0, Express 5.3.0, send 1.2.1, serve-static 2.2.1) and runs real HTTP checks on Node and Bun in CI. It verifies response and static-file validators.

From the repository root:

```sh
node packages/vetag/bench/compare.cjs
bun packages/vetag/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **etag / vetag**, median nanoseconds
per call across seven alternating samples of 50,000 calls after warmup. Inputs
are prepared outside timing and returned tag lengths are consumed.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Empty body | 25 / 9 | 19 / 7 |
| Short ASCII | 619 / 386 | 468 / 241 |
| 1 KiB buffer | 952 / 748 | 716 / 644 |
| Approximately 32 KiB Unicode | 68,904 / 68,463 | 33,899 / 30,907 |
| File metadata | 139 / 75 | 74 / 58 |

Short-text tags took 38–49% less time. Larger Unicode hashing was close on Node
and about 9% faster on Bun. The table includes conversion/hashing work but no file
reads or HTTP I/O. Results vary; no application throughput gain is established.

## Install and origin

Run `bun pm pack` in this package directory, then install the resulting
`vetag-0.1.0.tgz` with `bun add /absolute/path/to/vetag-0.1.0.tgz` in a consumer.
VPM has not published this package to a registry. Tests and benchmarks are excluded
from the archive.

Derived from [`etag` 1.8.1](https://github.com/jshttp/etag/tree/9b1e3e41df31cda4080833c187120b91a7ce8327),
by Douglas Christopher Wilson. The source fixture is verified against that commit.
MIT licensed; original notices are preserved in [LICENSE](LICENSE).
