import themeable from "vreact-themeable";
const classes = themeable({ input: "input", active: "active" });
const p = classes(12, "input", false, null, undefined);
const key: number = p.key;
if ("className" in p) {
  const s: string = p.className;
  void s;
}
const style = themeable({ root: { color: "red", fontSize: 12 } })(
  "root",
  "root",
);
const decorated = themeable([
  { root: { color: "red" } },
  (...styles: { color: string }[]) => styles.map((s) => s.color).join(" "),
] as const);
const cls: string = decorated("key", "root").className;
// @ts-expect-error a theme must be an object or decorated pair
themeable(null);
// @ts-expect-error decorator must return a class string
themeable([{ root: { color: "red" } }, () => 123] as const);
void key;
void style;
void cls;

// @ts-expect-error decorator input must match theme values
themeable([
  { root: { color: "red" } },
  (...values: number[]) => values.join(" "),
] as const);
