# vjsonfile

Independent JSON file reading and writing, targeting **jsonfile 6.2.1** and
VentiMath's Capacitor configuration callers through fs-extra. There are **zero
package dependencies**. Node 24 and Bun are the runtime targets.

```js
import json from 'vjsonfile';

await json.writeFile('config.json', { enabled: true }, { spaces: '\t' });
const config = await json.readFile('config.json');
```

`readFile` and `writeFile` support Promises or a final callback. Their
`readFileSync` and `writeFileSync` counterparts are synchronous. Encoding strings
and native filesystem options pass through. Reading supports BOM removal,
`reviver`, and `throws`; writing supports `replacer`, `spaces`, `EOL` and
`finalEOL`. An injected `fs` supplies the methods used by the operation.

The `vjsonfile/utils` and `vjsonfile/utils.js` entries expose `stringify` and
`stripBom` for fs-extra's `outputJSON` helpers. Both root and helper entries have
CommonJS, ESM and TypeScript declarations.

Behavior deliberately preserved from upstream:

- Serialization completes before opening a destination, so circular values,
  BigInt and unserializable roots fail without truncating the existing file.
- A newline is appended by default. Indentation and custom line endings are
  opt-in.
- Asynchronous `throws: false` returns `null` for JSON/reviver errors but still
  rejects filesystem errors. Synchronous `throws: false` suppresses both.
- Writes use the requested native filesystem operation. They are not atomic
  replacements or a concurrent-writer transaction.

Changes from upstream:

- Filesystem adapters keep their method receiver (`this`).
- `EOL` is literal text, including `$&`, `$'`, ``$` `` and `$$`; it is not treated
  as a replacement-string instruction.
- Frozen errors thrown by revivers retain their identity. Mutable parse errors
  still include the filename.
- `stripBom` also accepts byte views from injected filesystems, respecting their
  offset and length.
- Native `node:fs` replaces graceful-fs and universalify. There is no global
  filesystem patch or automatic graceful-fs descriptor-exhaustion retry queue.
  Callers that need a particular filesystem policy can inject it.

[Conformance checks](../../scripts/jsonfile-conformance/README.md) cover the 50
unchanged upstream tests, 438 differential cases, focused regressions, and the
unchanged fs-extra 11.3.4/9.1.0 and Capacitor 8.2.0 configuration callers. Packed
install checks exercise the original `jsonfile` import name and both helpers.
[Measurements](bench/README.md) distinguish formatting/adapter cost from native
file reads; no faster Capacitor build is claimed.

This source package is built and verified. Public release and VentiMath adoption
are separate steps.
