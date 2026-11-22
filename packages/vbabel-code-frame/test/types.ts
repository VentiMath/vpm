import codeFrame, {
  codeFrameColumns,
  highlight,
  type SourceRange,
} from "vbabel-code-frame";
const loc: SourceRange = {
  start: { line: 2, column: 3 },
  end: { line: 2, column: 5 },
};
const formatted: string = codeFrameColumns("const x = ;", loc, {
  forceColor: true,
  message: "Missing expression",
});
const colored: string = highlight(formatted);
codeFrame(colored, 1, 1);
// @ts-expect-error Source columns are numbers.
codeFrameColumns("x", { start: { line: 1, column: "1" } });
