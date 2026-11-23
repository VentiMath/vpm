# Shebang regexp conformance

Controls: shebang-regex 4.0.0 and application 3.0.0. The unchanged
shebang-command 2.0.0 and cross-spawn 7.0.6 file-reader are loaded with only the
leaf dependency replaced. Tests create temporary files and execute no commands.

8,192 generated scripts compare full match arrays, test and String.match results.
Boundaries include CR/LF/Unicode line terminators, empty bodies, BOMs, marker
position, surrogate code units and long lines. Packed tests install directly as
**vshebang-regex** with npm/Bun, frozen locks, Node/Bun CJS/ESM and strict TS7.

```sh
npm --prefix scripts/shebang-regex-conformance ci --ignore-scripts
node --test packages/vshebang-regex/test/*.test.cjs
bun test packages/vshebang-regex/test
node scripts/shebang-regex-conformance/archives.cjs
```
