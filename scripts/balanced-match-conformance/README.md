# Balanced delimiter and caller verification

Controls are balanced-match 5.0.0 (current target), 4.0.4 and 1.0.2; unchanged
brace-expansion 5.0.4/2.0.2 and minimatch 10.2.4 exercise the actual build-tool
call path. Their pinned registry code stays in the test fixture only.

```sh
npm --prefix scripts/balanced-match-conformance ci --ignore-scripts
node --test packages/vbalanced-match/test/*.test.cjs
bun test packages/vbalanced-match/test
node scripts/balanced-match-conformance/callers.cjs
bun scripts/balanced-match-conformance/callers.cjs
node scripts/balanced-match-conformance/archives.cjs
```

The generated cases cover 16,400 input/delimiter combinations against each of
three controls. Separate tests cover regex flags, foreign-realm expressions,
100,000-deep incomplete groups, UTF-16 offsets and deliberate empty-delimiter
differences. Caller checks replace only the delimiter dependency. Fresh and
frozen npm/Bun archives check Node/Bun execution, CJS/ESM identity and strict
TypeScript 7 NodeNext/Bundler consumers without DOM declarations.
