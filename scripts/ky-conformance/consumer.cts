import ky, { HTTPError, isHTTPError, replaceOption, type Options } from "vky";
import old, { HTTPError as LegacyError } from "vky/legacy";
const client = ky.create({
  baseUrl: "https://example.test",
  hooks: {
    beforeRequest: [
      ({ request }) => {
        request.headers.set("test", "a");
      },
    ],
    beforeRetry: [
      ({ retryCount }) => {
        if (retryCount > 1) return ky.stop;
      },
    ],
  },
});
const result: Promise<{ id: string }> = client
  .get("item", { searchParams: { id: 1 } })
  .json<{ id: string }>();
const opts: Options = {
  hooks: { beforeRequest: replaceOption([]) },
  retry: { limit: 2, shouldRetry: ({ error }) => isHTTPError(error) },
};
void result;
void opts;
const app = old.create({
  prefixUrl: "https://example.test/api/",
  hooks: {
    beforeRequest: [async (request) => new Request(request)],
    beforeError: [(error) => error],
  },
});
async function call() {
  try {
    return await app
      .post("signup", { json: { name: "Ada" } })
      .json<{ ok: boolean }>();
  } catch (e) {
    if (e instanceof LegacyError) {
      const body = await e.response.json();
      void body;
    }
    throw e;
  }
}
void call;
void HTTPError;
// @ts-expect-error modern entry deliberately rejects the old URL option
ky.create({ prefixUrl: "https://example.test" });
// @ts-expect-error unverified progress callbacks are not advertised
ky("https://example.test", { onDownloadProgress() {} });
// @ts-expect-error Standard Schema validation is not advertised
client.get("x").json({});
