import assert from "node:assert/strict";
import * as upstream from "ky";
import * as app from "ky-app";
import * as vpm from "../../packages/vky/index.mjs";
import * as legacy from "../../packages/vky/legacy.mjs";
let count = 0;
const fetch = async (r) =>
  Response.json({
    url: r.url,
    method: r.method,
    headers: [...r.headers].filter(([k]) => k !== "content-length"),
    body: await r.text(),
  });
for (const [a, b, old] of [
  [upstream, vpm, false],
  [app, legacy, true],
]) {
  for (const searchParams of [
    undefined,
    "",
    "a=1&a=2",
    new URLSearchParams("b=x+y"),
    { a: 1, b: false },
    { a: undefined, z: null },
  ])
    for (const input of [
      "https://example.test/",
      "https://example.test/x?a=old&keep=1",
    ])
      for (const headers of [
        undefined,
        { "X-A": "changed", "x-b": undefined },
        new Headers({ "x-c": "3" }),
      ]) {
        const options = { searchParams, headers, fetch };
        const defaults = { headers: { "x-a": "initial", "x-b": "2" } };
        assert.deepEqual(
          await b.default.create(defaults)(input, options).json(),
          await a.default.create(defaults)(input, options).json(),
        );
        count++;
      }
  for (const status of [400, 401, 404, 408, 413, 429, 500, 501, 502, 503, 504])
    for (const method of ["get", "post", "put", "delete"]) {
      const run = async (api) => {
        let n = 0,
          requestHooks = 0,
          retryHooks = [];
        const prepare = () => {
          requestHooks++;
        };
        try {
          await api.default[method]("https://example.test/", {
            retry: { limit: 2, delay: () => 0 },
            hooks: {
              beforeRequest: [prepare],
              beforeRetry: [
                ({ retryCount }) => {
                  retryHooks.push(retryCount);
                },
              ],
            },
            fetch: async () => {
              n++;
              return new Response("bad", { status });
            },
          });
        } catch (e) {
          return {
            n,
            requestHooks,
            retryHooks,
            name: e.name,
            status: e.response?.status,
          };
        }
      };
      assert.deepEqual(await run(b), await run(a));
      count++;
    }
}
console.log(
  count +
    " URL/header/query and retry-policy combinations match current/application controls.",
);
