# vread-package-up

Find and read the nearest `package.json`, with no external dependencies.
Provides async and sync readers, explicit search boundaries, UTF-8 validation,
and self-contained TypeScript declarations. Supports Node.js 20+ and Bun,
CommonJS and native ES module named imports.

```js
import { readPackageUp, readPackageUpSync } from 'vread-package-up'
// Also: const { readPackageUp, readPackageUpSync } = require('vread-package-up')

const result = await readPackageUp({ cwd: process.cwd(), normalize: false })
if (result) {
  console.log(result.path)             // absolute path to package.json
  console.log(result.packageJson.type) // metadata exactly as parsed
}
```

## Scope and normalization

The comparison baseline is **read-package-up 11.0.0**. Functions Framework 5.0.2
calls it with `normalize: false` to choose CommonJS or ES module loading.
VPM preserves that raw-reading use case and makes it the default.

**npm metadata normalization is unsupported.** Upstream normalizes metadata by
default; VPM always returns the object parsed from the file. It preserves fields
such as `version`, `repository` and `bin` without rewriting them, and does not add
inferred fields. Explicit `normalize: true` throws instead of silently returning
unnormalized data. Consumers relying on upstream's normalized result need a
separate normalization step before switching. The normalized-result types are
not exported.

Upstream declares three direct dependencies and the pinned consumer fixture
installs 20 distinct transitive packages below it, including declaration-only
packages. The baseline imports normalization and rich JSON diagnostics even
when normalization is disabled. VPM replaces that branch with built-in modules;
other application dependencies may still need those upstream packages.

## API

`readPackageUp(options?)` returns a promise for `{ packageJson, path }`, or
`undefined` when no manifest is found. `readPackageUpSync(options?)` returns the
same result synchronously. Errors reject the async promise or throw from the
sync function. Options can be omitted or null; inherited option fields are
ignored, and recognized own fields are read once before filesystem work.

| Option | Contract |
| --- | --- |
| `cwd` | Starting directory as a path string or real `file:` URL. Defaults to `process.cwd()`; relative strings resolve against that captured directory. |
| `stopAt` | Inclusive boundary, which must be the starting directory or an ancestor. Defaults to the filesystem root; relative strings resolve against the starting directory. |
| `normalize` | Only `false` or omission is accepted. Metadata is always raw. |
| `type` | Only `'file'` or omission is accepted. |

The search checks the starting directory, then its parents. Invalid boundaries
are rejected before I/O. Missing directories and file-shaped starting paths keep
lexical parent-search behavior. Directories are skipped. Other nonregular files
are skipped when their type can be inspected; an OS error opening a special file
still propagates from the async reader. Symlink targets are followed, with the
searched path retained in the result. Broken links count as absent; symlink loops are errors.
Paths are not canonicalized with `realpath`. **The boundary is lexical and is not
a security sandbox:** symlinks can lead outside it.

Each call reads the filesystem anew and returns an independent parsed object.
There is no manifest or search-result cache to invalidate. A malformed nearest
manifest is an error; it never causes fallback to a higher manifest. Concurrent
replacement of a path after opening does not redirect the read to another file.
Concurrent writes to the already-open file are not an atomic snapshot.

## Validation and errors

- Only a top-level JSON object is accepted. Arrays, null and scalars are rejected.
  Individual package fields are not schema-validated or normalized. JSON parsing
  retains its normal JavaScript numeric semantics.
- A leading UTF-8 BOM is accepted. Invalid UTF-8 is rejected instead of being
  silently replaced with replacement characters.
- Opened descriptors are checked for regular-file type before reading, then
  closed on success and failure. Nonblocking opens avoid waiting for a FIFO
  writer on systems supporting that flag. Permission errors, descriptor limits,
  I/O failures and close failures propagate rather than appearing as “not found.”
  If reading and closing both fail, the read error takes precedence.
- `PackageJsonError` extends `SyntaxError`, with
  `code: 'ERR_INVALID_PACKAGE_JSON'`, an absolute `path`, and optional `position`.
  The position is a runtime-supplied character offset after BOM removal.
  Diagnostics identify the path and reason without including manifest contents,
  code frames or an original error containing source text.

TypeScript exports `Options`, `ReadResult`, `PackageJson`, `JsonValue` and
`FileURL`. Package fields have JSON value types and need narrowing before use;
reading a file does not establish that its `name` or `version` is a string.
`FileURL` is a structural declaration that accepts real URL instances without
requiring ambient Node or DOM types; the runtime still requires an actual URL.

## Verification

