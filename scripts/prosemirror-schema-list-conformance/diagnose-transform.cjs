"use strict";
const input = require(
    process.argv[2]
      ? require("node:path").resolve(process.argv[2])
      : "./transform-followup.json",
  ),
  out = {};
for (const name of ["upstream", "vpm"]) {
  const A = require("./node_modules/.vpm-schema-list/api-" + name + ".cjs");
  const base = new A.M.Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block" },
      text: {},
    },
  });
  const schema = new A.M.Schema({
    nodes: A.L.addListNodes(base.spec.nodes, "paragraph block*", "block"),
  });
  const doc = schema.nodeFromJSON(input.doc),
    state = A.S.EditorState.create({
      doc,
      selection: A.S.TextSelection.create(doc, ...input.selection),
    }),
    tr =
      input.operation === "deleteSelection"
        ? state.tr.deleteSelection()
        : state.tr.insertText("x");
  out[name] = { doc: tr.doc.toJSON(), selection: tr.selection.toJSON() };
}
const matches = JSON.stringify(out.upstream) === JSON.stringify(out.vpm);
console.log(JSON.stringify({ matches, ...out }, null, 2));
if (!matches) process.exitCode = 1;
