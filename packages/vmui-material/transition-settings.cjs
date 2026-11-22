"use strict";
const easing = {
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
};
const duration = {
  shortest: 150,
  shorter: 200,
  short: 250,
  standard: 300,
  complex: 375,
  enteringScreen: 225,
  leavingScreen: 195,
};
const time = (value) =>
  typeof value === "string" ? value : Math.round(value) + "ms";
function getAutoHeightDuration(height) {
  if (!height) return 0;
  const units = height / 36;
  return Math.min(
    3000,
    Math.round(40 + 150 * Math.pow(units, 0.25) + 2 * units),
  );
}
function createTransitions(options = {}) {
  const {
    easing: curves,
    duration: timings,
    reducedMotion,
    ...custom
  } = options;
  const resolvedEasing = { ...easing, ...curves },
    resolvedDuration = { ...duration, ...timings };
  function create(properties = "all", settings = {}) {
    const ms = time(
      settings.duration === undefined
        ? resolvedDuration.standard
        : settings.duration,
    );
    const curve =
      settings.easing === undefined
        ? resolvedEasing.easeInOut
        : settings.easing;
    const delay = time(settings.delay === undefined ? 0 : settings.delay);
    const suffix = " " + ms + " " + curve + " " + delay;
    return Array.isArray(properties)
      ? properties.map((property) => property + suffix).join(",")
      : properties + suffix;
  }
  return {
    create,
    getAutoHeightDuration,
    ...custom,
    easing: resolvedEasing,
    duration: resolvedDuration,
  };
}
module.exports = { createTransitions, easing, duration, getAutoHeightDuration };
