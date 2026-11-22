import * as c from "vconvert-source-map";
const map = c.fromObject({ sources: ["math.ts"] });
map.getProperty("sources").map((s) => s.length);
c.fromMapFileComment("//# sourceMappingURL=a.map", () =>
  map.toJSON(),
).toBase64();
c.fromMapFileComment("//# sourceMappingURL=a.map", async () =>
  map.toJSON(),
).then((v) => v.toObject());
// @ts-expect-error Version 2 requires a reader function.
c.fromMapFileComment("comment", "directory");
