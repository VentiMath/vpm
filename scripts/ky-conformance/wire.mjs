import assert from "node:assert/strict";
import { server } from "./server.cjs";
import { wire, bodyBoundaries } from "./wire-cases.mjs";
import * as upstream from "ky";
import * as app from "ky-app";
import * as vpm from "../../packages/vky/index.mjs";
import * as legacy from "../../packages/vky/legacy.mjs";
const http = server();
await new Promise((r) => http.listen(0, "127.0.0.1", r));
try {
  const root = "http://127.0.0.1:" + http.address().port + "/";
  for (const [a, b, old] of [
    [upstream, vpm, false],
    [app, legacy, true],
  ])
    assert.deepEqual(await wire(b, root, old), await wire(a, root, old));
  for (const api of [vpm, legacy])
    assert.deepEqual(await bodyBoundaries(api, root), {
      headers: true,
      timeout: "TimeoutError",
      abortIdentity: true,
    });
  console.log(
    "Native HTTP: 22 current/application request, redirect, multipart, retry-body, timeout and cancellation scenarios match; four VPM body deadline/abort checks pass.",
  );
} finally {
  http.closeAllConnections();
  await new Promise((r) => http.close(r));
}
