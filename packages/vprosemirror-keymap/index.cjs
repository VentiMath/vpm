"use strict";
const { keyName, base } = require("vw3c-keyname");
const { Plugin } = require("vprosemirror-state");
const platform = typeof navigator === "undefined" ? "" : navigator.platform;
const apple = /Mac|iPhone|iPad|iPod/.test(platform),
  windows = /Win/.test(platform);
const SHIFT = 1,
  ALT = 2,
  CTRL = 4,
  META = 8;
const modifiers = {
  __proto__: null,
  Shift: SHIFT,
  shift: SHIFT,
  s: SHIFT,
  Alt: ALT,
  alt: ALT,
  a: ALT,
  Ctrl: CTRL,
  ctrl: CTRL,
  Control: CTRL,
  control: CTRL,
  c: CTRL,
  Meta: META,
  meta: META,
  Cmd: META,
  cmd: META,
  m: META,
  Mod: apple ? META : CTRL,
  mod: apple ? META : CTRL,
};
function compile(bindings) {
  const table = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ];
  for (const binding of Object.keys(bindings ?? {})) {
    // A final '-' belongs to the key itself (e.g. Ctrl--).
    const separator =
      binding.length > 1 ? binding.lastIndexOf("-", binding.length - 2) : -1;
    let name = binding.slice(separator + 1),
      mask = 0;
    if (name === "Space") name = " ";
    if (separator >= 0)
      for (let start = 0; start <= separator; ) {
        const end = binding.indexOf("-", start);
        const modifier = binding.slice(start, end);
        start = end + 1;
        const flag = modifiers[modifier] ?? modifiers[modifier.toLowerCase()];
        if (flag === undefined)
          throw new Error("Unrecognized modifier name: " + modifier);
        mask |= flag;
      }
    (table[mask] ??= { __proto__: null })[name] = bindings[binding];
  }
  return table;
}
function keydownHandler(bindings) {
  const table = compile(bindings);
  return function handleKeyDown(view, event) {
    const name = keyName(event),
      mask =
        (event.shiftKey ? SHIFT : 0) |
        (event.altKey ? ALT : 0) |
        (event.ctrlKey ? CTRL : 0) |
        (event.metaKey ? META : 0),
      row = table[mask];
    let command = row?.[name];
    if (command && command(view.state, view.dispatch, view)) return true;
    if (name.length !== 1 || name === " ") return false;
    if (mask & SHIFT) {
      command = table[mask & ~SHIFT]?.[name];
      if (command && command(view.state, view.dispatch, view)) return true;
    }
    if (
      mask & (ALT | CTRL | META) &&
      !(windows && (mask & (CTRL | ALT)) === (CTRL | ALT))
    ) {
      const plain = base[event.keyCode];
      if (plain && plain !== name) {
        command = row?.[plain];
        if (command && command(view.state, view.dispatch, view)) return true;
      }
    }
    return false;
  };
}
function keymap(bindings) {
  return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
}
module.exports = { keymap, keydownHandler };
