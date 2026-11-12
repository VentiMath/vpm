import api from "vcrypto-js";
import upstream from "crypto-js";
const hex = (bytes) =>
  Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
window.runChecks = async () => {
  let checks = 0;
  for (const length of [
    0, 1, 31, 55, 56, 63, 64, 65, 119, 120, 127, 128, 1024, 8192,
  ]) {
    const input = Uint8Array.from(
        { length },
        (_, n) => (n * 157 + length) & 255,
      ),
      key = Uint8Array.from({ length: 83 }, (_, n) => (n * 13) & 255),
      message = api.enc.Hex.parse(hex(input)),
      secret = api.enc.Hex.parse(hex(key));
    const hash = hex(await crypto.subtle.digest("SHA-256", input));
    const nativeKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const hmac = hex(await crypto.subtle.sign("HMAC", nativeKey, input));
    for (const lib of [api, upstream]) {
      const data = lib.enc.Hex.parse(hex(input)),
        secret = lib.enc.Hex.parse(hex(key));
      if (
        lib.SHA256(data).toString() !== hash ||
        lib.HmacSHA256(data, secret).toString() !== hmac
      )
        throw Error("Native browser digest mismatch");
      checks += 2;
    }
  }
  const ids = Array.from({ length: 150 }, (_, n) => "contest-problem-" + n);
  const version = JSON.stringify(ids);
  if (api.SHA256(version).toString() !== upstream.SHA256(version).toString())
    throw Error("Contest version changed");
  const b64 = (lib, s) =>
    lib.enc.Base64.stringify(lib.enc.Utf8.parse(s))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const token = (lib) => {
    const data =
      b64(lib, JSON.stringify({ alg: "HS256", typ: "JWT" })) +
      "." +
      b64(lib, JSON.stringify({ id: "fixture-user", label: "α 数学" }));
    return (
      data +
      "." +
      lib.enc.Base64.stringify(lib.HmacSHA256(data, "public-fixture-only"))
        .replace(/=+$/, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
    );
  };
  if (token(api) !== token(upstream)) throw Error("Mock token mismatch");
  return checks + 2;
};
