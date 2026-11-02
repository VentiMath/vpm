# vtiny-invariant

An independently written, zero-dependency implementation of **tiny-invariant
1.3.3**. It asserts truthiness and supports lazy diagnostic messages. The app's
`css-box-model` dependency uses it beneath drag-and-drop.

```js
import invariant from 'vtiny-invariant';
invariant(element, () => 'Expected a calendar element');
```

Truthy values return `undefined`; falsy values throw `Error`. Outside production,
a nonempty diagnostic produces `Invariant failed: <message>`. Otherwise the error
is `Invariant failed`. Lazy diagnostics run only for a nonproduction failure,
and exceptions from them propagate. TypeScript narrows the condition after a
successful assertion.

The module selects its production/development function once at import, preserving
upstream's cached environment behavior. Browser bundlers should replace
`process.env.NODE_ENV`; production bundles discard diagnostic handling. Direct
unbundled browser loading without that environment is not supported. CommonJS
and native ESM entries expose the same function. Node 24 and Bun are tested.

Six original runtime tests, focused contract checks, the actual css-box-model
1.2.1 caller, both browser build modes, packed consumers and TypeScript 7 verify
compatibility. The original Rollup source-text checks are retained for provenance;
VPM uses semantic production/development bundle checks and verifies that its
production bundle discards diagnostic handling. See the
[fixture](../../scripts/invariant-conformance/README.md),
[measurements](bench/results/README.md) and [provenance](PROVENANCE.json).

This small replacement does not claim to fix an upstream runtime defect or improve
application speed. It is built in VPM; application adoption and release are separate.
