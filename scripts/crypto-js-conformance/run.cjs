"use strict";
const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  up = require("crypto-js"),
  own = require(
    process.env.VPM_CRYPTO_NATIVE
      ? "../../packages/vcrypto-js/index.native.cjs"
      : "../../packages/vcrypto-js",
  );
let checks = 0;
const word = (api, b) => api.enc.Hex.parse(Buffer.from(b).toString("hex"));
for (let n = 0; n < 1024; n++) {
  const data = Uint8Array.from(
      { length: n },
      (_, i) => (i * 157 + n * 31) & 255,
    ),
    key = Uint8Array.from({ length: n % 151 }, (_, i) => (i * 73 + n) & 255);
  const a = word(own, data),
    b = word(up, data),
    ka = word(own, key),
    kb = word(up, key);
  const hash = crypto.createHash("sha256").update(data).digest("hex"),
    hmac = crypto.createHmac("sha256", key).update(data).digest("hex");
  assert.equal(own.SHA256(a).toString(), hash);
  assert.equal(up.SHA256(b).toString(), hash);
  assert.equal(own.HmacSHA256(a, ka).toString(), hmac);
  assert.equal(up.HmacSHA256(b, kb).toString(), hmac);
  assert.equal(own.enc.Base64.stringify(a), up.enc.Base64.stringify(b));
  assert.equal(
    own.enc.Base64.parse(own.enc.Base64.stringify(a)).toString(),
    a.toString(),
  );
  assert.deepEqual(own.SHA256(a).words, up.SHA256(b).words);
  checks += 7;
}
for (const text of [
  "",
  "abc",
  "αβ + 数学 = 🧮",
  "\ufeffContest",
  "A\u0000B",
  JSON.stringify(Array.from({ length: 150 }, (_, n) => "problem-" + n)),
  "a".repeat(1000000),
]) {
  for (const api of [own, up]) {
    assert.equal(
      api.SHA256(text).toString(),
      crypto.createHash("sha256").update(text).digest("hex"),
    );
    assert.equal(
      api.HmacSHA256(text, "clé🔑").toString(),
      crypto.createHmac("sha256", "clé🔑").update(text).digest("hex"),
    );
    assert.equal(api.enc.Utf8.stringify(api.enc.Utf8.parse(text)), text);
    checks += 3;
  }
}
for (const api of [own, up]) {
  assert.equal(
    api.SHA256("abc").toString(),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  // RFC4231 cases1 and2, independently cross-checked by node:crypto above.
  assert.equal(
    api.HmacSHA256("Hi There", api.enc.Hex.parse("0b".repeat(20))).toString(),
    "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
  );
  assert.equal(
    api.HmacSHA256("what do ya want for nothing?", "Jefe").toString(),
    "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
  );
  checks += 3;
}
console.log(
  checks +
    " SHA256/HMAC/encoding comparisons pass against CryptoJS4.2.0, native crypto and fixed standard vectors",
);
