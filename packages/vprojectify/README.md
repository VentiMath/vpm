# vprojectify

Literal `{{projectId}}` substitution targeting **@google-cloud/projectify 6.2.1**
on **Node 24+ and Bun**. Zero runtime dependencies. Verified through Storage
**8.4.0**'s request decorator for URLs, query records, JSON and multipart bodies.

```js
const {replaceProjectIdToken, MissingProjectIdError} = require('vprojectify');
const request = {
  uri: 'https://example.test/projects/{{projectId}}/items',
  labels: {project: '{{projectId}}'}
};
replaceProjectIdToken(request, 'my-project'); // same object, replaced fields
```

Both exports support CommonJS and native ESM. Strings replace every token with
literal text: replacement metacharacters such as `$&` have no special meaning.
Inserted text is never scanned again. A project ID is required only when an
input string contains a token. Missing, empty and placeholder IDs throw
`MissingProjectIdError`; other non-string IDs throw TypeError.

Traversal covers arrays and records whose prototype is Object.prototype or
null. Only own enumerable string-keyed data fields are visited. Getters,
setters and inherited fields are not evaluated; shadowed `hasOwnProperty` and
prototype-shaped data keys are handled safely. Class instances, streams,
buffers, typed arrays and other objects remain opaque and retain identity.

Ordinary records are mutated and retain identity, matching the caller-facing
upstream convention. Arrays are copied into ordinary arrays, preserving holes
and own enumerable data fields; nested records still retain identity. Cycles
and shared references are retained, and traversal uses an explicit stack so
deep input does not exhaust the JavaScript call stack. Unchanged frozen data is
accepted; a changed read-only record field throws. Mutation is not transactional
if a later field fails.

All **five upstream cases** run with original controls on Node and Bun, plus
**14 focused cases** in the root suite. See [Storage caller checks and independent bug controls](../../scripts/cloud-utils-conformance/README.md),
[provenance](PROVENANCE.json), and [paired benchmarks](bench/results/README.md).
