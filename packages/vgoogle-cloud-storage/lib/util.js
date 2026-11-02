"use strict";
const { stringify } = require("node:querystring");
exports.GCCL_GCS_CMD_KEY = "gcclGcsCmd";
exports.normalize = (options, callback) =>
  typeof options === "function"
    ? { options: {}, callback: options }
    : { options: options || {}, callback };
exports.objectEntries = Object.entries;
const fixed = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
exports.fixedEncodeURIComponent = fixed;
exports.encodeURI = (value, slashes = false) =>
  value
    .split("/")
    .map(fixed)
    .join(slashes ? "%2F" : "/");
exports.qsStringify = (value) =>
  stringify(value, "&", "=", { encodeURIComponent: fixed });
exports.objectKeyToLowercase = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k.toLowerCase(), v]),
  );
exports.unicodeJSONStringify = (value) =>
  JSON.stringify(value).replace(
    /[\u0080-\uffff]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
exports.formatAsUTCISO = (
  value,
  time = false,
  dateDelimiter = "",
  timeDelimiter = "",
) => {
  const p = (n) => String(n).padStart(2, "0");
  const date = [
    String(value.getUTCFullYear()).padStart(4, "0"),
    p(value.getUTCMonth() + 1),
    p(value.getUTCDate()),
  ].join(dateDelimiter);
  return (
    date +
    (time
      ? "T" +
        [
          p(value.getUTCHours()),
          p(value.getUTCMinutes()),
          p(value.getUTCSeconds()),
        ].join(timeDelimiter) +
        "Z"
      : "")
  );
};
exports.validateContexts = (contexts) => {
  for (const [key, entry] of Object.entries(contexts?.custom || {})) {
    if (key.includes('"'))
      throw Error(
        'Invalid context key "' + key + '": Forbidden character (") detected.',
      );
    if (entry?.value?.includes('"'))
      throw Error(
        'Invalid context value for key "' +
          key +
          '": Forbidden character (") detected.',
      );
  }
};
exports.getRuntimeTrackingString = () => `gl-node/${process.versions.node}`;
exports.getUserAgentString = () => {
  const p = require("../package.json");
  return p.name + "/" + p.version;
};
exports.getModuleFormat = () => "CJS";
exports.getDirName = () => __dirname;
function lazy(name, select) {
  let promise;
  return () =>
    (promise ||= Promise.resolve()
      .then(() => select(require(name)))
      .catch((error) => {
        promise = undefined;
        throw error;
      }));
}
exports.getMime = lazy("vmime", (m) => (m.default?.getType ? m.default : m));
exports.getPLimit = lazy("vp-limit", (m) =>
  typeof m === "function" ? m : m.default,
);
