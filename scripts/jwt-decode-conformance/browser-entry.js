import * as library from "jwt-decode";
const decode = library.jwtDecode || library.default;
window.formVariant = VPM_VARIANT;
window.runForms = () => {
  const output = [],
    encode = (value) => {
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      return btoa(String.fromCharCode(...bytes))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    };
  const header = encode({ alg: "HS256", typ: "JWT" });
  for (const name of ["Ada", "Émilie", "李明", "ليلى", "🧮", "%E0%A4%A"]) {
    const payload = { id: "mock-user", name },
      token = header + "." + encode(payload) + ".signature";
    output.push(decode(token), decode(token, { header: true }));
    const { id } = decode(token);
    if (id !== "mock-user") throw Error("App caller lost id");
  }
  for (const token of [null, "missing", "x.!", "x.eA"]) {
    try {
      decode(token);
      throw Error("Invalid token accepted");
    } catch (e) {
      if (e.name !== "InvalidTokenError") throw e;
      output.push(e.name);
    }
  }
  return output;
};
