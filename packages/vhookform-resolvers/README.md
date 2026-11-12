# vhookform-resolvers

An independently written Zod adapter for React Hook Form and `vreact-hook-form`.
The compatibility target is `@hookform/resolvers` 7.0.6, with the application's
5.0.1 adapter also checked. It has no runtime dependencies and does not import
Zod: the caller supplies its schema.

```js
import { zodResolver } from 'vhookform-resolvers/zod';
const form = useForm({ resolver: zodResolver(schema) });
```

Full Zod 3 and 4 schemas are supported: synchronous/asynchronous validation,
transformations, defaults, cross-field refinements, unions, nested objects and
arrays. The default resolver mode is asynchronous; `{ mode: 'sync' }` is for
synchronous schemas. `{ raw: true }` returns a shallow copy of the original
values instead of parsed output. Schema parsing options are passed through.

First/all error modes, field refs, array-level `.root` errors and native browser
validity are covered. The root entry exports `toNestErrors` and
`validateFieldsNatively`. Declarations infer input/output through transforms
without depending on either form library's type package.

Issue traversal does not mutate Zod's issues. Validation failures are taken
from the public safe-parse result; unrelated exceptions propagate. Error paths
reject prototype keys and array indexes above 100,000. Invalid mode/raw options
throw rather than silently selecting a different behavior. These are deliberate
differences from permissive upstream inputs.

This is the Zod adapter used by VentiMath's forms, not the upstream collection
of adapters for other validation libraries. Zod Mini and Standard Schema are
outside this package's verified scope. Zod itself is supplied separately; the independent [vzod](../vzod/README.md)
now covers the application schema language and is tested with this adapter.
Built and tested does not mean released or adopted by the application.

[Conformance and installation checks](../../scripts/resolvers-conformance/README.md)
and [isolated measurements](bench/results/README.md) record the evidence.

On Node 24.22.1 / Bun 1.4.4, the tested Zod 4 invalid nested form takes
58% / 37% less time than the current upstream adapter. Zod 3 invalid forms take
16% less time on Bun; the Node difference and all valid-form differences are
unestablished at this precision. These are isolated adapter workloads, not
application latency measurements.
