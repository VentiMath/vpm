"use strict";
const CSI = "\x1b[";
const MAX_REPEAT = 1000000;

function integer(value, signed = false) {
  if (!Number.isSafeInteger(value) || (!signed && value < 0)) {
    throw new RangeError("Terminal coordinates and counts must be safe integers in range");
  }
  return value;
}

function parameter(final) {
  return (count = 1) => CSI + integer(count) + final;
}

function repeat(sequence, count) {
  integer(count);
  if (count > MAX_REPEAT) throw new RangeError("Terminal output exceeds 1000000 repetitions");
  return sequence.repeat(count);
}

function repeated(final) {
  const sequence = CSI + final;
  return (count = 1) => repeat(sequence, count);
}

const cursor = {
  to(column, row) {
    integer(column);
    if (column === Number.MAX_SAFE_INTEGER) throw new RangeError("Column is out of range");
    if (row === undefined) return CSI + (column + 1) + "G";
    integer(row);
    if (row === Number.MAX_SAFE_INTEGER) throw new RangeError("Row is out of range");
    return CSI + (row + 1) + ";" + (column + 1) + "H";
  },
  move(horizontal = 0, vertical = 0) {
    integer(horizontal, true);
    integer(vertical, true);
    const x = horizontal ? CSI + Math.abs(horizontal) + (horizontal < 0 ? "D" : "C") : "";
    const y = vertical ? CSI + Math.abs(vertical) + (vertical < 0 ? "A" : "B") : "";
    return x + y;
  },
  up: parameter("A"), down: parameter("B"),
  forward: parameter("C"), backward: parameter("D"),
  nextLine: repeated("E"), prevLine: repeated("F"),
  left: CSI + "G", hide: CSI + "?25l", show: CSI + "?25h",
  save: "\x1b7", restore: "\x1b8",
};
const erase = {
  screen: CSI + "2J", line: CSI + "2K",
  lineEnd: CSI + "K", lineStart: CSI + "1K",
  up: repeated("1J"), down: repeated("J"),
  lines(count = 0) {
    integer(count);
    if (count > MAX_REPEAT) throw new RangeError("Terminal output exceeds 1000000 repetitions");
    return count ? repeat(CSI + "2K" + CSI + "1A", count - 1) + CSI + "2K" + CSI + "G" : "";
  },
};
module.exports = { cursor, erase, scroll: {up: repeated("S"), down: repeated("T")}, beep: "\x07", clear: {screen: "\x1bc"} };