```sh
node --test packages/vread-package-up/test/*.test.cjs
bun test packages/vread-package-up/test
npm run typecheck
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

There are **45 package tests**, including the two original upstream tests with
unchanged assertions. Module loading, AVA registration and fixture setup are
adapted to an isolated built-in test runner. Those two tests verify lookup;
they do not establish metadata-normalization compatibility. Additional tests
cover error propagation and descriptor cleanup, boundaries (including Windows
path semantics), symlinks, FIFOs, path replacement, changing files, malformed
manifests, invalid UTF-8, concurrent large reads, module imports and provenance.

The shared integration gate compares 122 raw-reader results against the pinned
upstream installation. It also loads CommonJS, ESM and nested-package handlers
through Functions Framework's actual loader and serves each handler over HTTP.
An isolated copy of the loader redirects only its dynamic reader import to VPM;
installed framework files and the upstream comparison reader stay unchanged.
[Current shared verification](../../IMPROVEMENTS.md#current-verification) and
[integration coverage](../../IMPROVEMENTS.md#the-integration-gate) are tracked
centrally. These fixtures do not deploy VPM into an application.

## Installation and provenance

Available from the workspace or as a package archive. Run
`bun pm pack --ignore-scripts` in this directory and install
`vread-package-up-0.1.0.tgz` with npm or Bun. The archive contains six files:
source, declarations, package metadata, README, license and provenance.
Tests, original-source fixtures and benchmarks stay in the repository.
Registry publication and automatic substitution are future work.

[PROVENANCE.json](PROVENANCE.json) records the verified upstream archive integrity,
revision and fixture hashes. [LICENSE](LICENSE) retains the upstream MIT notice.

## Benchmarks

```sh
npm --prefix scripts/consumers ci --ignore-scripts
node packages/vread-package-up/bench/compare.cjs
bun packages/vread-package-up/bench/compare.cjs
```

Run from the repository root. `COUNT` sets calls per sample and `OUTPUT` writes a
JSON report. Both implementations use `normalize: false`; measured successful
results are checked for equality. All cases use a temporary local filesystem
with a warm OS cache, and neither implementation caches parsed results.
Outputs are retained in 64 slots and consumed outside timing.

Warm measurements include configuration, filesystem calls, decoding, parsing
and result allocation. The malformed-input case measures rejection and access
to the error message, with different diagnostics: upstream includes a code
frame, while VPM omits source text. The fresh-process case imports the reader and
performs its first async read. It excludes process launch and uses a warm OS
filesystem cache; it does not measure full Functions Framework startup or
application cold starts.

### Results, 2026-10-28

Node 24.22.1 and Bun 1.4.0 on macOS arm64. Three fresh harness processes per
runtime, run sequentially, with eight alternating samples per case (four in each
order). Each warm sample uses 500 calls, or 166 for malformed input. Corpus
warmup uses 100 calls per case/implementation/mode, followed by case warmup of
min(iterations, 100). Values below are medians of the three process medians.

| Operation | Node upstream → VPM (µs) | Bun upstream → VPM (µs) |
| --- | ---: | ---: |
| sync / adjacent manifest | 23.64 → 24.73 | 20.50 → 20.50 |
| sync / four ancestors | 34.59 → 37.92 | 33.97 → 34.62 |
| sync / twelve ancestors | 58.04 → 62.35 | 66.49 → 71.75 |
| sync / absent within boundary | 14.54 → 16.23 | 16.25 → 15.13 |
| sync / file URL | 22.74 → 23.09 | 21.29 → 25.22 |
| sync / skip directory | 27.36 → 29.82 | 30.33 → 28.66 |
| sync / 66 KB UTF-8 manifest | 287.94 → 82.34 | 52.32 → 70.99 |
| sync / malformed diagnostic | 55.17 → 41.40 | 26.33 → 23.23 |
| async / adjacent manifest | 82.71 → 75.20 | 61.12 → 84.54 |
| async / four ancestors | 172.12 → 142.68 | 146.88 → 187.17 |
| async / twelve ancestors | 322.80 → 276.75 | 320.89 → 323.64 |
| async / absent within boundary | 99.49 → 76.63 | 96.86 → 98.52 |
| async / file URL | 88.41 → 75.01 | 72.27 → 82.17 |
| async / skip directory | 97.62 → 135.26 | 86.90 → 149.66 |
| async / 66 KB UTF-8 manifest | 139.57 → 131.19 | 92.28 → 142.49 |
| async / malformed diagnostic | 103.94 → 77.43 | 59.48 → 80.24 |

Each fresh-process sample uses a separate child process per implementation;
eight children per implementation in each of the three harness processes:

| Operation | Node upstream → VPM (ms) | Bun upstream → VPM (ms) |
| --- | ---: | ---: |
| Import and first async read | 29.55 → 1.94 | 21.34 → 6.12 |

Across the three runs, import plus first read takes **92–93% less time on Node**
and **70–72% less on Bun**. This is relevant to the framework’s startup-time
reader call, but is not a measurement of full framework startup. Warm async
adjacent reads take **9–16% less on Node**, while costing **36–59% more on Bun**.
The aggregate Bun difference is about 23 µs per adjacent read.

Warm-read performance is mixed:

- Node sync ancestor searches, absent searches and directory skipping cost
  **6–13% more** across these cases. Adjacent and URL reads are within a few
  percent of upstream. Large UTF-8 sync reads take **70–72% less time**.
- Bun sync URL reads cost **9–22% more** and large UTF-8 reads **12–42% more**.
  Other successful sync cases vary in direction between runs.
- Async directory skipping costs **18–40% more on Node** and **72–128% more on
  Bun**. The async reader opens, checks and closes a nonregular candidate before
  proceeding. Bun’s four-ancestor, URL and large-file reads also cost more;
  twelve-ancestor and absent searches show no consistent change.
- Malformed diagnostics take **23–26% less time synchronously on Node** and
  **4–12% less on Bun**. Async diagnostics take **24–31% less on Node**, but
  **31–40% more on Bun**. They intentionally omit upstream’s source code frame.

Explicit descriptor checks and cleanup, strict decoding, and uncached results
are retained. The main benefit for the current caller is removing import work
and dependencies; this is not a universal filesystem-read speedup. Results depend
on the OS cache, filesystem and runtime.

[Six raw reports](bench/results) retain all samples, checksums, runtime metadata,
the consumer lockfile hash and hashes of the source, provenance, fixture and
harness.
