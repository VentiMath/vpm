# Nano ID conformance

Pinned controls: Nano ID 6.0.2 and app-pinned 3.3.11. Production source is
independently written from public declarations, documentation and black-box
calls. No upstream implementation files were used as a template.

- `probe.cjs`: valid output size/alphabet checks against both controls, plus
  unchanged PostCSS 8.5.8 parse/input behavior with the non-secure dependency
  replaced at bundling. The bundle metadata proves VPM is the resolved module.
- `browser.cjs`: Web Crypto, size/alphabet/uniqueness smoke checks, owned byte
  arrays, the non-secure entry, large requests and unavailable entropy in Chrome.
- `types.cjs`: strict TypeScript 7 NodeNext/Bundler positive/negative consumers.
- `archives.cjs`: exact archive exports through npm/Bun clean and frozen installs,
  Node/Bun execution, types and browser bundling from the installed package.

`packages/vnanoid/test` checks rejection sampling exhaustively over the accepted
byte values for a three-symbol alphabet, invalid limits/sources, owned arrays,
crypto-only entropy and CJS/ESM identity. Statistical uniqueness is only a smoke
check, not a security proof. Deterministic custom sequences intentionally differ
from upstream. Public zero-size behavior in app3.3.11 was observed in a separate
1.5-second timeout probe because its custom generator hangs; routine controls
avoid hanging the suite, and the owned zero-size path is tested directly.

Run the scripts with Node 24, and run unit/probe checks with Bun 1.4.4. Run
`bench/compare.cjs` with no concurrent tests/builds. Four balanced isolated
comparison pairs and two identical-source pairs retain all timings and hashes.
