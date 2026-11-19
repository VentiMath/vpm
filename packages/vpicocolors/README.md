# vpicocolors

Independent replacement for Picocolors 1.1.1, with no runtime dependencies.
Provides the terminal foreground, background, bright and emphasis formatters,
`createColors(enabled?)`, and `isColorSupported`. Node 24 and Bun 1.4.4 are tested.

```js
import colors from 'vpicocolors';
console.log(colors.red(colors.bold('Invalid stylesheet')));
const plain = colors.createColors(false);
```

Automatic detection preserves upstream's environment, command-line, terminal and
Windows behavior, including the precedence of `NO_COLOR` and `--no-color`.
Disabled formatters stringify values without adding escapes. Browser imports
remain inert even when passed `createColors(true)`.

Nested formatting restores the outer color. Unlike the pinned control, matching
closing escapes at the beginning or after a short prefix also restore that
color. Replacement is flat, so a long sequence does not grow a recursive call
stack. The standard SGR numbers are protocol data; the runtime was written
independently, without importing upstream implementation code.

VentiMath's PostCSS 8.5.8 build diagnostics are the verified caller at app revision
`211e2186`. Unchanged PostCSS source frames, errors and warnings match with this
replacement. This does not claim app adoption.

[Validation](../../scripts/picocolors-conformance/README.md),
[measurements](bench/results/README.md), [provenance](PROVENANCE.json).
