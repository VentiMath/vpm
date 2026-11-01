# Floating UI core verification

Pins core/dom 1.8.0 and utils 0.2.12 as development fixtures.
Production `vfloating-ui-core` depends only on `vfloating-ui-utils`.

`upstream/` retains 27 original tests from Floating UI commit
`12d94738472e922e1b3fa31b02b2b61b9ed77e6a`, with MIT attribution and SHA-256 hashes.
Snapshots end in `.ts.txt` so automatic test discovery cannot run them outside
the harness. `run.cjs` transpiles unchanged sources with TypeScript 7 and supplies
module-resolution shims for VPM entry points and private geometry helpers.
The used `toBe`/`toEqual` matchers use strict Node assertions; async tests are
awaited. No assertions are rewritten or removed. Type-only upstream tests that
require Vitest's type harness are not counted; packed declaration consumers are
checked separately.

`scenarios.cjs` supplies deterministic platform measurements for 624 Node/Bun
comparisons across all middleware, the app's three configurations, scales and
custom overflow hooks. `browser.cjs` runs 144 cases with real DOM 1.8.0 in Chrome,
replacing core and utils only in the VPM bundle. It uses a temporary browser
profile and localhost server. Set `CHROME_BIN` if needed; absence is an error.

`archives.cjs` installs packed core/utils through npm and Bun and checks
Node/Bun CJS/ESM, a browser bundle and TypeScript 7 consumers. The Bun fixture
uses local archive overrides for unpublished transitive VPM packages.

See [the package README](../../packages/vfloating-ui-core/README.md) for scope,
intentional differences and commands.
