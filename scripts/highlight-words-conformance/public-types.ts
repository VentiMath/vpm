import highlightWords, { type HighlightWords } from "vhighlight-words";
const chunks: HighlightWords.Chunk[] = highlightWords({
  text: "AMC 12",
  query: "amc",
});
highlightWords({ text: "abc", query: /b/g, clipBy: 2, matchExactly: true });
// @ts-expect-error text must be a string
highlightWords({ text: 5, query: "5" });
// @ts-expect-error a query is required
highlightWords({ text: "abc" });
void chunks;
