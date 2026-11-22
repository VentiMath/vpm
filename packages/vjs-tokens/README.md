# vjs-tokens

Babel 7 uses this tokenizer to highlight build errors. It implements the `js-tokens` 4.0.0 interface with a native global regular expression and no runtime dependencies.

```js
import tokens, { matchToToken } from "vjs-tokens";

const excerpt = "const score = /points/i;";
const highlighted = Array.from(excerpt.matchAll(tokens), matchToToken);
```

CommonJS consumers use `require("vjs-tokens").default` for the expression and `.matchToToken` for classification. Each token carries its original text. Quoted strings, templates and block comments also report whether they closed. A new RegExp cloned from the default export has its own cursor. The v4 contract returns an empty invalid token for empty input. Babel skips empty excerpts before entering its `exec` loop.

The lexical rules follow the ES2018 highlighting convention used by the app’s Babel dependency. Regular expressions and division use the v4 lookahead rules. Template interpolation is opaque and has bounded brace nesting. Babel’s parser determines whether the source is valid.

The conformance suite checks original token spans and classifications on the Babel fixture sources, and compares ANSI output and caret locations through unchanged code-frame 7.29.0 and 7.29.7 and Babel Core 7.29.0. [Benchmark results](bench/results/README.md).
