"use strict";
const assert = require("node:assert/strict"),
  { Schema } = require("prosemirror-model"),
  { EditorState } = require("prosemirror-state"),
  load = require("./history.cjs"),
  run = require("./scenario.cjs");
const U = require("rope-sequence"),
  V = require(process.env.VPM_ROPE_ENTRY || "../../packages/vrope-sequence");
for (const version of ["prosemirror-history", "prosemirror-history-app"]) {
  const expected = run(load(version, U), Schema, EditorState, U),
    actual = run(load(version, V), Schema, EditorState, V);
  assert.deepEqual(actual, expected);
  assert(actual.length > 400);
  console.log(
    version +
      ": " +
      actual.length +
      " history snapshots match (undo/redo, depth overflow, grouping, untracked mapping and redo invalidation).",
  );
}
