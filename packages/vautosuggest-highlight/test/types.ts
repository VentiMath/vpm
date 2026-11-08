import { match, parse } from "vautosuggest-highlight";
const ranges: [number, number][] = match("Déjà vu", "deja", {
  requireMatchAll: true,
});
const parts: { text: string; highlight: boolean }[] = parse("Déjà vu", ranges);
parse("a", [[0, 1]] as const);
// @ts-expect-error query must be a string
match("abc", 1);
// @ts-expect-error ranges contain two numbers
parse("a", [[0]]);
void parts;
