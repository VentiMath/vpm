"use strict";
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
class PathTemplate {
  constructor(template) {
    this.template = template;
    this.segments = [];
    let cursor = 0,
      source = "^";
    for (const match of template.matchAll(/\{([\w.]+)(?:=([^{}]+))?\}/g)) {
      const literal = template.slice(cursor, match.index),
        pattern = match[2] ?? "*",
        expression = pattern
          .split("/")
          .map((piece) =>
            piece === "**" ? ".+" : piece === "*" ? "[^/]+" : escape(piece),
          )
          .join("/");
      this.segments.push({
        literal,
        key: match[1],
        pattern: new RegExp("^" + expression + "$"),
      });
      source += escape(literal) + "(" + expression + ")";
      cursor = match.index + match[0].length;
    }
    this.suffix = template.slice(cursor);
    if (
      /[{}]/.test(this.suffix) ||
      this.segments.some((x) => /[{}]/.test(x.literal))
    )
      throw new TypeError("Invalid resource template");
    this.expression = new RegExp(source + escape(this.suffix) + "$");
  }
  render(values) {
    let out = "";
    for (const item of this.segments) {
      if (
        !Object.hasOwn(values, item.key) ||
        !item.pattern.test(String(values[item.key]))
      )
        throw new TypeError("Invalid binding: " + item.key);
      out += item.literal + String(values[item.key]);
    }
    return out + this.suffix;
  }
  match(path) {
    const match = this.expression.exec(path);
    if (!match) throw new TypeError("Resource does not match template");
    const result = {};
    this.segments.forEach((item, i) => {
      if (Object.hasOwn(result, item.key) && result[item.key] !== match[i + 1])
        throw new TypeError("Conflicting resource binding");
      Object.defineProperty(result, item.key, {
        value: match[i + 1],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    });
    return result;
  }
}
const routingHeader = {
  fromParams(params) {
    return Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(String(value)),
      )
      .join("&");
  },
};
module.exports = { PathTemplate, routingHeader };
