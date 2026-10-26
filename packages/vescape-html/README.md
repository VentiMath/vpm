# vescape-html

Escape HTML text with zero runtime dependencies, bundled TypeScript declarations,
and CommonJS/ES module import support. Requires Node.js 20+ or Bun.

`vescape-html` is VPM's counterpart to `escape-html` 1.0.3. It preserves the
escaping and input-conversion contract while skipping long unchanged spans more
efficiently. It is used for the same kinds of redirect and error-page text found
in Express, `finalhandler`, `send`, and `serve-static`.

## Use

```js
const escapeHtml = require('vescape-html');

escapeHtml('a & b < c'); // 'a &amp; b &lt; c'
escapeHtml('"quoted"'); // '&quot;quoted&quot;'
escapeHtml("it's");     // 'it&#39;s'
```

ES modules can use `import escapeHtml from 'vescape-html'`.

## API

### `escapeHtml(value)`

Converts the input using `'' + value`, then returns a string with these replacements:

| Character | Output |
| --- | --- |
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

Everything else is preserved, including Unicode, unpaired UTF-16 surrogates,
control characters, and whitespace. Existing entities are escaped again:
`escapeHtml('&amp;')` returns `'&amp;amp;'`. Apply escaping at the output boundary;
the function is not idempotent.

Input conversion deliberately matches upstream. Missing input becomes
`'undefined'`; `null` becomes `'null'`. Ordinary objects try `valueOf()` before
`toString()`, and `Symbol.toPrimitive` receives the `'default'` hint. Symbols and
unconvertible objects throw `TypeError`; custom conversion errors propagate.
Changing this to `String(value)` would alter those behaviors.

Use this for HTML text and ordinary attribute values enclosed in quotes. Script,
style, event-handler, and URL contexts have additional requirements; this function
is not an HTML sanitizer, URL validator, or general-purpose injection defense.

## Improvements and compatibility

- Skips long unchanged spans using native regular-expression search, instead of
  scanning every remaining character in JavaScript after the first escape.
- Scans short gaps and adjacent escapes in a simple loop, limiting repeated
  regexp calls on densely escaped input.
- Avoids creating a match array for the initial search.
- Adds declarations without requiring a types package in consuming projects.
- Documents and tests the full coercion and escaping contract.

No upstream escaping bug was identified in this work. Output and coercion
semantics are retained. The gains are targeted performance improvements, clearer
contracts, types, and verification, rather than a stronger escaping guarantee.

## Validation

Tests cover all 65,536 UTF-16 code units, all short combinations of special
characters and selected plain/surrogate characters, 2,000 generated strings,
long sparse and dense inputs, scanner boundaries, input coercion, and reentrant
conversion. Results are compared with an independent character mapper and the
unchanged upstream implementation. The upstream fixture is excluded from archives.

The repository's [integration gate](../../scripts/integration.cjs) aliases this
package into ventimath's pinned Cloud Functions stack (Functions Framework 5.0.2,
firebase-functions 7.4.0, Express 5.2.1, send 1.2.1, serve-static 2.2.1) and runs
real HTTP checks on Node and Bun in CI. It covers HTML redirect bodies, final error and
404 pages, and `serve-static` directory redirects through this package.

## Performance

From the repository root:

```sh
node packages/vescape-html/bench/compare.cjs
bun packages/vescape-html/bench/compare.cjs
```

The benchmark varies 32 inputs per workload, checks matching output, consumes
results, and alternates implementation order. Each result is the median of seven
samples of 50,000 calls after warmup. It measures individual escaping calls, not
HTTP throughput or request latency.

One local run on October 26, 2026. Each cell is **escape-html / vescape-html** in
nanoseconds per call; lower is better.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Short plain text | 22 / 23 | 18 / 34 |
| Short redirect text | 70 / 59 | 70 / 44 |
| Short markup | 208 / 206 | 152 / 162 |
| 2 KB plain text | 120 / 119 | 113 / 115 |
| 2 KB, early escape | 4,079 / 199 | 2,592 / 166 |
| 2 KB, late escape | 173 / 161 | 163 / 157 |
| 2 KB, sparse escapes | 4,359 / 946 | 2,876 / 678 |
| 1 KB, dense escapes | 5,938 / 6,434 | 5,019 / 4,877 |
| Unicode with escapes | 2,530 / 2,921 | 1,631 / 1,940 |

Long sparse text benefits most: roughly 4–5 times faster for the mixed sparse
case, and 16–20 times faster with one early escape. Short plain text was slower
on Bun in this run; dense Node input and the Unicode workload also regressed.
Results vary with runtime, warmup, and garbage collection. There is no universal
speedup or measured application-level performance gain.

## Install from this repository

From `packages/vescape-html` in a VPM checkout:

```sh
bun pm pack
```

Then, in the consuming project:

```sh
bun add /absolute/path/to/vpm/packages/vescape-html/vescape-html-0.1.0.tgz
```

The package has not been published to a registry.

## Origin and license

Derived from [`escape-html` 1.0.3](https://github.com/component/escape-html/tree/v1.0.3),
commit `7ac2ea3977fcac3d4c5be8d2a037812820c65f28`, by TJ Holowaychuk,
Andreas Lubbe, and Tiancheng "Timothy" Gu. MIT licensed; upstream notices are
preserved in [LICENSE](LICENSE).
