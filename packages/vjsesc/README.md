# vjsesc

Prints JavaScript string and numeric literals for Babel’s generator. It targets the literal APIs of jsesc 3.1.0 and has zero runtime dependencies.

```js
import jsesc from "vjsesc";
jsesc("π ≤ ½", {quotes:"double", wrap:true});
```

Supports quote styles, template interpolation escaping, UTF-16 and ES6 escapes, minimal output, script contexts, numeric bases and JSON strings. JSON mode keeps a double-quoted JSON literal valid across escape options (use `wrap: false` for its body). Signed integers put the sign before the radix prefix. Fractions and non-finite numbers use decimal JavaScript spellings outside JSON mode. Arrays, arbitrary objects and the upstream CLI are outside the Babel interface.

[Measurements](bench/results/README.md) · [Babel checks](../../scripts/source-map-conformance/README.md)
