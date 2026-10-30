# Path matcher conformance

Private, locked controls for `vpath-expression-matcher`. Baselines checked
October 30, 2026: path-expression-matcher 1.6.2, fast-xml-parser 5.11.2 and
fast-xml-builder 1.3.1. Storage 8.4.0 comes from the retry-request fixture.
Upstream packages and retained tests are excluded from runtime archives.

```sh
npm --prefix scripts/path-matcher-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/path-matcher-conformance/run.cjs --upstream
node scripts/path-matcher-conformance/run.cjs
node scripts/path-matcher-conformance/regressions.cjs
node scripts/path-matcher-conformance/callers.cjs --upstream
node scripts/path-matcher-conformance/callers.cjs
```

Repeat with `bun`. Package tests run the VPM retained suite; the root integration
gate runs actual callers. CI additionally runs unchanged upstream controls and
paired regressions on both runtimes.

## Retained tests and explicit adaptations

Source, declarations, license and all five upstream test files are retained
at commit `2f933682011d047b6c62d37376f2f433d3f02826`, with `.txt` extensions
and normalized trailing EOF whitespace. SHA-256 checks cover all snapshots;
installed package sources must match the retained source. The runner removes
imports in memory and isolates each original top-level test block, preserving
its helper assertions and running later cases even if an earlier one fails.

All **131 blocks** run. The unchanged 1.6.2 control passes **329 assertions** and
has exactly six expected failing blocks in `readOnly_test.js`: 3 expects a fresh
proxy despite the documented cached view; 16 and 35 expect an absent snapshot
method; 27 requires an engine-specific error message; 28 expects deletion of an
inherited getter to throw; 32 expects an absent `path` property. The runner checks
this precise failure set. These are recorded upstream inconsistencies, not
silently skipped tests or assertions that pass upstream.

The VPM run passes **338 assertions**, changing eight assertions in memory:

- `expression_set_test.js` cases 9, 12, 18, 19 and 23 now accept a zero-level deep
  wildcard, as documented by upstream. Each exact assertion is guarded before
  negation is removed.
- `readOnly_test.js` case 3 requires the same cached view on repeated reads.
- Cases 27 and 28 still require `TypeError`, without a literal `read-only`
  substring in the native runtime's error message.

Snapshots remain unchanged. VPM's inspection `path` and `snapshot()` extensions
satisfy the remaining stale view expectations. Focused package tests separately
verify the corrected contracts. They include 60,000 seeded comparisons with a
full dynamic-programming reference that shares no matching implementation, a
15,000-level traversal, and state-isolation/atomicity checks.

`regressions.cjs` has 13 upstream/VPM discriminators: zero-level wildcards,
root anchoring, repeated anchors, bracket separators, multi-character separators,
set identity, inherited attributes, namespace counters, view escapes, snapshot
aliases, compiled-pattern mutation, seal bypasses and unsupported `:last`.

## Real XML and Storage callers

Published XML CJS bundles embed their dependencies, so an outer package alias
would not exercise this replacement. The fixture copies current parser/builder
source to a temporary directory and changes only matcher imports and the parser's
builder re-export. Exact import counts and pinned package versions guard edits.
A shared adapter preserves constructor identity and counts actual operations;
its VPM exports are obtained through the root integration gate's counting proxies.

Seven parser modes compare results with upstream. Further checks cover live
read-only callback views and sibling counters, precompiled stop expressions,
parser reset/reuse, root stop-node and dotted-attribute corrections, and four
builder modes including ordered objects. Storage's actual
`TransferManager.uploadFileInChunks` runs twice with string/Buffer XML responses;
all six mocked HTTP requests, upload hashes, part data and completion XML are
checked. The VPM run records 133 pushes, 133 pops, 23 matches, 14 resets and
11 expression constructions. Storage itself reaches push/pop on both uploads.
Network transport is mocked; XML and multipart implementations run unchanged.

The fixture verifies these caller paths, not the complete parser/builder API.
It does not change application dependencies or their namespace normalization.
