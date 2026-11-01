# stylis conformance

Baseline: **stylis 4.4.0**, the npm tarball recorded in the
[provenance](../../packages/vstylis/PROVENANCE.json), checked November 1, 2026.
From the `v4.4.0` tag (commit `6ff0e46fa370c714d7c46e1e48076cb65891f1b8`),
`upstream/` retains the release's mocha tests, their setup file and the license.
Files carry a `.txt` suffix and are verified against `SHA256.json` before use.
The fixture pins the original and its test tools at the release's versions
(mocha 9.1.1, chai 4.3.4), and Bootstrap 5.3.8, Bulma 1.0.4, animate.css 4.1.1
and normalize.css 8.0.1 as stylesheets to compare on.

```sh
npm --prefix scripts/stylis-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/stylis-conformance/run.cjs --upstream
node scripts/stylis-conformance/run.cjs
node scripts/stylis-conformance/compare.cjs
node scripts/stylis-conformance/regressions.cjs
```

Repeat each with Bun.

`run.cjs` runs the 113 tests with the library under test as their `../index.js`.
All pass for the original and for vstylis, except that under Bun the original
fails its own `Middleware namespace` test (pinned by name; see below). Ten
`prefix()` calls pass a length other than the length of the property's name
(`prefix('mask-mode:none;', 10)`); stylis selects properties by a hash of that
length and the name's first four characters, which happens to match for those
calls, while vstylis selects them by name. Both libraries run with the names'
lengths. One assertion, that `align-self:flex-start;` with length 12 is not
prefixed, held only because the hash missed: the `flex-box` test prefixes the
same declaration with its length, so the assertion is removed.

`compare.cjs` builds a reference from the pinned original's sources with
vstylis's intentional changes applied as patches (each must apply exactly once):
prefix rules by property name, a declaration's property ending at its first
colon, comments keeping their text at the end of the input, and `namespace`
without its engine-dependent case label. vstylis must then produce the same
element trees (types, values, selectors, lengths, lines and columns) and the
same `stringify`, `prefixer`, `rulesheet` and `namespace` output for every
input: the 12 unminified stylesheets of the pinned packages and 20,000 generated
nested inputs (nesting, `&`, at-rules, comments, strings, escapes, custom
properties, functions). There are no differences.

`regressions.cjs` reproduces each change with the original: invented prefixed
declarations for properties that share a hash with a prefixed one (including
`-ms-grid-row-span:-97`), a column's IE span written as a row span,
`mask-composite: subtract` left unconverted, a property split at the last colon,
a comment at the end of the input truncated, and (under Bun) `namespace` scoping
`a:not([href])` as `a.scope:not.scope([href])` because JavaScriptCore compares a
case label that assigns the switched variable with the assigned value.
