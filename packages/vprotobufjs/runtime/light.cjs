"use strict";
const api = (module.exports = require("./minimal.cjs"));
const reflection = require("./reflection.cjs");
// Explicit assignments keep Node's CommonJS named-export detection intact.
module.exports.ReflectionObject = reflection.ReflectionObject;
module.exports.Namespace = reflection.Namespace;
module.exports.Root = reflection.Root;
module.exports.Enum = reflection.Enum;
module.exports.Field = reflection.Field;
module.exports.MapField = reflection.MapField;
module.exports.OneOf = reflection.OneOf;
module.exports.Message = reflection.Message;
module.exports.Type = reflection.Type;
module.exports.Method = reflection.Method;
module.exports.Service = reflection.Service;
module.exports.build = "light";
module.exports.load = (files, root, cb) => {
  if (typeof root === "function") {
    cb = root;
    root = null;
  }
  return (root || new api.Root()).load(files, cb);
};
module.exports.loadSync = (files, root) =>
  (root || new api.Root()).loadSync(files);
module.exports.wrappers = Object.create(null);
module.exports.types = {
  basic: reflection.scalarWire,
  long: { int64: 0, uint64: 0, sint64: 0, fixed64: 1, sfixed64: 1 },
  mapKey: {
    int32: 0,
    uint32: 0,
    sint32: 0,
    fixed32: 5,
    sfixed32: 5,
    int64: 0,
    uint64: 0,
    sint64: 0,
    fixed64: 1,
    sfixed64: 1,
    bool: 0,
    string: 2,
  },
};
