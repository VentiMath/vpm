"use strict";
// Edit distance over UTF-16 code units, matching Babel's option names and ties.
// One row is sufficient: retain the previous diagonal while updating left to right.
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(
        above + 1,
        row[j - 1] + 1,
        diagonal + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length];
}
function findSuggestion(value, candidates) {
  let best = Infinity,
    suggestion;
  for (const candidate of candidates) {
    if (Math.abs(candidate.length - value.length) >= best) continue;
    const score = distance(candidate, value);
    if (score < best) {
      best = score;
      suggestion = candidate;
    }
    if (best === 0) break;
  }
  return suggestion;
}
class OptionValidator {
  constructor(descriptor) {
    this.descriptor = descriptor;
  }
  formatMessage(message) {
    return this.descriptor + ": " + message;
  }
  invariant(condition, message) {
    if (!condition) throw new Error(this.formatMessage(message));
  }
  validateBooleanOption(name, value, defaultValue) {
    if (value === undefined) return defaultValue;
    this.invariant(
      typeof value === "boolean",
      "'" + name + "' option must be a boolean.",
    );
    return value;
  }
  validateStringOption(name, value, defaultValue) {
    if (value === undefined) return defaultValue;
    this.invariant(
      typeof value === "string",
      "'" + name + "' option must be a string.",
    );
    return value;
  }
  validateTopLevelOptions(options, shape) {
    const names = Object.keys(shape),
      valid = new Set(names);
    for (const key of Object.keys(options)) {
      if (valid.has(key)) continue;
      throw new Error(
        this.formatMessage(
          "'" +
            key +
            "' is not a valid top-level option.\n- Did you mean '" +
            findSuggestion(key, names) +
            "'?",
        ),
      );
    }
  }
}
module.exports = { OptionValidator, findSuggestion };
