"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/ky-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
const cases = [];
for (const name of [
  "create client",
  "GET JSON",
  "POST JSON",
  "HTTP error JSON",
  "retry 503",
])
  cases.push({
    name,
    async: name !== "create client",
    async make(file) {
      const { default: ky } = await import(pathToFileURL(file));
      if (name === "create client")
        return () =>
          ky.create({
            baseUrl: "https://example.test/api/",
            headers: { "x-client": "fixture" },
            retry: { limit: 2 },
          });
      const options = {
        baseUrl: "https://example.test/api/",
        retry: { limit: 1, delay: () => 0 },
        headers: { "x-client": "fixture" },
      };
      const api = ky.create(options);
      if (name === "GET JSON")
        return () =>
          api
            .get("items", {
              searchParams: { id: 3 },
              fetch: async () => Response.json({ id: 3 }),
            })
            .json();
      if (name === "POST JSON")
        return () =>
          api
            .post("items", {
              json: { id: 3 },
              fetch: async (r) => Response.json(await r.json()),
            })
            .json();
      if (name === "HTTP error JSON")
        return async () => {
          try {
            await api.get("items", {
              fetch: async () => Response.json({ id: 3 }, { status: 400 }),
            });
          } catch (e) {
            if (e.response?.status !== 400) throw e;
            return e.data;
          }
        };
      return () => {
        let n = 0;
        return api
          .get("items", {
            fetch: async () =>
              ++n === 1
                ? new Response("busy", {
                    status: 503,
                    headers: { "retry-after": "0" },
                  })
                : Response.json({ id: 3 }),
          })
          .json();
      };
    },
    validate(value) {
      if (name === "create client") assert.equal(typeof value.get, "function");
      else assert.deepEqual(value, { id: 3 });
    },
  });
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/ky/distribution/index.js"),
    vpm: path.join(root, "index.mjs"),
    cases,
    files: [
      "client.cjs",
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/ky-conformance/check-controls.cjs",
      "../../scripts/ky-conformance/provenance.json",
      "../../scripts/ky-conformance/package-lock.json",
      "../../scripts/ky-conformance/node_modules/ky",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
