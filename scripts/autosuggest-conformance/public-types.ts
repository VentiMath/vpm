import match from "vautosuggest-highlight/match";
import parse from "vautosuggest-highlight/parse";
import {
  match as namedMatch,
  parse as namedParse,
} from "vautosuggest-highlight";
const options: match.Options = {
  insideWords: true,
  findAllOccurrences: true,
  requireMatchAll: true,
};
const ranges: match.Range[] = match("Déjà vu", "deja", options);
const parts: parse.Part[] = parse("Déjà vu", ranges);
const immutable = [[0, 4]] as const;
parse("Déjà vu", immutable);
namedParse("abc", namedMatch("abc", "a"));
// @ts-expect-error query must be a string
match("abc", 1);
// @ts-expect-error option must be a boolean
match("abc", "a", { insideWords: 1 });
void parts;
