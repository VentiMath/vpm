# TypeScript 5 consumer compilers

VPM develops and builds with TypeScript 7 only. Downstream applications may
still use TypeScript 5: ventimath pins 5.8.3 for its application and resolves
`^5.0.0` to 5.9.3 for its Cloud Functions. This private, separately locked
project installs those two compilers so their users' view of VPM stays tested.
It is outside the workspace and excluded from every package archive.

```sh
npm --prefix scripts/legacy-typescript ci --ignore-scripts
node scripts/check-legacy-types.cjs
```

[`check-legacy-types.cjs`](../check-legacy-types.cjs) compiles every runtime
package's public declarations with each compiler under NodeNext, bundler and
CommonJS (`node10`) resolution, with `strict` on, `skipLibCheck` off and no
ambient platform types. These compilers check consumer compatibility only; they
are never used to build or type-check VPM's own sources.
