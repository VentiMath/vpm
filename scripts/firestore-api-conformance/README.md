# Firestore API conformance

Baseline: **@google-cloud/firestore-api 0.7.1**, the npm tarball recorded in the
package [provenance](../../packages/vgoogle-cloud-firestore-api/PROVENANCE.json),
checked October 31, 2026, with google-gax 6.14.0 as its gax stack. The two
generated unit-test files of the `firestore-api-v0.7.1` tag (commit
`b3a96877f6830e2869b9026e95c10df41923790d`), the package manifest and the
license are retained under `upstream/` (tests use a `.txt` suffix to avoid root
test discovery) and verified against `SHA256.json` before execution.

```sh
npm --prefix scripts/firestore-api-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/firestore-api-conformance/run.cjs --upstream
node scripts/firestore-api-conformance/run.cjs
node scripts/firestore-api-conformance/regressions.cjs
node scripts/firestore-api-conformance/wire.cjs
node scripts/build-firestore-api.cjs --check
```

Repeat the runtime commands with Bun.

`run.cjs` compiles the original TypeScript tests with the workspace TypeScript 7
compiler (no type checking) and runs them with mocha 11.7.5 and sinon 20.0.0,
the suite's own test dependencies. Only module locations are redirected: the
tests' `../src` and `../protos` imports to the package under test and, for VPM,
their `google-gax` import to `vgoogle-gax`, so the stubs they install use the same
stack as the client. The compiler's `__importStar` wrapper is removed so the
tests can stub members of namespace imports, as their original CommonJS output
allowed. All **320 tests** pass on both runtimes for both the original and VPM,
with no skips or expectation rewrites; the runner fails on any other count, which
guards against `describe` blocks that silently register nothing.

`regressions.cjs` runs each case in a fresh process per library and counts
unhandled rejections. It reproduces with the original, then checks VPM:

- eager loading of the gax stack and the static `protos` module at import;
- the routing header written into the caller's options object;
- a synchronous `TypeError` for a routed field under a missing parent message;
- a failed stub raised as an unhandled rejection besides rejecting the call;
- `close()` resolving before its locations client closes, with that failure
  unhandled;
- a closed client's server stream erroring only after two backoff retries;
- `getOperation(undefined)` throwing a `TypeError`;
- a missing path-builder argument failing inside the template;
- status details: undecodable entries dropped, and long-running and paged calls
  left undecoded.

`wire.cjs` starts a local gRPC server for the Firestore, Firestore Admin and
Operations services from the original's proto JSON, then drives each library in
its own process over insecure local credentials from that library's gax. Unary,
paged (promise, stream and async iterator), server-streaming, bidirectional,
long-running (including `checkCreateIndexProgress`), regex-routed, error and
path-helper calls must produce identical server logs (method, decoded request,
`x-goog-request-params` and the version-normalized `x-goog-api-client` tokens)
and identical client results. No network or credentials are involved.

`build-firestore-api.cjs --check` verifies that `v1/index.d.ts` matches what the
method table and proto JSON generate.
