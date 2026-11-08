import rtl from "vstylis-plugin-rtl";
const element: Parameters<typeof rtl>[0] = {
  type: "decl",
  value: "left:1px;",
  props: "left",
  children: "1px",
  parent: null,
  line: 1,
  column: 1,
  length: 4,
  return: "",
};
rtl(element, 0, [element]);
// @ts-expect-error AST nodes are required
rtl("left:1px", 0, []);
