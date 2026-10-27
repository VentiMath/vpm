# vnode-types

Complete Node 22 type declarations using VPM's corrected, focused Undici web
types. Derived from **@types/node 22.20.5**, this package retains 68 upstream
declaration files and the complete modern Node API. Three legacy compiler
compatibility files are excluded; their original hashes and omission reasons
remain in `UPSTREAM.json`.

## Scope and improvements

Node's APIs remain intact: HTTP/2, streams, workers, filesystem, events, timers,
and the rest of the upstream declarations. Three files route their Undici
imports to `vundici-types/web`: `http.d.ts`, `worker_threads.d.ts`, and
`web-globals/fetch.d.ts`. The only added file is a compatibility entry point for
third-party `reference types="node"` directives. Other retained Node declarations
remain unchanged.

This brings the four [Fetch signature fixes](../vundici-types/README.md#changes)
into Node-only projects. It also reduces the Undici files loaded by VPM's 18
runtime-package type consumers from **37 to 13**, compared with the same upstream
Node 22.20.5 declarations and the same compiler configuration. All Undici files
remain in its archive; the focused entry point reduces the compiler's loaded
dependency graph. Consumers importing the full Undici client/mock API still
load that API's declarations. Node's unused legacy compiler files are omitted
from its archive separately.

The workspace previously used @types/node 22.14.1. Updating to 22.20.5 also brings
upstream maintenance changes; those are not presented as VPM inventions.

## Installation

The packages are available as repository archives, not published registry
packages. From the repository root:

```sh
mkdir -p /tmp/vpm-types
(cd packages/vundici-types && bun pm pack --ignore-scripts --destination /tmp/vpm-types)
(cd packages/vnode-types && bun pm pack --ignore-scripts --destination /tmp/vpm-types)
```

In the consuming project, remove its direct upstream `@types/node` dependency
and install both archives in the same command:

```sh
npm install --save-dev /tmp/vpm-types/vnode-types-0.1.0.tgz /tmp/vpm-types/vundici-types-0.1.0.tgz
```

Select VPM's ambient declarations explicitly in `tsconfig.json`, retaining any
other type packages your project needs:

```json
{
  "compilerOptions": {
    "types": ["vnode-types"],
    "skipLibCheck": false
  }
}
```

`@types/node` is a scoped package name: `@types` is the namespace and `node` is
the package. TypeScript has conventions for discovering packages under that
namespace. The unscoped name `vnode-types` needs explicit selection as above.

Third-party declarations may contain `/// <reference types="node" />`. For those
consumers, put VPM's compatibility directory first in
[`typeRoots`](https://www.typescriptlang.org/tsconfig/typeRoots.html) and select
its `node` entry point instead:

```json
{
  "compilerOptions": {
    "types": ["node"],
    "typeRoots": ["./node_modules/vnode-types/compat", "./node_modules/@types"],
    "skipLibCheck": false
  }
}
```

Retain other custom type roots your project needs; paths are relative to the
tsconfig file. The tiny `node` entry point references the existing `vnode-types`
installation. Archive tests verify it on TypeScript 7 without duplicate
ambient declarations. Installing a second copy under `@types/node` instead
produced duplicate declarations on TypeScript 7 in our archive test and is not
supported. Nested dependencies that explicitly load other Node declaration
files still need their own migration; this configuration does not replace every
transitive dependency. Loading both upstream and VPM Node globals is unsupported.

## Compatibility

- **Node API target: 22.** These are not universal declarations for every Node
  version. The runtime packages' separate Node 20+ support does not make Node 22
  APIs available on Node 20.
- **TypeScript minimum: 7.0.2.** Strict checks use 7.0.2 in
  Node-only and mixed DOM/Node projects, including CJS and ESM archive consumers.
- **Types only.** No JavaScript API, Node runtime replacement, or application
  throughput improvement is provided.
- **One declaration dependency:** `vundici-types`, whose required peer is this
  package. Both packages are installed together. There is no JavaScript runtime
  cycle.
- In DOM projects, the standard DOM library supplies browser globals. VPM's
  Node-only Fetch improvements do not modify TypeScript's DOM definitions.

VPM's runtime packages retain self-contained public declarations: a separate
gate compiles them with `types: []`, ES2022 only, and no Node, Undici, or DOM types.
The platform types are needed for development tests against real Node APIs.

## Measurement and validation

```sh
npm --prefix scripts/type-consumers ci --ignore-scripts
npm run typecheck
npm run test:types
node scripts/check-type-archives.cjs
node packages/vnode-types/bench/compare.cjs
```

The benchmark compares @types/node 22.20.5 + undici-types 6.21.0 against VPM using
the same 18 runtime-package consumers, TypeScript 7.0.2, ES2022 library, strict
checking, and `skipLibCheck: false`. Each variant gets one unrecorded warmup and
five fresh compiler processes in alternating order. This measures compilation,
not application runtime or install speed.

One local run on **2026-10-26**, Node **24.22.1**, macOS arm64:

| Metric (median) | Upstream | VPM |
| --- | ---: | ---: |
| Loaded files, including standard library and consumers | 198 | 174 |
| Loaded lines, including standard library and consumers | 67,179 | 66,285 |
| Compiler-reported memory, KiB | 69,277 | 67,686 |
| Type-check time, seconds | 0.049 | 0.048 |
| Compiler total time, seconds | 0.067 | 0.065 |

Memory was about **2% lower** in this sample. The 1–2 millisecond timing
differences do not establish a speedup. Compiler-reported times exclude process
startup. These results depend on the consumer graph and compiler. Raw samples are in
[`bench/results.json`](bench/results.json).

## Provenance

`UPSTREAM.json` preserves the upstream archive integrity, original file hashes,
contributors, and the exact changed/omitted-file lists. The upstream MIT license, JSDoc
licenses, and attribution remain intact. From the root,
`node scripts/sync-types.cjs` regenerates both declaration packages from the
pinned test fixture; `--check` verifies the generated files without writing.
See [VPM improvements](../../IMPROVEMENTS.md#vundici-types-and-vnode-types).
