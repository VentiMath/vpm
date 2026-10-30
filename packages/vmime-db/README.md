# vmime-db

An immutable, typed counterpart to `mime-db` 1.54.0. Includes the same 2,522 MIME
records, with zero runtime dependencies, for Node.js 24+ and Bun.

The catalog is preserved byte for byte. VPM changes how the shared data is
exposed and verified; it does not claim to have invented better MIME assignments.

## Use

```js
const db = require('vmime-db');

db['application/json'].charset;       // 'UTF-8'
db['text/html'].extensions;           // ['html', 'htm', 'shtml']
db['image/png'].compressible;         // false
db['application/not-in-the-catalog']; // undefined
```

ES modules can use `import db from 'vmime-db'`.

Keys are lowercase media types. Each record can contain `source` (`iana`,
`apache`, or `nginx`), `charset`, `compressible`, and `extensions`. Missing fields
stay absent: for example, no `compressible` field means unknown, not false.
Records without `source` preserve upstream's custom entries. See
[vmime-types](../vmime-types) for extension lookup and default charset handling.

## Improvements and compatibility

- The database, every record, and every extension array are frozen. One consumer
  cannot accidentally change another consumer's MIME information.
- Database and record prototypes are `null`; inherited names such as
  `constructor` are absent. Use `Object.hasOwn()` instead of instance methods.
- Declarations express readonly data and possibly missing keys, even without
  TypeScript's `noUncheckedIndexedAccess` option.
- [provenance.json](provenance.json) records the exact upstream version, commit,
  source URL, SHA-256 digest, and entry count. Tests verify them offline.

Data values and extension ordering are unchanged. Mutating shared data is a
deliberate compatibility break. Build a separate copy for custom entries:

```js
const custom = {
  ...db['text/html'],
  extensions: [...db['text/html'].extensions, 'myhtml'],
};
```

The public exports are the package root and `package.json`. Upstream's direct
`mime-db/db.json` import is not exposed: import the package root for the immutable
view. The unmodified JSON and provenance file remain in the archive for inspection.
No MIME sniffing, file reading, or automatic network updates occur at runtime.

## Data provenance and maintenance

The snapshot is [`mime-db` 1.54.0 at commit
5207a32](https://github.com/jshttp/mime-db/tree/5207a32f76e77ed2f63421641449f8addeacb0a5).
Upstream aggregates [IANA](https://www.iana.org/assignments/media-types/media-types.xhtml),
[Apache](https://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types),
[nginx](https://hg.nginx.org/nginx/raw-file/default/conf/mime.types), and documented
custom entries. The record's `source` preserves upstream attribution; detailed
custom-entry references remain in that pinned upstream repository.

To update this snapshot:

1. Select an explicit upstream release and resolve its tag to a commit. Review
   additions, removals, changed metadata, and upstream license notices.
2. Copy that commit's `db.json` unchanged. Update provenance, the pinned digest
   and count checks, and this document; do not hand-edit data while claiming the
   upstream digest still applies.
3. Review changes to `vmime-types` extension choices and Content-Type defaults.
   Run both runtimes' tests, type checks, benchmarks, archive checks, and the
   integration gate (`scripts/integration.cjs`) before a versioned release.

Data changes are release changes and must be documented, including remapped
extensions. `vmime-types` packs an exact dependency version to prevent an
unreviewed data update through a dependency range. This initial snapshot does
not claim to include every MIME registration made after upstream 1.54.0.

## Tests and performance

Five tests check the complete data equality/digest, schema, every frozen layer,
missing keys, and isolated customization. The MIME utility's differential tests
also cover every catalog type and extension.

From the repository root:

```sh
node packages/vmime-db/bench/compare.cjs
bun packages/vmime-db/bench/compare.cjs
node packages/vmime-types/bench/startup.cjs
bun packages/vmime-types/bench/startup.cjs
```

One local run on October 26, 2026. Cells are **upstream / VPM**. Lookups use seven
alternating samples of 50,000 calls after warmup, consuming the results. Startup
is median first-require time over 11 fresh processes with warm filesystem caches;
process creation and fixture preparation are excluded.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Record source (ns/call) | 13 / 12 | 7 / 8 |
| First extension (ns/call) | 13 / 15 | 8 / 14 |
| First database require (ms) | 2.375 / 2.869 | 4.220 / 3.182 |

This is primarily a data integrity and typing improvement. Freezing and changing
prototypes add initialization work; first-extension reads were slower on both
runtimes. Startup results depend on runtime, file loading, and filesystem caches.
No memory reduction or application speedup is claimed.

## Install from this repository

Run `bun pm pack` in `packages/vmime-db`, then in a consuming project:

```sh
bun add /absolute/path/to/vpm/packages/vmime-db/vmime-db-0.1.0.tgz
```

The package has not been published by VPM to a registry.

## License

MIT. Upstream notices for Jonathan Ong and Douglas Christopher Wilson are
preserved in [LICENSE](LICENSE).
