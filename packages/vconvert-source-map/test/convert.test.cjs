"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const own = require(".."),
  up = require("node:module").createRequire(
    require.resolve("../../../scripts/source-map-conformance/package.json"),
  )("convert-source-map");
const obj = {
  version: 3,
  sources: ["π/星.ts"],
  names: [],
  mappings: "AAAA",
  sourcesContent: ["const s='🙏,+';\n"],
};
test("JS and CSS annotations roundtrip Unicode and preserve the last mapping", () => {
  for (const encoding of ["uri", "base64"])
    for (const multiline of [false, true])
      for (const marker of ["@", "#"]) {
        const comment = up
          .fromObject(obj)
          .toComment({ encoding, multiline })
          .replace("#", marker);
        const source =
          "code();\n" + up.fromObject({}).toComment() + "\n" + comment;
        assert.equal(
          own.fromObject(obj).toComment({ encoding, multiline }),
          up.fromObject(obj).toComment({ encoding, multiline }),
        );
        assert.deepEqual(own.fromComment(comment).toObject(), obj);
        assert.deepEqual(own.fromSource(source).toObject(), obj);
        assert.equal(own.removeComments(source), up.removeComments(source));
        assert.deepEqual(
          [...comment.matchAll(own.commentRegex)],
          [...comment.matchAll(up.commentRegex)],
        );
      }
  assert.equal(own.fromSource("const s='sourceMappingURL=';"), null);
  assert.notEqual(own.commentRegex, own.commentRegex);
  assert.notEqual(own.mapFileCommentRegex, own.mapFileCommentRegex);
});
test("read the last external filename and handle synchronous and asynchronous readers", async () => {
  const source =
    "//# sourceMappingURL=other.map\nx(); /*# sourceMappingURL=main.map?rev=1 */";
  const read = (s) => {
    assert.equal(s, "main.map?rev=1");
    return Buffer.from(JSON.stringify(obj));
  };
  assert.deepEqual(own.fromMapFileSource(source, read).toObject(), obj);
  assert.deepEqual(
    (await own.fromMapFileSource(source, async (s) => read(s))).toObject(),
    obj,
  );
  assert.equal(
    own.removeMapFileComments(source),
    up.removeMapFileComments(source),
  );
  const problem = new Error("reader failed");
  await assert.rejects(
    own.fromMapFileSource(source, async () => {
      throw problem;
    }),
    { cause: problem },
  );
  assert.throws(
    () =>
      own.fromMapFileSource(source, () => {
        throw problem;
      }),
    { cause: problem },
  );
});
test("map fields are own JSON properties and copies are independent", () => {
  const data = Object.create(null),
    c = own.fromObject(data);
  c.addProperty("__proto__", { mapped: true })
    .addProperty("hasOwnProperty", 0)
    .addProperty("sources", ["a"]);
  assert.equal(Object.getPrototypeOf(data), null);
  assert.throws(() => c.addProperty("hasOwnProperty", 1));
  assert.deepEqual(JSON.parse(c.toJSON()).__proto__, { mapped: true });
  c.toObject().sources.push("b");
  assert.deepEqual(data.sources, ["a"]);
});
