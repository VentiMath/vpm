# vmime

File-extension MIME lookup for Node.js 24 and Bun, with full and lite tables,
custom definitions, CommonJS and ES modules, and no runtime dependencies.
The comparison baseline is **mime 4.1.2**, checked October 30, 2026.

```js
import mime, { Mime } from 'vmime';

mime.getType('reports/summary.JSON'); // 'application/json'
mime.getExtension('text/html; charset=utf-8'); // 'html'
mime.getAllExtensions('image/jpeg'); // Set { 'jpg', 'jpeg', 'jpe' }

const custom = new Mime({ 'application/example': ['example', 'ex'] });
custom.getType('report.ex'); // 'application/example'
```

CommonJS uses `const mime = require('vmime')` and `const { Mime } = mime`.
`vmime/lite` exports the same API with only the upstream standard table.
`vmime/types/standard.js` and `vmime/types/other.js` export deeply frozen maps
that can seed custom instances. The package includes TypeScript declarations
that need no ambient Node or browser types. A browser-target bundle is checked
in an isolated VM; this does not constitute a full browser compatibility suite.

## Behavior and improvements

The 1,016 MIME types and 1,240 extension assignments preserve mime 4.1.2's full
tables, ordering and starred conflict preferences. This differs from
[mime-types](../vmime-types), which has another API and data-selection rules.
No database download, filesystem access or content sniffing occurs at lookup.

- `getType` accepts a path or bare extension, with either path separator and
  case-insensitive suffixes. It scans only the suffix, without lowercasing or
  copying the whole basename. Bare `.json` resolves; `directory/.json` does not,
  matching upstream. Query strings are not stripped: this is a path API.
- `getExtension` and `getAllExtensions` ignore parameters and surrounding
  whitespace. Unknown/non-string input returns `null`; all-extension results are
  independent Sets, as they already are in mime 4.1.2.
- `define(map, force = false)` either applies the whole definition or throws
  before changing its mappings. Upstream leaves partial state after a conflict
  or a malformed later entry. Own enumerable keys only are read; extension
  arrays must contain strings, and `force` must be boolean.
- Built-in instances reject definitions even through `Mime.prototype.define`.
  `_getTestState()` returns detached Maps; it cannot mutate lookup state.
  Exported type-map arrays are frozen as well as their containing objects.
- Empty Content-Type input returns `null`, consistently with other misses;
  upstream `getExtension('')` and `getExtension('; charset=utf-8')` return `''`.

Custom definitions preserve the current API: case folding, leading `*` for
reverse-only extensions, forced reassignment, unioned extension lists, empty
lists and the newest definition's first extension as its reverse preference.
Forced reassignment does not remove an older type's reverse entry. Methods use
the instance as their receiver; bind them explicitly when extracting a method.
`_freeze()` locks a custom instance. Inspection returns copies even when mutable.

The CLI is named `vmime`: `vmime file.json`, `vmime -r application/json`,
`--help`, `--version` and `--name`. Unknown input exits with status 1.

## Storage compatibility and migration

Storage 8.4.0 still depends on mime 3.0.0. Its actual `File.createWriteStream`
and `Bucket.combine` methods pass with VPM: eight uploads, eight composes and
14 instrumented lookups per runtime, including gzip bytes, explicit metadata,
Windows paths, uppercase suffixes, unknown extensions and dotfiles. Transport
is mocked; these are caller checks, not cloud-service or deployment tests.

Data follows current mime 4.1.2: compared with version 3, **69 extensions are
added, 11 assignments change, and two are removed**. For example, `.js` and
`.mjs` now produce `text/javascript`; `.es` and `.hsj2` no longer resolve.
The exhaustive [migration list](../../scripts/mime-conformance/migration.json)
is checked in tests. Explicit Storage content types continue to take precedence.
This package does not preserve mime 3's mutable built-in singleton or private
`_types`/`_extensions` dictionaries.

## Verification and measurements

Ten focused tests cover every full/lite table entry, 5,000 seeded paths,
transaction failures, mutation protection, exports, CLI exits and the complete
version 3 migration. The [retained upstream suite](../../scripts/mime-conformance/README.md)
runs all 15 cases unchanged against both implementations, with only import/CLI
locations adapted. Six paired discriminators demonstrate the behavior changes.
Packed npm/Bun installs, both module systems and TypeScript consumers are checked.

See [measurements and raw samples](bench/results/README.md) for lookup and setup
costs on Node 24 and Bun, including regressions. They are package-level CPU
measurements, not an application speedup claim.

[Provenance](PROVENANCE.json) identifies the pinned source and data; the upstream
MIT notice is retained in [LICENSE](LICENSE).
