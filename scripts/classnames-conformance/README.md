# Class-name conformance

Pinned classnames 2.5.1 is a black-box control; its runtime source is not read or
copied. Redoc 2.5.0 is the unchanged caller used by VentiMath's MockApiDoc page.
Fixtures render a synthetic API locally and substitute only the class-name helper.
The instrumented boundary must be called, and full rendered output must match.

After `npm ci --ignore-scripts` here, run from the repository root:

```sh
node --test packages/vclassnames/test/*.test.cjs
bun test packages/vclassnames/test
node scripts/classnames-conformance/probe.cjs
bun scripts/classnames-conformance/probe.cjs
node scripts/classnames-conformance/types.cjs
node scripts/classnames-conformance/archives.cjs
```

The archive check repeats the tests and real-caller comparison on the packed
implementation after fresh/frozen npm and Bun installs. It checks all three
entries and their CommonJS/ES identities. No application data or live requests.
