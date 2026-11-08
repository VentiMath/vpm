"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  candidate,
} = require("../../../scripts/react-virtual-conformance/load.cjs");
test("server output agrees with both current and application controls", () => {
  require("../../../scripts/react-virtual-conformance/ssr.cjs");
});
test("core exports retain identity; two React hooks are added", () => {
  const core = require("../../vtanstack-virtual-core"),
    api = candidate();
  for (const key of Object.keys(core)) assert.equal(api[key], core[key], key);
  assert.deepEqual(
    Object.keys(api)
      .filter((key) => !(key in core))
      .sort(),
    ["useVirtualizer", "useWindowVirtualizer"],
  );
});
