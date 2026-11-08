"use strict";
module.exports = function themeable(input) {
  const decorated = Array.isArray(input);
  const theme = decorated ? input[0] : input;
  const decorate = decorated ? input[1] : null;
  if (theme === null || typeof theme !== "object")
    throw new TypeError("theme must be an object");
  if (decorated && typeof decorate !== "function")
    throw new TypeError("A decorated theme needs a class-name function");
  return function themed(key, ...names) {
    const values = [];
    for (const name of names) {
      // Lookup before filtering: a map can deliberately have 'false', '0' or
      // inherited entries. Getters run once for each requested name.
      const value = theme[name];
      if (value) values.push(value);
    }
    if (decorate)
      return { key, className: Reflect.apply(decorate, null, values) };
    if (typeof values[0] === "string")
      return { key, className: values.join(" ") };
    let style = {};
    // Spread has native enumerable-string/symbol and getter semantics, but
    // defines __proto__ as data rather than invoking Object.prototype's setter.
    for (const value of values) style = { ...style, ...value };
    return { key, style };
  };
};
