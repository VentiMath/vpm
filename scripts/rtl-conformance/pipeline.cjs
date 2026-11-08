"use strict";
module.exports = (
  engine,
  plugin,
  css,
  { rtl = true, layer = false, prefix = false } = {},
) => {
  const wrap = (node) => {
    if (node.root) return;
    const child = { ...node, parent: node, root: node };
    Object.assign(node, {
      children: [child],
      length: 6,
      parent: null,
      props: ["mui"],
      return: "",
      root: null,
      type: "@layer",
      value: "@layer mui",
    });
  };
  return engine.serialize(
    engine.compile(css),
    engine.middleware([
      ...(rtl ? [plugin] : []),
      ...(layer ? [wrap] : []),
      ...(prefix ? [engine.prefixer] : []),
      engine.stringify,
    ]),
  );
};
