"use strict";
const basic = require("./basic.cjs"),
  split = require("./split.cjs"),
  join = require("./join.cjs"),
  marks = require("./marks.cjs");
const { deliver, defaultTextblock, ...commands } = basic;
Object.assign(commands, split, join, marks);
const back = basic.chainCommands(
    basic.deleteSelection,
    join.joinBackward,
    join.selectNodeBackward,
  ),
  forward = basic.chainCommands(
    basic.deleteSelection,
    join.joinForward,
    join.selectNodeForward,
  );
const pcBaseKeymap = {
  Enter: basic.chainCommands(
    basic.newlineInCode,
    basic.createParagraphNear,
    basic.liftEmptyBlock,
    split.splitBlock,
  ),
  "Mod-Enter": basic.exitCode,
  Backspace: back,
  "Mod-Backspace": back,
  Delete: forward,
  "Mod-Delete": forward,
  "Mod-a": basic.selectAll,
};
const macBaseKeymap = {
  ...pcBaseKeymap,
  "Ctrl-h": back,
  "Alt-Backspace": back,
  "Ctrl-d": forward,
  "Ctrl-Alt-Backspace": forward,
  "Alt-Delete": forward,
  "Alt-d": forward,
  "Ctrl-a": basic.selectTextblockStart,
  "Ctrl-e": basic.selectTextblockEnd,
};
const platform =
  typeof navigator !== "undefined"
    ? navigator.platform
    : typeof process !== "undefined"
      ? process.platform
      : "";
module.exports = {
  ...commands,
  pcBaseKeymap,
  macBaseKeymap,
  baseKeymap: /Mac|iP(hone|ad|od)|darwin/.test(platform)
    ? macBaseKeymap
    : pcBaseKeymap,
};
