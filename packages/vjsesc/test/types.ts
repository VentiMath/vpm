import jsesc from "vjsesc";
jsesc("π", { quotes: "double", wrap: true });
jsesc(32, { numbers: "binary" });
// @ts-expect-error Babel passes scalar literals.
jsesc({ value: 1 });
