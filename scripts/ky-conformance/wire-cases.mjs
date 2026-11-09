// Real native-fetch requests; deterministic synthetic data shared by all controls.
export async function wire(api, root, legacy = false) {
  const ky = api.default,
    client = ky.create({
      ...(legacy ? { prefixUrl: root } : { baseUrl: root }),
      retry: { limit: 2, delay: () => 0 },
    }),
    out = {};
  out.get = await client
    .get("echo", {
      searchParams: { name: "Ada Lovelace", id: 3 },
      headers: { "X-Test": "yes" },
    })
    .json();
  out.post = await client
    .post("echo", { json: { answer: "2", items: [1, 2] } })
    .json();
  out.put = await client.put("echo", { body: new Uint8Array([65, 66]) }).json();
  const form = new FormData();
  form.append("name", "Ada");
  form.append("file", new Blob(["answer"]), "answer.txt");
  const multipart = await client.post("echo", { body: form }).json();
  out.form = {
    method: multipart.method,
    multipart: multipart.type.startsWith("multipart/form-data; boundary="),
    name: multipart.body.includes('name="name"\r\n\r\nAda'),
    file: multipart.body.includes('filename="answer.txt"'),
  };
  out.redirect = await client.get("redirect").json();
  out.raw = (await client.get("status/403", { throwHttpErrors: false })).status;
  try {
    await client.get("status/400", { retry: 0 });
  } catch (e) {
    out.error = {
      name: e.name,
      status: e.response.status,
      data: legacy ? await e.response.json() : e.data,
    };
  }
  out.retry = await client
    .put("retry?key=" + crypto.randomUUID(), {
      json: { keep: "body" },
      headers: { "x-test": "retained" },
    })
    .json();
  out.empty = (await client.head("echo")).status;
  try {
    await client.get("slow", { timeout: 20, retry: 0 });
  } catch (e) {
    out.timeout = e.name;
  }
  const abort = new AbortController();
  const pending = client.get("slow", { signal: abort.signal });
  setTimeout(() => abort.abort(new Error("cancelled")), 10);
  try {
    await pending;
  } catch (e) {
    out.abort = e.message;
  }
  return out;
}
