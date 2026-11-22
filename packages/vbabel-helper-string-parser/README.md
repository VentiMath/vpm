# vbabel-helper-string-parser

Babel Types uses this helper to cook the raw text of a template element. The scanner stops at an interpolation or closing delimiter, tracks UTF-16 source positions, normalizes template newlines and records the first invalid escape. Babel uses that location to return a null cooked value for tagged templates.

The package exports `readStringContents`, `readInt` and `readCodePoint` from both module systems. It has no runtime dependencies. The numeric helpers target the 7.29.15 recovery behavior. The conformance suite also runs template construction against VentiMath’s 7.27.1 and 7.29.7 helpers. In a quoted string, a raw newline triggers the caller’s unterminated diagnostic. If that callback returns, the scanner returns the prefix and the location of the newline.

[Template-literal measurements](bench/results/README.md).
