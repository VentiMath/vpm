"use strict";
// Runs @fullcalendar/react 7.1.3's own React suite (vitest, jsdom) against the
// pinned original (--upstream) or vfullcalendar-react.
const assert = require("node:assert/strict"),
  path = require("node:path");
const { verify } = require("./upstream.cjs"),
  { runVitest } = require("./vitest-run.cjs");
const upstream = process.argv.includes("--upstream");
verify();
const tests = path.join(__dirname, "upstream/react-tests");
if (!upstream) {
  const stats = runVitest({
    upstream: false,
    files: {
      "independent.test.tsx": path.join(__dirname, "independent.test.tsx.txt"),
    },
  });
  for (const file of stats.testResults)
    for (const test of file.assertionResults)
      if (test.status === "failed")
        console.error(test.fullName, test.failureMessages);
  assert.equal(stats.numFailedTests, 0);
  assert.equal(stats.numPassedTests, 11);
  console.log(
    "Independent React calendar: 11 lifecycle, async-source, event, date and safety cases pass.",
  );
  require('./transitions.cjs');
  process.exit(0);
}
const stats = runVitest({
  upstream,
  files: {
    "index.tsx": path.join(tests, "index.tsx.txt"),
    "utils.ts": path.join(tests, "utils.ts.txt"),
  },
});
const failures = stats.testResults.flatMap((file) =>
  file.assertionResults.filter((test) => test.status === "failed"),
);
for (const failure of failures)
  console.log(
    "FAIL",
    failure.fullName,
    "\n ",
    (failure.failureMessages[0] || "")
      .split("\n")
      .slice(0, process.env.STACK ? 14 : 1)
      .join("\n  "),
  );
console.log(
  `${upstream ? "Upstream" : "VPM"} FullCalendar React suite: ${stats.numPassedTests} passed, ${stats.numFailedTests} failed, ${stats.numPendingTests + stats.numTodoTests} skipped of ${stats.numTotalTests}.`,
);
assert.equal(stats.numFailedTests, 0);
assert.equal(stats.numPendingTests + stats.numTodoTests, 0);
assert.equal(stats.numTotalTests, 27);
