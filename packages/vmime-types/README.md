# vmime-types

MIME lookup and Content-Type helpers with immutable mappings and correct charset
parameter recognition for valid media-type syntax. A counterpart to
`mime-types` 3.0.2 for Node.js 20+ and Bun, with one runtime dependency:
[`vmime-db`](../vmime-db).

## Use

```js
const mime = require('vmime-types');

mime.lookup('assets/app.js');       // 'text/javascript'
mime.contentType('json');           // 'application/json; charset=utf-8'
mime.extension('image/jpeg');       // 'jpg'
mime.charset('text/html');          // 'UTF-8'
mime.lookup('file.unknown');        // false
mime.contentType('text/html; CHARSET=ascii'); // unchanged; no duplicate charset
```

ES modules can use `import mime from 'vmime-types'`. TypeScript declarations are
included and require no separate types package.

## API

| Export | Behavior |
| --- | --- |
| `lookup(pathOrExtension)` | Looks up the final extension; accepts bare or dotted extensions and paths. Returns a type or `false`. |
| `contentType(typeOrExtension)` | Resolves an extension or parses a type, appending its default charset if no charset parameter is present. Returns a header or `false`. |
| `charset(type)` / `charsets.lookup(type)` | Returns the catalog default charset, or `UTF-8` for other valid `text/*` types, or `false`. It does not return an explicit parameter's value. |
| `extension(type)` | Returns the first associated extension, or `false`. |
| `types` | Readonly extension → preferred type dictionary. |
| `extensions` | Readonly type → readonly extension array dictionary. |

All functions return `false` for non-string inputs without coercing them.
Unknown, syntactically valid types are preserved by `contentType()`.
Type/extension matching is case-insensitive; emitted explicit types and existing
parameters retain their original spelling and spacing.

`lookup()` retains upstream's native platform path behavior, including dotfiles,
trailing separators, and the final extension. It does not parse URLs, remove
queries/fragments, or inspect file contents. Use `lookup()` for paths;
`contentType()` treats a string containing `/` as a media type, matching upstream's
input dispatch.

## Improvements and deliberate differences

- Charset names are recognized as whole, case-insensitive parameter names.
  `text/html; CHARSET=ascii` no longer receives a second charset.
- Quoted strings, escapes, and semicolons are parsed. `text/html; note="charset"`
  and `text/html; note="a; charset=ascii"` receive the missing default charset;
  neither note counts as a charset parameter.
- `charset()`, `extension()`, and explicit-type `contentType()` parse the
  entire input when it is valid media-type syntax. Malformed parameters,
  unterminated quotes, whitespace around `=`, extra trailing text, and duplicate
  charset parameters fall back to upstream's behavior: the leading type is read
  and the original string is passed through. Express 5 passes every
  `res.set('Content-Type', value)` through `contentType()`, so rejecting such
  input would emit a `false` header. Empty semicolon-separated members and
  space/tab OWS are valid. Other duplicate parameter names remain unchanged.
- Tables, extension arrays, helper aliases, and exported methods are immutable.
  Consumers needing custom mappings must keep their own overrides. Dictionaries
  have null prototypes. The internal upstream `_extensionConflicts` diagnostic
  is omitted; it is not part of the supported API.
- Extension conflicts use exactly upstream 3.0.2's scoring and tie break, with
  each candidate score calculated once. Temporary legacy comparison work is
  removed. Known default Content-Type strings are prepared once; bare and dotted
  extensions have a direct lookup path.

Parameter handling follows [HTTP media-type and parameter syntax in RFC
9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.3.1). This parses
structure; it does not check the meaning of arbitrary parameters or whether a
claimed type matches a file. Charset labels are preserved without registry validation.

Every current mapping and default matches `mime-types` 3.0.2 with `mime-db`
1.54.0, including `.js` → `text/javascript`, `.xml` → `application/xml`, and
`.mp4` → `video/mp4`. This is not a promise to preserve older `mime-types` 2.x
or `mime` 1.x mapping choices.

## Validation

Nine tests cover all 1,239 extension choices, all 2,522 types with ordinary header
variants, 4,000 generated paths, quoted-parameter combinations, malformed inputs,
and mutation attempts. Comparisons use the unchanged upstream source and scoring
with the exact pinned data snapshot, loaded separately for isolation.

Optional integration against an existing Express 5 installation:

```sh
node scripts/mime-integration.cjs /path/to/node_modules
bun scripts/mime-integration.cjs /path/to/node_modules
```

Express 5.2.1, send 1.2.1, and serve-static 2.2.1 passed 23 real HTTP checks on
Node and Bun: static content types, GET/HEAD, byte ranges, downloads, response
types, content negotiation, and JSON parsing. The script also checks `type-is`
and `accepts`, replacing all three installed copies of `mime-types` only inside
the process. It does not alter application dependencies. The older Express 4
static stack still uses `mime` 1.x and is not replaced by this integration.

## Performance

From the repository root:

```sh
node packages/vmime-types/bench/compare.cjs
bun packages/vmime-types/bench/compare.cjs
node packages/vmime-types/bench/startup.cjs
bun packages/vmime-types/bench/startup.cjs
```

One local run on October 26, 2026. Cells are **mime-types / vmime-types** in median
nanoseconds per call: seven alternating samples of 50,000 calls after warmup,
checking equal outputs and consuming results. The baseline is unchanged 3.0.2
with the same data. Startup measures first require, including the database, in
11 fresh processes per implementation with warm filesystem caches; process
creation and fixture preparation are excluded.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Bare extension lookup | 84 / 27 | 151 / 18 |
| Dotted extension lookup | 90 / 61 | 172 / 88 |
| Full path lookup | 136 / 153 | 187 / 180 |
| Content-Type from extension | 182 / 41 | 258 / 21 |
| Content-Type from plain type | 103 / 25 | 86 / 14 |
| Content-Type with parameters | 119 / 195 | 124 / 255 |
| Default charset | 77 / 47 | 62 / 33 |
| Default extension | 71 / 45 | 57 / 37 |
| First require (milliseconds) | 7.403 / 7.457 | 10.149 / 6.686 |

The common `send` operation, `contentType(extension)`, was about **4.4× faster
on Node and 12.3× faster on Bun**. Full parsing made parameterized headers
**63–105% slower**, and full-path lookup was **13% slower on Node**. Database
freezing and prepared headers add initialization work and storage; startup was
roughly unchanged on Node in this run. Results vary across runtimes and machines.
No application throughput, latency, memory, or general security gain is claimed.

## Install from this repository

Run `bun pm pack` in `packages/vmime-db` and `packages/vmime-types`. In the
consuming project's manifest:

```json
{
  "dependencies": {
    "vmime-types": "file:/absolute/path/to/vpm/packages/vmime-types/vmime-types-0.1.0.tgz"
  },
  "overrides": {
    "vmime-db": "file:/absolute/path/to/vpm/packages/vmime-db/vmime-db-0.1.0.tgz"
  }
}
```

Then run `bun install`. Workspace references are rewritten to exact `0.1.0`
dependencies in the archive. Neither package has been published by VPM to a
registry; the override resolves the unpublished transitive dependency locally.

## Origin and license

Derived from [`mime-types` 3.0.2 at commit
29a0302](https://github.com/jshttp/mime-types/tree/29a0302d799933a45384892df0722f3c5bb1b033).
Source, scoring, and original license are preserved as test fixtures. Data
provenance is documented in [`vmime-db`](../vmime-db). MIT licensed, with upstream
notices preserved in [LICENSE](LICENSE).
