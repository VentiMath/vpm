# vstatuses

HTTP status codes, reason phrases, and category tables with zero runtime
dependencies. A counterpart to `statuses` 2.0.2 for Node.js 20+ and Bun, with
bundled TypeScript declarations and CommonJS/ES module imports.

## Use

```js
const status = require('vstatuses');

status(404);                // 'Not Found'
status('404');              // 'Not Found'
status('not found');        // 404
status.message[418];        // "I'm a Teapot"
status.empty[204];          // true
status.empty[200];          // undefined
```

ES modules can use `import status from 'vstatuses'`.

## API and compatibility

`status(number)` returns a known code's reason phrase. `status(string)` accepts
an exact three-digit code or a case-insensitive reason phrase. Unknown values
throw `Error`; other input types throw `TypeError` without coercion.

The data and phrase spellings exactly match the pinned upstream version. Numeric
strings must be canonical: `'200garbage'`, `'200.9'`, `'0200'`, `'+200'`, and
whitespace-padded codes are rejected. Upstream accepts these through `parseInt`.
Unknown numeric properties in the tables return `undefined`.

| Property | Contents |
| --- | --- |
| `message` | Numeric code → reason phrase |
| `code` | Lowercase reason phrase → numeric code |
| `codes` | Sorted array of known codes |
| `redirect` | `true` for 300, 301, 302, 303, 305, 307, 308 |
| `empty` | `true` for 204, 205, 304 |
| `retry` | `true` for 502, 503, 504 |

All tables and the code list are frozen, and their exported references cannot be
replaced. Dictionary prototypes are `null`, so inherited names such as
`constructor` cannot appear as entries. These are deliberate compatibility
changes: code that modifies upstream tables must keep its custom data separately.
The retry table preserves upstream classifications; it does not decide whether a
particular request can be retried safely.

## Improvements and validation

- Strict numeric strings avoid silently accepting malformed inputs.
- Immutable data prevents one consumer from altering shared status information.
- Prototype-free dictionaries give predictable missing-key lookups.
- Declarations distinguish the function's return types and readonly tables.

Tests compare every status, reason phrase, and category with upstream, exercise
invalid codes and mutation attempts, and check generated valid inputs. The
unchanged upstream source and data are test-only fixtures. The repository's [integration gate](../../scripts/integration.cjs) aliases this package into ventimath's pinned Cloud Functions stack (Functions Framework 5.0.2, firebase-functions 7.4.0, Express 5.2.1, send 1.2.1, serve-static 2.2.1) and runs real HTTP checks on Node and Bun in CI.

## Performance

From the repository root:

```sh
node packages/vstatuses/bench/compare.cjs
bun packages/vstatuses/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **statuses / vstatuses**, median
nanoseconds per call over seven samples of 50,000 calls after warmup. The
benchmark varies inputs, verifies equal results, consumes outputs, and alternates
implementation order. Lower is better.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Numeric code | 12 / 28 | 66 / 45 |
| Numeric string | 16 / 58 | 40 / 42 |
| Reason phrase | 133 / 109 | 93 / 97 |
| Direct message table | 9 / 28 | 8 / 19 |

**This is primarily an integrity and API improvement.** Frozen tables and stricter
validation have a measured cost, especially on Node. Direct table lookup was
slower on both runtimes in this run. No startup, memory, or application throughput
improvement is claimed. Microbenchmark results vary across runs and runtimes.

## Install from this repository

Run `bun pm pack` in `packages/vstatuses`, then in a consuming project:

```sh
bun add /absolute/path/to/vpm/packages/vstatuses/vstatuses-0.1.0.tgz
```

This package has not been published by VPM to a registry.

## Origin and license

Derived from [`statuses` 2.0.2](https://github.com/jshttp/statuses/tree/33ec007ae094c35edb35d9edd293b9524b3adcb9),
by Jonathan Ong and Douglas Christopher Wilson. Source and `codes.json` are
verified against that commit. MIT licensed; upstream notices are preserved in
[LICENSE](LICENSE).
