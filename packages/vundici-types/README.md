# vundici-types

Undici 6.21 declarations with corrected Fetch signatures and a focused web API
entry point. This package contains types only; it does not implement an HTTP
client, replace Node's Fetch runtime, or add runtime overhead.

## Changes

The baseline is **undici-types 6.21.0**, the version family used by Node 22's
declarations. All 38 original declaration files and the complete client, pool,
agent, dispatcher, and mock APIs are retained. VPM fixes four gaps:

| API | Upstream declaration | VPM declaration |
| --- | --- | --- |
| `RequestInit.cache` | Missing | Accepts the existing `RequestCache` modes. |
| `Request.bytes()` / `Response.bytes()` | Missing | Returns `Promise<Uint8Array>`. |
| `Response.redirect(url)` | Requires a status argument | Allows the runtime's default 302 status. |
| `FormData.append` / `set` | Allows any value with a filename | Requires a Blob when a third argument is supplied, including explicit `undefined`. |

Two-argument FormData calls still accept values that the runtime converts to
strings. The filename restriction can expose previously accepted code that would
throw at runtime. These changes are checked against **Undici 6.21.3** and the
native Node/Bun web APIs. They do not establish that newer Undici declaration
versions have the same gaps.

The new `vundici-types/web` entry point exports Fetch, FormData, WebSocket, and
EventSource types. `vnode-types` uses it so ordinary Node consumers need not load
the full agent/pool/mock export tree. Necessary dispatcher/client declarations
are still reachable. The full root entry point remains available for consumers
that use those APIs.

## Use

Install this package together with `vnode-types`; see the
[archive installation instructions](../vnode-types/README.md#installation).
TypeScript **5.6 or later** is required. The tested compilers are 5.6.3, 5.8.3,
and 7.0.2, in Node-only and mixed DOM/Node projects, with `skipLibCheck: false`.

```ts
import type { RequestInit } from 'vundici-types/web';
import type { Dispatcher, MockAgent } from 'vundici-types';

const options: RequestInit = { cache: 'no-store' };
```

Use `import type`: there are no JavaScript exports. Runtime values come from
Node's globals or an actual Undici installation. These declarations target
Undici 6.21, not arbitrary Undici major versions.

The required peer dependency `vnode-types` supplies Node's ambient APIs;
`vnode-types` in turn depends on this package for its web declarations. This
explicit type dependency cycle has no JavaScript runtime cycle. VPM does not
claim to have removed the need for Node's types or bundled a smaller Node API.

In DOM projects, TypeScript's standard DOM library continues to supply browser
globals; importing VPM's types does not rewrite that library.

## Validation and provenance

From the repository root:

```sh
bun install --frozen-lockfile --ignore-scripts
npm --prefix scripts/type-consumers ci --ignore-scripts
node scripts/sync-types.cjs --check
npm run typecheck
npm run test:types
node scripts/check-type-archives.cjs
```

The type gate reproduces the old errors, checks valid client/mock usage and
invalid inputs, then runs all three compilers. Archive checks install the actual
tarballs in an isolated project. Original sources and compilers are confined to
the separately locked `scripts/type-consumers` test fixture.

`UPSTREAM.json` records the upstream npm archive, integrity, original file hashes,
contributors, and changed files. `node scripts/sync-types.cjs` regenerates the
declarations and provenance from that pinned fixture; `--check` verifies without
writing. The original MIT license and attribution are preserved. The
[central improvements record](../../IMPROVEMENTS.md#vundici-types-and-vnode-types)
and [Node types README](../vnode-types/README.md) explain the measured compiler
effects and compatibility limits.
