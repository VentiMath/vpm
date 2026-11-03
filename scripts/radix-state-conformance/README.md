# Radix controllable state conformance

Pinned upstream 1.3.0 and unchanged Dropdown Menu 2.2.1 run against React 19.1.0
and 19.2.4. `run.cjs` executes identical baseline cases on either implementation;
original-defect controls reproduce duplicate controlled reducer callbacks on
19.1 StrictMode and the Effect Event render error on 19.2. VPM-only cases assert
committed notifications, stable retained setters, suspended work and Object.is.

Install this fixture and `current` with `npm ci --ignore-scripts`. Run
`node --test packages/vradix-react-use-controllable-state/test/state.test.cjs`
from the repository root, then the same file with `bun test`. `archives.cjs`
checks isolated npm/Bun installations of all three VPM package archives, CJS/ESM,
DOM-only TypeScript 7 and browser bundles on both React versions.
