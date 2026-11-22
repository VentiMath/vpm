# vbabel-code-frame

Formats Babel build diagnostics using the VPM tokenizer, identifier checks and terminal colors. This independent implementation targets code-frame 7.29.7 and the app’s 7.29.0 caller.

```js
import { codeFrameColumns } from "vbabel-code-frame";

codeFrameColumns("const score = ;", {
  start: { line: 1, column: 15 }
}, { message: "Expected an expression", forceColor: true });
```

`highlight(source)` adds JavaScript and JSX syntax colors. `codeFrameColumns` adds source excerpts, line numbers, caret ranges and optional messages. Locations use one-based lines and columns. Options include context lines, forced or detected color, and an initial line-number offset. The deprecated default export accepts separate line and column arguments and warns once.

The VPM implementation positions caret spacing from raw source text, keeping tabs aligned when highlighting adds escape codes. Multiline ranges use each line’s own length. These cases intentionally correct upstream output. Out-of-range columns use the same bounded spacing in colored and plain output.

Tests compare Babel’s two code-frame versions and run unmodified Babel Core against this formatter. The original upstream suite can be run through the conformance script. [Measurements](bench/results/README.md).
