# Floating UI utilities verification

The fixture pins utils 0.2.12, core 1.7.5, dom 1.7.6 and JSDOM 27.4.0.
Production `vfloating-ui-utils` has no dependencies. The pinned test sources come
from Floating UI commit `12d94738472e922e1b3fa31b02b2b61b9ed77e6a`; hashes and MIT
attribution are under `upstream/`. Test snapshots use `.ts.txt` filenames so Bun
executes them only through the harness, rather than discovering their original
relative imports as standalone tests.

`run.cjs` executes 21 original tests. Only their two imports are redirected.
The used `test`/`describe` callbacks run synchronously; `toEqual` and `not.toBeNull`
use strict Node assertions. No assertions or expectations are rewritten. The
upstream setup's unused animation spy and DOM matchers are unnecessary here.

`browser.cjs` builds the same pinned core/dom caller twice, substituting only the
utils imports for VPM in the second bundle. Isolated headless Chrome runs 24
placement/RTL cases with offset/flip/shift/arrow and checks actual overflow,
containing blocks, shadow slots, iframes and modal top layers. It uses a temporary
profile and localhost server, not a user's browser profile. Set `CHROME_BIN` if
Chrome is not in a standard location. Failures are not silently skipped.

`archives.cjs` packs the package, installs it through npm and Bun, and checks
Node/Bun CJS/ESM identities, browser bundling and TypeScript 7 DOM declarations.

See the [package README](../../packages/vfloating-ui-utils/README.md) for commands,
intentional differences and the boundary of this coverage.
