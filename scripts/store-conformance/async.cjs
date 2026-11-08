"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const wait = () => new Promise((resolve) => setTimeout(resolve, 0));
async function initial(api, reject) {
  const a = api.createAsyncAtom(async () => {
    if (reject) throw "rejected";
    return 2;
  });
  const values = [a.get()],
    calls = [];
  const sub = a.subscribe((v) => calls.push(v));
  await wait();
  values.push(a.get());
  sub.unsubscribe();
  return { values, calls };
}
async function reactive(api) {
  const source = api.createAtom(1),
    a = api.createAsyncAtom(async () => source.get() * 2);
  const sub = a.subscribe(() => {});
  await wait();
  source.set(2);
  await wait();
  const value = a.get();
  sub.unsubscribe();
  return value;
}
(async () => {
  const candidate = require(
      process.env.VPM_STORE_ENTRY ||
        path.resolve(__dirname, "../../packages/vtanstack-store"),
    ),
    control = require("@tanstack/store");
  for (const reject of [false, true])
    assert.deepEqual(
      await initial(candidate, reject),
      await initial(control, reject),
    );
  assert.deepEqual(await reactive(candidate), { status: "done", data: 4 });
  assert.deepEqual(await reactive(control), { status: "done", data: 2 });
  console.log(
    "Async initial resolution/rejection match; VPM keeps dependencies reactive after settlement, while the current control stops tracking them.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
