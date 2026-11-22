# vbabel-helper-validator-option

Independent option validation for Babel builds. The API matches `@babel/helper-validator-option` 7.29.7 with no runtime dependencies.

```js
import { OptionValidator, findSuggestion } from "vbabel-helper-validator-option";

const options = new OptionValidator("build");
options.validateTopLevelOptions({ debug: false }, { debug: true });
options.validateBooleanOption("debug", undefined, false);
findSuggestion("chorme", ["chrome", "firefox", "node"]);
```

The validator checks enumerable option names and boolean/string values, supplies defaults only for `undefined`, and prefixes diagnostic messages with its descriptor. `invariant` and `formatMessage` support callers’ custom checks. Suggestions use UTF-16 edit distance and choose the first equally close candidate. An empty candidate list returns `undefined`.

The suggestion search uses one distance row and a running minimum. It supports large candidate lists without passing the entire list as function arguments. Tests compare the original API, generated suggestion cases, and unchanged compilation-targets 7.28.6/7.29.13 and Babel Core 7.29.0. [Measurements](bench/results/README.md).
