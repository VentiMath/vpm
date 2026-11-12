"use strict";
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
function pathKeys(path) {
  if (typeof path !== "string")
    throw new TypeError("error paths must be strings");
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  if (
    keys.some(
      (k) =>
        unsafe.has(k) ||
        /[\[\]]/.test(k) ||
        (/^\d+$/.test(k) && Number(k) > 100000),
    )
  )
    throw new TypeError("unsafe validation path");
  return keys;
}
function read(object, name) {
  const keys = pathKeys(name);
  if (object && Object.hasOwn(object, name)) return object[name];
  let value = object;
  for (const key of keys) {
    if (value == null || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}
function write(object, name, value) {
  const keys = pathKeys(name);
  let node = object;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (i === keys.length - 1) {
      node[key] = value;
      break;
    }
    if (
      !Object.hasOwn(node, key) ||
      !node[key] ||
      typeof node[key] !== "object"
    )
      node[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    node = node[key];
  }
}
function fieldsOf(fields, visit, prefix = "") {
  for (const key of Object.keys(fields || {})) {
    const name = prefix ? prefix + "." + key : key;
    pathKeys(name);
    const field = fields[key];
    if (!field || typeof field !== "object") continue;
    if (field.ref || field.refs) visit(name, field);
    else fieldsOf(field, visit, name);
  }
}
function validateFieldsNatively(errors, options) {
  fieldsOf(options.fields, (name, field) => {
    const message = read(errors, name)?.message || "";
    for (const ref of field.refs?.length ? field.refs : [field.ref]) {
      if (
        typeof ref?.setCustomValidity === "function" &&
        typeof ref.reportValidity === "function"
      ) {
        ref.setCustomValidity(message);
        ref.reportValidity();
      }
    }
  });
}
function toNestErrors(errors, options = {}) {
  const result = {},
    names = options.names || Object.keys(errors),
    arrayRoots = new Set();
  // Registered numeric descendants identify array-level messages. Match literal
  // path segments; names are never treated as regular expressions.
  for (const name of names) {
    const keys = pathKeys(name);
    for (let i = 1; i < keys.length; i++)
      if (/^\d+$/.test(keys[i])) arrayRoots.add(keys.slice(0, i).join("."));
  }
  for (const name of Object.keys(errors)) {
    const source = errors[name];
    pathKeys(name);
    const error = { ...source, ref: read(options.fields, name)?.ref };
    if (arrayRoots.has(name))
      write(result, name, { ...read(result, name), root: error });
    else write(result, name, error);
  }
  if (options.shouldUseNativeValidation)
    validateFieldsNatively(errors, options);
  return result;
}
module.exports = { toNestErrors, validateFieldsNatively };
