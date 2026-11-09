// Shared Node/Bun/browser public-API scenarios. Inputs are synthetic, never credentials.
export async function scenarios(api, legacy = false) {
  const ky = api.default,
    result = {},
    root = "https://example.test/api/";
  const fetch = async (request) => {
    request.signal.throwIfAborted();
    return Response.json({
      url: request.url,
      method: request.method,
      headers: [...request.headers].filter(
        ([k]) => !["content-length"].includes(k),
      ),
      body: await request.text(),
      credentials: request.credentials,
    });
  };
  const before = (fn) =>
    legacy ? (r, o) => fn({ request: r, options: o }) : fn;
  const prefix = legacy ? { prefixUrl: root } : { baseUrl: root };
  const events = [];
  const client = ky.create({
    ...prefix,
    headers: { "X-Default": "yes" },
    hooks: {
      beforeRequest: [
        before(({ request }) => {
          events.push("prepare");
          request.headers.set("X-Identity", "fixture");
        }),
      ],
    },
    retry: { limit: 2, methods: ["get", "put", "delete"], delay: () => 0 },
    fetch,
  });
  result.get = await client
    .get("catalog/problems", {
      searchParams: { ids: "12,34", pattern: "x y" },
      headers: { "X-Call": "call" },
    })
    .json();
  result.post = await client
    .post("contestSignups/math", { json: { name: "Ada", levels: [1, 2] } })
    .json();
  result.put = await client
    .put("attempts/id", {
      json: { answers: { a: "2" } },
      throwHttpErrors: false,
    })
    .json();
  result.request = await client(
    new Request(root + "request", {
      method: "POST",
      body: "abc",
      headers: { "x-input": "a" },
    }),
  ).json();
  result.url = await client.get(new URL(root + "url")).json();
  result.remove = await client
    .get("x", { headers: { "X-Default": undefined } })
    .json();
  result.events = events;
  result.extended = await client
    .extend({ headers: { "X-Extra": "b" } })
    .get("x")
    .json();
  result.created = await client
    .create({ fetch })
    .get(root + "independent")
    .json();
  for (const status of [400, 403, 404, 500]) {
    let calls = 0;
    try {
      await client.get("error", {
        retry: 0,
        fetch: async () => {
          calls++;
          return Response.json(
            { error: "denied", fields: { name: "required" } },
            { status },
          );
        },
      });
    } catch (e) {
      result["error" + status] = {
        name: e.name,
        status: e.response.status,
        request: e.request.url,
        data: legacy ? await e.response.json() : e.data,
        calls,
      };
    }
  }
  let count = 0;
  result.retry = await client
    .get("retry", {
      fetch: async () =>
        ++count < 3
          ? new Response("busy", {
              status: 503,
              headers: { "retry-after": "0" },
            })
          : Response.json({ count }),
    })
    .json();
  count = 0;
  try {
    await client.post("no-retry", {
      fetch: async () => {
        count++;
        return new Response("busy", { status: 503 });
      },
    });
  } catch (e) {
    result.postError = { calls: count, status: e.response.status };
  }
  result.allow = (
    await client.get("allow", {
      throwHttpErrors: false,
      fetch: async () => new Response("not found", { status: 404 }),
    })
  ).status;
  const c = new AbortController();
  c.abort(new Error("abort fixture"));
  try {
    await ky.get(root + "cancel", { signal: c.signal, fetch });
  } catch (e) {
    result.abort = e.message;
  }
  const override = ky.create({
    ...prefix,
    hooks: {
      beforeRequest: [
        before(
          () =>
            new Response('{"cache":true}', {
              headers: { "content-type": "application/json" },
            }),
        ),
      ],
    },
    fetch: () => {
      throw Error("must not fetch");
    },
  });
  result.cache = await override.get("cache").json();
  const modified = ky.create({
    ...prefix,
    hooks: {
      beforeRequest: [
        before(({ request }) => new Request(root + "rewritten", request)),
      ],
    },
    fetch,
  });
  result.rewrite = await modified.get("original").json();
  result.custom = await client
    .get("custom", {
      parseJson: (s) => ({ text: s }),
      fetch: async () => new Response("custom"),
    })
    .json();
  if (!legacy) {
    result.query = await ky
      .get(root + "q?a=old&keep=1", {
        searchParams: { a: undefined, z: null },
        fetch,
      })
      .json();
    result.deep = await ky
      .create({ json: { a: 1, nested: { x: 1 } } })
      .extend({ json: { nested: { y: 2 } } })
      .post(root, { fetch })
      .json();
    result.prefix = await ky
      .get("/items", {
        prefix: "/api/",
        baseUrl: "https://example.test/base/",
        fetch,
      })
      .json();
    try {
      await ky(root, {
        maxResponseSize: 2,
        fetch: async () => new Response("123"),
      }).text();
    } catch (e) {
      result.size = { name: e.name, limit: e.maxResponseSize };
    }
  }
  return result;
}
