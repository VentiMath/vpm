"use strict";
const assert = require("node:assert/strict");
const vpm = require(
  process.env.VPM_AUTOSUGGEST_ENTRY || "../../packages/vautosuggest-highlight",
);
const upstream = {
  match: require("autosuggest-highlight/match"),
  parse: require("autosuggest-highlight/parse"),
};
// The navigation caller filters with match, caps at ten, then renders parse
// parts as text nodes. These synthetic labels contain no private application data.
const labels = [
  "Practice & Library",
  "Results",
  "AMC 8",
  "AMC 10",
  "AMC 12",
  "BAMO",
  "NCMO",
  "NCJMO",
  "HMMT",
  "BMT",
  "SMT",
  "PUMaC",
  "CMIMC",
  "Duke Math Meet",
  "Proctor Manual",
  "Café",
  "<img src=x onerror=alert(1)>",
  ...Array.from({ length: 15 }, (_, i) => "Practice " + i),
];
function suggestions(api, query) {
  const input = query
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (!input) return [];
  return labels
    .filter((label) => api.match(label, input).length)
    .slice(0, 10)
    .map((label) => ({
      label,
      parts: api.parse(label, api.match(label, query)),
    }));
}
for (const query of [
  "",
  " ",
  "p",
  "pr",
  "practice",
  "amc",
  "10",
  "math",
  "cafe",
  "library",
  "<img",
  "no result",
])
  assert.deepEqual(suggestions(vpm, query), suggestions(upstream, query));
assert.equal(suggestions(vpm, "practice").length, 10);
assert.equal(
  suggestions(vpm, "<img")[0]
    .parts.map((p) => p.text)
    .join(""),
  labels[16],
);
console.log(
  "Navigation-shaped filtering, ten-result cap and highlight parts: 12 queries pass; strings remain data.",
);
