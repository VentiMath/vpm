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

For manifests of at least 4 KiB on Bun, a fatal UTF-8 decoder combines validation
and conversion into one pass. Async reads queue the descriptor close before
parsing these larger buffers, then wait for cleanup before settling. Read/close
errors retain their precedence over parse errors. Smaller reads and the Node
filesystem/decoding path retain their existing behavior; all I/O remains async
in the async reader, and no filesystem or result cache is introduced.

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

There are **49 package tests**, including the two original upstream tests with
unchanged assertions. Module loading, AVA registration and fixture setup are
adapted to an isolated built-in test runner. Those two tests verify lookup;
they do not establish metadata-normalization compatibility. Additional tests
cover error propagation and descriptor cleanup, boundaries (including Windows
path semantics), symlinks, FIFOs, path replacement, changing files, malformed
manifests, invalid UTF-8, concurrent large reads, module imports and provenance. Additional cleanup tests hold the close callback
open to verify that success and parse failures remain pending until cleanup
finishes, and that close errors take precedence. Strict-decoding tests cover
overlong sequences, lone continuation bytes, truncated sequences, surrogate
encodings, out-of-range code points and recovery after a failed decode.

The shared integration gate compares 122 raw-reader results against the pinned
upstream installation. It also loads CommonJS, ESM and nested-package handlers
through `vfunctions-framework`'s actual loader and serves each handler over HTTP.
The VPM framework imports this reader directly; the previous dynamic-import
adapter is no longer needed. Installed upstream comparison files stay unchanged.
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

### Results after the Bun decoding optimization, 2026-10-28

Node 24.22.1 and Bun 1.4.0 on macOS arm64. Three fresh harness processes per
runtime, run sequentially. The harness compares upstream, the unchanged VPM
implementation from `19a2461`, and the current implementation in all six execution
orders; each appears twice in each position. Each warm sample uses 500 calls,
or 166 for malformed input. Corpus warmup uses 100 calls per
case/implementation/mode, followed by case warmup of min(iterations, 100).
Values below are medians of the three process medians.

| Operation | Node upstream → VPM (µs) | Bun upstream → VPM (µs) |
| --- | ---: | ---: |
| sync / adjacent manifest | 23.38 → 23.89 | 23.97 → 22.77 |
| sync / four ancestors | 34.71 → 37.23 | 33.62 → 34.54 |
| sync / twelve ancestors | 59.69 → 62.61 | 53.67 → 62.27 |
| sync / absent within boundary | 14.38 → 16.62 | 12.82 → 13.18 |
| sync / file URL | 23.24 → 23.31 | 21.36 → 21.95 |
| sync / skip directory | 27.33 → 30.10 | 26.96 → 28.02 |
| sync / 66 KB UTF-8 manifest | 278.75 → 69.76 | 52.58 → 55.85 |
| sync / malformed diagnostic | 55.52 → 41.80 | 25.20 → 24.09 |
| async / adjacent manifest | 98.84 → 82.93 | 75.40 → 111.10 |
| async / four ancestors | 189.90 → 155.85 | 161.39 → 188.38 |
| async / twelve ancestors | 385.84 → 314.23 | 354.28 → 397.30 |
| async / absent within boundary | 115.21 → 98.47 | 114.11 → 113.31 |
| async / file URL | 98.89 → 83.98 | 67.61 → 99.59 |
| async / skip directory | 112.92 → 128.75 | 83.73 → 158.41 |
| async / 66 KB UTF-8 manifest | 150.35 → 136.97 | 102.66 → 132.90 |
| async / malformed diagnostic | 119.84 → 92.70 | 72.48 → 102.18 |

The Bun change improves the larger-file async case in all three runs:

| Bun / 66 KB UTF-8 manifest | Previous VPM → current VPM (µs) | Per-run time change |
| --- | ---: | ---: |
| sync | 68.35 → 55.85 | −18% to +5% |
| async | 149.34 → 132.90 | **10–16% less** |

The sync median improves, but one run regresses; a consistent sync gain is not
established. Async larger-file reads remain **14–30% slower than upstream**.
Small adjacent async reads improve by only 1–3% against the previous VPM build
and remain **30–49% slower than upstream**. This is a partial optimization, not
a resolution of the small-file regression.

The initial cost comes from separate async open, descriptor-stat, read and close
operations. Upstream stats a path and then uses path-based `readFile`, letting
Bun perform opening, reading and closing inside one native operation. VPM’s
descriptor check verifies the file actually being read even if a path is replaced
between calls. The [Bun 1.4.0 filesystem wrapper](https://github.com/oven-sh/bun/blob/bun-v1.4.0/src/js/node/fs.ts)
shows these separate native async calls. The optimization retains them and
reduces CPU work for larger inputs instead: one-pass strict UTF-8 decoding and
parsing while the close is pending. No blocking I/O or cached results are used.

Other measured tradeoffs remain visible:

- Node sync ancestor/absent/directory searches cost 3–19% more than upstream.
  The large sync case takes about 75% less time than upstream but costs 2–4% more
  than the previous VPM implementation in this run set.
- Async directory skipping costs 14–16% more than upstream on Node and 82–90%
  more on Bun. The reader still opens, checks and closes the nonregular candidate.
- Bun’s short malformed async case costs 1–12% more than the previous VPM build
  and 26–53% more than upstream. Its short-input path retains the original
  validation and error policy; no malformed-input speedup is claimed.
- Other before/after differences are available in the raw samples. Filesystem
  timings vary, and improvements to unchanged paths should not be inferred from
  their aggregate medians.

Each fresh-process sample uses a separate child per implementation; six children
per implementation in each of the three harness processes:

| Operation | Node upstream → VPM (ms) | Bun upstream → VPM (ms) |
| --- | ---: | ---: |
| Import and first async read | 26.44 → 1.95 | 19.69 → 6.39 |

Import plus first read still takes about **93% less time on Node** and
**66–70% less on Bun** than upstream. There is no consistent startup improvement
over the previous VPM build. Process launch is excluded and the OS filesystem
cache is warm; these are reader measurements, not full framework cold starts.

[Six current raw reports](bench/results/optimized) retain every sample, checksums,
runtime metadata and hashes of the source, previous implementation, consumer
lockfile, provenance, fixture and harness. The [initial reports](bench/results)
remain available with their original source/harness hashes.
