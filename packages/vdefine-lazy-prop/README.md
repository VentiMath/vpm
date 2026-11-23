# vdefine-lazy-prop

Independent lazy-property initialization, targeting `define-lazy-prop` 3.0.0
and the 2.0.0 interface used by VentiMath's installed `open` 8.4.2 caller.

```js
import defineLazyProperty from 'vdefine-lazy-prop';
const options = defineLazyProperty({}, 'browser', () => locateBrowser());
// The initializer runs on the first read, then this is an ordinary data property.
console.log(options.browser);
```

Assignment before the first read supplies the value without calling the
initializer. Successful initialization is cached even for `undefined` or a
promise. Exceptions leave the accessor in place for a later retry. Properties
are enumerable and configurable; their realized values are writable. Inherited
reads and writes update the defining object, matching upstream's owner semantics.
The callback receives no arguments and no receiver. Symbols, numeric keys,
null-prototype objects and `__proto__` work as ordinary property keys.

A shared value installer avoids one per-property closure. The package has no
runtime dependencies and supplies CJS, ESM and strict declarations. No upstream
executable implementation is shipped. [Benchmarks](bench/README.md) distinguish
measured changes from control noise; this small helper is not an application
startup-speed claim.

The current `open` 11.0.4 and installed 8.4.2 sources pass 32 simulated platform
scenarios, with initializer calls counted and all command/file operations
blocked. Five lifecycle tests and 20,480 generated operations cover failure,
assignment, deletion, redefinition, inheritance and proxy descriptors. Fresh
npm/Bun alias installs and TypeScript 7 consumers pass.

Run `node --test packages/vdefine-lazy-prop/test/*.test.cjs`,
`node scripts/lazy-prop-conformance/contract.cjs`,
`node scripts/lazy-prop-conformance/callers.cjs` and
`node scripts/lazy-prop-conformance/archives.cjs` from the repository root.

Built and verified in the workspace. Publication and application adoption remain
separate. [Provenance](PROVENANCE.json).
