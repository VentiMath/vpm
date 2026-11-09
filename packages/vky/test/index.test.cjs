"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const ky = require(process.env.VKY_ENTRY ?? "../index.cjs"),
  legacy = require(process.env.VKY_LEGACY_ENTRY ?? "../legacy.cjs");
const endpoint = "https://example.test/api";
const pending = () => new Promise(() => {});
test("current URL, query, JSON and hook contracts preserve caller options", async () => {
  const options = {
    baseUrl: endpoint + "/",
    headers: { X: "one" },
    json: { a: { b: 1 } },
    context: { shared: { n: 1 } },
    hooks: {
      init: [
        (o) => {
          o.json.a.b = 2;
          o.headers.x = "two";
        },
      ],
    },
    fetch: async (r) =>
      Response.json({
        url: r.url,
        headers: [...r.headers],
        body: await r.json(),
      }),
  };
  const out = await ky
    .post("items?keep=yes&remove=x", {
      ...options,
      searchParams: { remove: undefined, n: 4 },
    })
    .json();
  assert.equal(out.url, endpoint + "/items?keep=yes&n=4");
  assert.deepEqual(out.body, { a: { b: 2 } });
  assert.equal(options.json.a.b, 1);
  assert.equal(options.headers.X, "one");
});
test("legacy app client keeps positional hooks and readable error response", async () => {
  const api = legacy.create({
    prefixUrl: endpoint,
    hooks: { beforeRequest: [(r) => r.headers.set("x-auth", "synthetic")] },
    retry: 0,
  });
  await assert.rejects(
    api
      .post("contestSignups/x", {
        json: { name: "Ada" },
        fetch: async (r) => {
          assert.equal(r.url, endpoint + "/contestSignups/x");
          assert.equal(r.headers.get("x-auth"), "synthetic");
          return Response.json(
            { fields: { name: "required" } },
            { status: 400 },
          );
        },
      })
      .json(),
    (e) => e instanceof ky.HTTPError,
  );
  try {
    await api.get("scoresheets/sign", {
      fetch: async () =>
        Response.json({ error: "Access denied" }, { status: 403 }),
    });
    assert.fail();
  } catch (e) {
    assert.ok(e instanceof ky.HTTPError);
    assert.deepEqual(await e.response.json(), { error: "Access denied" });
  }
});
test("modern errors populate data and preserve the error class across entries", async () => {
  await assert.rejects(
    ky(endpoint, {
      retry: 0,
      fetch: async () => Response.json({ error: "missing" }, { status: 404 }),
    }),
    (e) => {
      assert.ok(ky.isKyError(e));
      assert.ok(ky.isHTTPError(e));
      assert.ok(e instanceof legacy.HTTPError);
      assert.deepEqual(e.data, { error: "missing" });
      assert.equal(e.response.bodyUsed, true);
      return true;
    },
  );
});
test("retries replay request bodies and use updated headers", async () => {
  const seen = [];
  const result = await ky
    .post(endpoint, {
      json: { x: 1 },
      retry: { limit: 2, methods: ["post"], delay: () => 0 },
      hooks: {
        beforeRetry: [
          ({ request, retryCount }) =>
            request.headers.set("attempt", String(retryCount)),
        ],
      },
      fetch: async (r) => {
        seen.push([await r.text(), r.headers.get("attempt")]);
        return seen.length < 3
          ? new Response("again", { status: 503 })
          : Response.json({ ok: true });
      },
    })
    .json();
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(seen, [
    ['{"x":1}', null],
    ['{"x":1}', "1"],
    ['{"x":1}', "2"],
  ]);
});
test("unsafe methods and disabled HTTP errors are not retried", async () => {
  let n = 0;
  const fetch = async () => {
    n++;
    return new Response("bad", { status: 500 });
  };
  await assert.rejects(ky.post(endpoint, { fetch }), ky.HTTPError);
  assert.equal(n, 1);
  const r = await ky(endpoint, { fetch, throwHttpErrors: false });
  assert.equal(r.status, 500);
  assert.equal(n, 2);
  await r.text();
});
test("cancellation interrupts backoff and preserves the abort reason", async () => {
  const c = new AbortController(),
    reason = new Error("caller cancelled");
  let attempts = 0;
  const p = ky(endpoint, {
    signal: c.signal,
    retry: {
      delay: () => {
        queueMicrotask(() => c.abort(reason));
        return Infinity;
      },
    },
    fetch: async () => {
      attempts++;
      return new Response("retry", { status: 503 });
    },
  });
  await assert.rejects(p, (e) => e === reason);
  assert.equal(attempts, 1);
});
test("input, instance and per-call abort signals all remain effective", async () => {
  for (const which of [0, 1, 2]) {
    const c = [
      new AbortController(),
      new AbortController(),
      new AbortController(),
    ];
    const reason = new Error("abort " + which);
    const api = ky.create({ signal: c[1].signal });
    let sent;
    const started = new Promise((r) => (sent = r));
    const p = api(new Request(endpoint, { signal: c[0].signal }), {
      signal: c[2].signal,
      fetch: () => {
        sent();
        return pending();
      },
    });
    await started;
    c[which].abort(reason);
    await assert.rejects(p, (e) => e === reason);
  }
});
test("timeout settles even when custom fetch ignores its signal", async () => {
  await assert.rejects(
    ky(endpoint, { timeout: 5, retry: 0, fetch: pending }),
    ky.TimeoutError,
  );
});
test("total timeout bounds async hooks and infinite retry delays", async () => {
  await assert.rejects(
    ky(endpoint, {
      timeout: false,
      totalTimeout: 5,
      hooks: { beforeRequest: [pending] },
      fetch: async () => Response.json({}),
    }),
    ky.TimeoutError,
  );
  await assert.rejects(
    ky(endpoint, {
      timeout: false,
      totalTimeout: 5,
      retry: { delay: () => Infinity },
      fetch: async () => new Response("x", { status: 503 }),
    }),
    ky.TimeoutError,
  );
});
test("body timeout cancels the underlying reader; body errors do not retry", async () => {
  let cancelled = false,
    n = 0;
  await assert.rejects(
    ky(endpoint, {
      timeout: 10,
      fetch: async () => {
        n++;
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
        );
      },
    }).text(),
    ky.TimeoutError,
  );
  assert.equal(cancelled, true);
  assert.equal(n, 1);
});
test("size limit counts actual chunks independently of content-length", async () => {
  let cancelled = false;
  const response = () =>
    new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("12345"));
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "content-length": "1" } },
    );
  await assert.rejects(
    ky(endpoint, { maxResponseSize: 4, fetch: async () => response() }).text(),
    (e) => ky.isResponseSizeError(e) && e.maxResponseSize === 4,
  );
  assert.ok(cancelled);
  const r = await ky(endpoint, {
    maxResponseSize: 4,
    fetch: async () => new Response("12345"),
  });
  await assert.rejects(r.text(), ky.ResponseSizeError);
});
test("afterResponse may return its clone without cancellation corrupting it", async () => {
  assert.deepEqual(
    await ky(endpoint, {
      hooks: { afterResponse: [({ response }) => response] },
      fetch: async () => Response.json({ x: 1 }),
    }).json(),
    { x: 1 },
  );
});
test("replacement requests keep timeout and abort ownership", async () => {
  const c = new AbortController(),
    reason = new Error("stop");
  let sent;
  const ready = new Promise((r) => (sent = r));
  const p = ky(endpoint, {
    signal: c.signal,
    hooks: { beforeRequest: [() => new Request(endpoint + "/other")] },
    fetch: (r) => {
      assert.equal(r.url, endpoint + "/other");
      sent();
      return pending();
    },
  });
  await ready;
  c.abort(reason);
  await assert.rejects(p, (e) => e === reason);
});
test("beforeRequest failures are fatal and options reject asynchronously", async () => {
  let n = 0;
  const failure = new Error("identity changed");
  await assert.rejects(
    ky(endpoint, {
      hooks: {
        beforeRequest: [
          () => {
            throw failure;
          },
        ],
      },
      fetch: async () => {
        n++;
        return new Response();
      },
    }),
    (e) => e === failure,
  );
  assert.equal(n, 0);
  for (const options of [
    null,
    { timeout: NaN },
    { timeout: Infinity },
    { retry: -1 },
    { retry: { delay: 1 } },
    { maxResponseSize: -1 },
    { hooks: { beforeRequest: "x" } },
    { onUploadProgress: () => {} },
    { prefixUrl: endpoint },
  ]) {
    let p;
    assert.doesNotThrow(() => {
      p = ky(endpoint, options);
    });
    await assert.rejects(p);
  }
});
test("recognized network failures retry; programming errors do not", async () => {
  let n = 0;
  const out = await ky(endpoint, {
    retry: { delay: () => 0 },
    fetch: async () => {
      if (++n === 1) throw new TypeError("fetch failed");
      return Response.json({ ok: true });
    },
  }).json();
  assert.ok(out.ok);
  assert.equal(n, 2);
  n = 0;
  await assert.rejects(
    ky(endpoint, {
      fetch: async () => {
        n++;
        throw new TypeError("bad program");
      },
    }),
    /bad program/,
  );
  assert.equal(n, 1);
});
test("hooks merge without mutation, and replacement is explicit", async () => {
  const order = [];
  const source = {
    hooks: {
      beforeRequest: [
        () => {
          order.push(1);
        },
      ],
    },
  };
  const a = ky.create(source),
    b = a.extend({
      hooks: {
        beforeRequest: [
          () => {
            order.push(2);
          },
        ],
      },
    });
  await b(endpoint, { fetch: async () => new Response() });
  assert.deepEqual(order, [1, 2]);
  assert.equal(source.hooks.beforeRequest.length, 1);
  order.length = 0;
  await b.extend({
    hooks: ky.replaceOption({
      beforeRequest: [
        () => {
          order.push(3);
        },
      ],
    }),
  })(endpoint, { fetch: async () => new Response() });
  assert.deepEqual(order, [3]);
});
test("raw byte shortcuts, custom JSON parser and empty JSON behavior", async () => {
  assert.deepEqual(
    [
      ...(await ky(endpoint, {
        fetch: async () => new Response("ab"),
      }).bytes()),
    ],
    [97, 98],
  );
  assert.deepEqual(
    await ky(endpoint, {
      parseJson: (s) => ({ raw: s }),
      fetch: async () => new Response("hello"),
    }).json(),
    { raw: "hello" },
  );
  await assert.rejects(
    ky(endpoint, {
      fetch: async () => new Response(null, { status: 204 }),
    }).json(),
    SyntaxError,
  );
  assert.equal(
    await legacy(endpoint, {
      fetch: async () => new Response(null, { status: 204 }),
    }).json(),
    "",
  );
});
test("query layers accumulate while explicit removal survives later additions", async () => {
  const api = ky
    .create({ searchParams: { a: undefined, b: 1 } })
    .extend({ searchParams: { a: 3, b: 2 } });
  const value = await api(endpoint + "?a=old&c=keep", {
    fetch: async (r) => new Response(r.url),
  }).text();
  assert.equal(value, endpoint + "?c=keep&b=1&b=2");
});
test("signals can be replaced or explicitly removed, and null retains the parent", async () => {
  const a = new AbortController();
  a.abort(new Error("parent"));
  const b = new AbortController();
  const base = ky.create({
    signal: a.signal,
    fetch: async () => new Response("ok"),
  });
  assert.equal(await base(endpoint, { signal: undefined }).text(), "ok");
  assert.equal(
    await base(endpoint, { signal: ky.replaceOption(b.signal) }).text(),
    "ok",
  );
  await assert.rejects(
    base(endpoint, { signal: null }),
    (e) => e === a.signal.reason,
  );
});
test("null hooks reject, init owns URLSearchParams and empty error data stays undefined", async () => {
  for (const hooks of [null, { beforeRequest: null }])
    await assert.rejects(ky(endpoint, { hooks }), TypeError);
  const params = new URLSearchParams("a=1");
  const api = ky.create({
    searchParams: params,
    hooks: { init: [(o) => o.searchParams.set("a", "2")] },
    fetch: async (r) => new Response(r.url),
  });
  assert.equal(await api(endpoint).text(), endpoint + "?a=2");
  assert.equal(params.get("a"), "1");
  await assert.rejects(
    ky(endpoint, {
      retry: 0,
      fetch: async () => new Response("", { status: 404 }),
    }),
    (e) => e.data === undefined,
  );
});
test("beforeRetry replacement options validate values and restore defaults", async () => {
  let count = 0;
  const value = await ky(endpoint, {
    retry: { limit: 1, delay: () => 0 },
    hooks: {
      beforeRetry: [
        () => ({
          options: {
            fetch: async () => new Response("replaced"),
            timeout: undefined,
            throwHttpErrors: undefined,
          },
        }),
      ],
    },
    fetch: async () => {
      count++;
      return new Response("busy", { status: 503 });
    },
  }).text();
  assert.equal(value, "replaced");
  assert.equal(count, 1);
  await assert.rejects(
    ky(endpoint, {
      retry: { limit: 1, delay: () => 0 },
      hooks: { beforeRetry: [() => ({ options: { fetch: 42 } })] },
      fetch: async () => new Response("busy", { status: 503 }),
    }),
    TypeError,
  );
});
test("queued and asynchronous body chunks retain order and cancel on abort", async () => {
  for (const asyncChunks of [false, true]) {
    let n = 0;
    const stream = new ReadableStream({
      async pull(c) {
        if (asyncChunks) await Promise.resolve();
        if (n === 5) {
          c.close();
          return;
        }
        c.enqueue(new TextEncoder().encode(String(n++)));
      },
    });
    assert.equal(
      await ky(endpoint, { fetch: async () => new Response(stream) }).text(),
      "01234",
    );
  }
  const c = new AbortController(),
    reason = new Error("body cancelled");
  let cancelled, started;
  const ready = new Promise((r) => (started = r));
  const p = ky(endpoint, {
    signal: c.signal,
    fetch: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([65]));
          },
          pull() {
            started();
          },
          cancel(r) {
            cancelled = r;
          },
        }),
      ),
  }).text();
  await ready;
  c.abort(reason);
  await assert.rejects(p, (e) => e === reason);
  assert.equal(cancelled, reason);
});
test("beforeError runs once on final failure with current and legacy arguments", async () => {
  for (const [api, old] of [
    [ky, false],
    [legacy, true],
  ]) {
    const seen = [];
    const hook = (arg) => {
      const e = old ? arg : arg.error;
      seen.push(old ? e.response.status : [arg.retryCount, e.response.status]);
      e.message = "annotated";
      return e;
    };
    await assert.rejects(
      api(endpoint, {
        retry: { limit: 1, delay: () => 0 },
        hooks: { beforeError: [hook] },
        fetch: async () => new Response("bad", { status: 503 }),
      }),
      (e) => e.message === "annotated",
    );
    assert.deepEqual(seen, old ? [503] : [[1, 503]]);
  }
});
