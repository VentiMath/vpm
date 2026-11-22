import {
  OptionValidator,
  findSuggestion,
} from "vbabel-helper-validator-option";
const validator = new OptionValidator("build");
const enabled: boolean = validator.validateBooleanOption(
  "enabled",
  true,
  false,
);
const name: string = validator.validateStringOption(
  "name",
  undefined,
  "default",
);
const match: string | undefined = findSuggestion("browsrs", [
  "browsers",
  "node",
]);
validator.validateTopLevelOptions({ node: "24" }, { node: true });
void [enabled, name, match];
// @ts-expect-error Candidates must be strings.
findSuggestion("name", [1]);
