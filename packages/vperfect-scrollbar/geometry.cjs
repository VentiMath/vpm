"use strict";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function axis(view, content, position, settings, name) {
  const range = Math.max(0, content - view),
    active =
      view > 0 &&
      !settings["suppressScroll" + name] &&
      range > settings["scroll" + name + "MarginOffset"];
  const length = active
    ? clamp(
        (view * view) / content,
        Math.min(view, settings.minScrollbarLength ?? 0),
        Math.min(view, settings.maxScrollbarLength ?? view),
      )
    : 0;
  const pos = clamp(position, 0, range),
    travel = Math.max(0, view - length);
  return {
    active,
    range,
    length,
    travel,
    offset: range ? (travel * pos) / range : 0,
    reach: pos <= 0 ? "start" : pos >= range ? "end" : null,
  };
}
module.exports = { axis, clamp };
