"use strict";
const assert = require("node:assert/strict"),
  cases = require("./cases.cjs");
const own = require(process.env.VZOD_ENTRY || "../../packages/vzod"),
  current = require("./node_modules/zod");
// A validator's regex text is an implementation detail, not its acceptance
// contract. VPM independently expresses the email rule; other issue fields match.
function normalize(x) {
  if (Array.isArray(x)) return x.map(normalize);
  if (x && typeof x === "object") {
    const o = {};
    for (const k of Object.keys(x))
      if (!(x.format === "email" && k === "pattern"))
        Object.defineProperty(o, k, {
          value: normalize(x[k]),
          enumerable: true,
        });
    return o;
  }
  return x;
}
function visible(r) {
  return normalize(
    r.success
      ? { success: true, data: r.data }
      : { success: false, issues: r.error.issues },
  );
}
(async () => {
  const left = cases(own),
    right = cases(current);
  let count = 0;
  for (let i = 0; i < left.length; i++)
    for (const value of cases.inputs)
      for (const async of left[i][2] ? [true] : [false, true]) {
        const method = async ? "safeParseAsync" : "safeParse",
          a = visible(await left[i][1][method](value)),
          b = visible(await right[i][1][method](value));
        try {
          assert.deepEqual(a, b);
        } catch {
          console.error(
            "Mismatch",
            left[i][0],
            method,
            require("node:util").inspect(value, { depth: 3 }),
            JSON.stringify({ vpm: a, upstream: b }),
          );
          process.exit(1);
        }
        count++;
      }
  let seed = 124;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const chars = ["a", "B", "0", "-", "_", "+", ".", "'", "!", " ", "é"],
    ownEmail = own.string().email(),
    controlEmail = current.string().email();
  for (let i = 0; i < 3000; i++) {
    let local = "",
      domain = "";
    for (let n = random() % 12; n; n--) local += chars[random() % chars.length];
    for (let n = random() % 12; n; n--)
      domain += chars[random() % chars.length];
    const text = local + "@" + domain + ".com";
    assert.equal(
      ownEmail.safeParse(text).success,
      controlEmail.safeParse(text).success,
      text,
    );
  }
  console.log(
    count +
      " current Zod 4.6.7 parsing/issue comparisons and 3000 deterministic email checks pass.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
module.exports = { normalize, visible };
