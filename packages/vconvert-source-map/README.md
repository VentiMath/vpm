# vconvert-source-map

Reads and writes source-map annotations for JavaScript and CSS, targeting `convert-source-map` 2.0.0. Babel core 7.29.0 in VentiMath reads input maps and embeds the resulting UTF-8 maps in generated output. The package has no runtime dependencies.

```js
import convert from "vconvert-source-map";
const comment = convert.fromObject(map).toComment();
const copy = convert.fromComment(comment).toObject();
```

The converter supports Base64 and URI encoding, line and block comments, external filenames, synchronous and asynchronous readers, and mutable map fields. Access `commentRegex` and `mapFileCommentRegex` on the default or CommonJS API to obtain a fresh pattern each time. Source-map properties with names such as `__proto__` can be added as ordinary own fields. Reader failures include the filename and preserve their original cause.

The conformance fixture compares Babel’s input and output on Node 24 and Bun, including external files and invalid inline maps. [Benchmarks](bench/results/README.md) · [Conformance](../../scripts/source-map-conformance/README.md)
