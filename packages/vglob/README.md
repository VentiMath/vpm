# vglob

Independent filesystem pattern search for VentiMath's build and cleanup tools,
targeting glob **14.0.6**. The installed glob **13.0.6** and **10.5.0** contracts
are checked alongside the current release. Node 24 and Bun are the runtime targets.

```js
const { glob, globSync, Glob } = require('vglob');
const files = await glob('build/**/*.js', { nodir: true, absolute: true });
const cached = new Glob('src/**/*.ts', { ignore: '**/generated/**' });
const first = cached.walkSync();
const again = await cached.walk();
```

`glob`, `globSync`, sync/async iterators, streams, `Glob`, `Ignore`, `hasMagic`,
`escape`, `unescape` and their root aliases are available through CommonJS and
ES modules. `vglob/raw` exposes the same implementation. Streams use object mode,
respect backpressure and release traversal state on destruction. Reusing a
`Glob` shares its filesystem cache; it does not watch for filesystem changes.

Patterns support braces, extglobs, globstars, case/Unicode options, roots and
relative/absolute output. Ignore predicates can prune subtrees before reads.
`withFileTypes` returns VPM Path objects; `stat`, `realpath`, `mark`, `nodir`,
`maxDepth`, abort signals and custom filesystem methods are supported.

The implementation interprets segment states with an explicit work stack and
shares matching logic between synchronous and asynchronous drivers. Its only
direct dependencies are **vminimatch, vpath-scurry and vminipass**. No upstream
glob runtime is copied or loaded.

Scope and deliberate differences:

- With `follow: true`, a symbolic-link cycle stops when a directory's canonical
  path repeats within that traversal branch. Separate aliases still produce
  matches. Upstream can continue cyclic aliases until filesystem link limits.
- Match ordering is unspecified. This implementation visits pattern arrays in
  order; callers should sort when they require a particular order.
- Brace expansion defaults to 1,000 alternatives, including ignore patterns.
  Matching uses VPM's bounded interpreter, with its documented work limits.
- The old callback API, command-line program and upstream private Pattern,
  Processor and Walker internals are outside this package's scope.
- Actual caller checks run on POSIX hosts. Windows path options are implemented
  through VPM's Windows path support; native Windows filesystem acceptance is
  not claimed.

The unchanged **rimraf 6.1.3 and 5.0.10** runtime callers pass cleanup checks
using this package. Deletion tests operate only on temporary fixtures. This is
built and verified, **not yet released or adopted by VentiMath**.

See [conformance](../../scripts/glob-conformance/README.md),
[measurements](bench/README.md) and [provenance](PROVENANCE.json).
