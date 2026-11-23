# vshebang-regex

Independent shebang-line matching targeting **shebang-regex 4.0.0**, compared
with the app's **3.0.0**. Used beneath `shebang-command` and `cross-spawn` in the
current VentiMath tooling graph. No runtime dependencies.

```js
import shebang from 'vshebang-regex';
shebang.exec('#!/usr/bin/env node\nconsole.log(1)')[1]; // '/usr/bin/env node'
```

Exports a shared RegExp through CommonJS and ESM. It matches only at the start
of the input, captures the complete first-line body (including an empty one),
and stops at CR, LF, Unicode line separator or paragraph separator. No global
or multiline state is introduced. No prefix trimming, interpreter validation,
command execution or file access occurs in the package. RegExp source spelling
differs; match arrays and caller behavior are the compatibility contract.

[Conformance](../../scripts/shebang-regex-conformance/README.md) covers 8,192
script cases, line boundaries, long input, exact unchanged command extraction
and cross-spawn file-reader callers. [Benchmarks](bench/README.md) measure
isolated matching only. Built and tested, not yet published or app-adopted.
