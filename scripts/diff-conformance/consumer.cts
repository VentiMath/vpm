import {
  diffWords,
  diffWordsWithSpace,
  type Change,
  type BoundedWordOptions,
} from "vdiff";
const normal: Change[] = diffWords("Find x.", "Find y.");
const spaced: Change[] = diffWordsWithSpace("a b", "a  b");
const boundedOptions: BoundedWordOptions = { maxEditLength: 2 };
const bounded: Change[] | undefined = diffWords("a", "b", boundedOptions);
// @ts-expect-error A bounded search can abort.
const notAlways: Change[] = diffWords("a", "b", boundedOptions);
const asyncResult: undefined = diffWords("a", "b", {
  callback(changes) {
    changes?.forEach((c) => c.value.toUpperCase());
  },
});
diffWords("你好", "你们", {
  intlSegmenter: new Intl.Segmenter("zh", { granularity: "word" }),
});
// @ts-expect-error Patch APIs are not advertised.
import { applyPatch } from "vdiff";
// @ts-expect-error Inputs must be text.
diffWords(3, "b");
// @ts-expect-error Bounds must be numeric.
diffWords("a", "b", { maxEditLength: "2" });
void [normal, spaced, bounded, asyncResult];
