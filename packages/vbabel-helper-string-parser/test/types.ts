import {
  readStringContents,
  readCodePoint,
  readInt,
  type StringErrors,
} from "vbabel-helper-string-parser";
declare const errors: StringErrors;
const cooked: string = readStringContents(
  "template",
  "hello",
  0,
  0,
  1,
  errors,
).str;
const point: number | null = readCodePoint("0041", 0, 0, 1, true, errors).code;
const integer: number | null = readInt(
  "10",
  0,
  0,
  1,
  2,
  null,
  false,
  true,
  errors,
).n;
void [cooked, point, integer];
