"use strict";

// These public lookup tables remain mutable for callers that add key codes.
// Numeric lookups must not fall through to Object.prototype properties.
const base = Object.create(null);
const shift = Object.create(null);
const groups = {
  Backspace: [8],
  Tab: [9],
  Enter: [10, 13],
  NumLock: [12, 144],
  Shift: [16, 160, 161],
  Control: [17, 162, 163],
  Alt: [18, 164, 165],
  CapsLock: [20],
  Escape: [27],
  " ": [32],
  PageUp: [33],
  PageDown: [34],
  End: [35],
  Home: [36],
  ArrowLeft: [37],
  ArrowUp: [38],
  ArrowRight: [39],
  ArrowDown: [40],
  PrintScreen: [44],
  Insert: [45],
  Delete: [46],
  Meta: [91, 92],
  ScrollLock: [145],
  "*": [106],
  "+": [107],
  ",": [108],
  "-": [109],
  ".": [110],
  "/": [111],
};
for (const name of Object.keys(groups))
  for (const code of groups[name]) base[code] = name;
const digitShift = ")!@#$%^&*(";
for (let digit = 0; digit < 10; digit++) {
  base[48 + digit] = base[96 + digit] = String(digit);
  shift[48 + digit] = digitShift[digit];
}
for (let letter = 0; letter < 26; letter++) {
  base[65 + letter] = String.fromCharCode(97 + letter);
  shift[65 + letter] = String.fromCharCode(65 + letter);
}
for (let fn = 1; fn <= 24; fn++) base[111 + fn] = "F" + fn;
for (const [codes, plain, upper] of [
  [[59, 186], ";", ":"],
  [[61, 187], "=", "+"],
  [[173, 189], "-", "_"],
  [[188], ",", "<"],
  [[190], ".", ">"],
  [[191], "/", "?"],
  [[192], "`", "~"],
  [[219], "[", "{"],
  [[220], "\\", "|"],
  [[221], "]", "}"],
  [[222], "'", '"'],
])
  for (const code of codes) {
    base[code] = plain;
    shift[code] = upper;
  }
for (const code of Object.keys(base))
  if (shift[code] === undefined) shift[code] = base[code];

const environment = typeof navigator === "undefined" ? null : navigator;
const commandShift = !!environment && /Mac/.test(environment.platform);
const legacyShift =
  !!environment &&
  /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.test(environment.userAgent);
function keyName(event) {
  let key = event.key;
  let fallback = !key || key === "Unidentified";
  if (event.shiftKey && !fallback) {
    if (legacyShift && key.length === 1) fallback = true;
    else if (commandShift && event.metaKey && !event.ctrlKey && !event.altKey)
      fallback = true;
  }
  if (fallback)
    key =
      (event.shiftKey ? shift : base)[event.keyCode] || key || "Unidentified";
  switch (key) {
    case "Esc":
      return "Escape";
    case "Del":
      return "Delete";
    case "Left":
      return "ArrowLeft";
    case "Right":
      return "ArrowRight";
    case "Up":
      return "ArrowUp";
    case "Down":
      return "ArrowDown";
    default:
      return key;
  }
}
module.exports = { keyName, base, shift };
