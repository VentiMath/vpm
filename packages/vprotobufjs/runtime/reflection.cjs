"use strict";
const util = require("./util.cjs"),
  { Reader, Writer, length } = require("./wire.cjs"),
  put = util.put;
const scalarWire = Object.freeze(
  Object.assign(Object.create(null), {
    double: 1,
    float: 5,
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
    bytes: 2,
  }),
);
const longTypes = new Set(["int64", "uint64", "sint64", "fixed64", "sfixed64"]);
const unsigned = (t) => t === "uint64" || t === "fixed64";
function depthCheck(depth) {
  if (depth > util.recursionLimit) throw Error("max depth exceeded");
}
function dict() {
  return Object.create(null);
}
function invalidateCodecs(object) {
  if (object instanceof Field) {
    object.resolved = false;
    object._explicit = object._packed = undefined;
    if (object.parent instanceof Type) invalidateCodecs(object.parent);
    return;
  }
  if (object instanceof Type) {
    object._ctor = null;
    object._fastCodec = undefined;
    delete object.encode;
    delete object.decode;
    for (const field of object.fieldsArray) {
      field.resolved = false;
      field._explicit = field._packed = undefined;
    }
  }
  for (const child of Object.values(object.nested || {}))
    invalidateCodecs(child);
}
class ReflectionObject {
  constructor(name, options) {
    if (typeof name !== "string") throw TypeError("name must be a string");
    this.name = name;
    this.options = options;
    this.parent = null;
    this.resolved = false;
    this.comment = null;
    this.filename = null;
    this.edition = undefined;
  }
  get root() {
    let n = this;
    while (n.parent) n = n.parent;
    return n;
  }
  get fullName() {
    return this.parent ? this.parent.fullName + "." + this.name : this.name;
  }
  getOption(k) {
    return this.options?.[k];
  }
  setOption(k, v, ifNotSet) {
    this.resolved = false;
    this._explicit = this._packed = undefined;
    this.options ||= {};
    if (!ifNotSet || this.options[k] === undefined) put(this.options, k, v);
    invalidateCodecs(this);
    return this;
  }
  setOptions(o, ifNotSet) {
    for (const k of Object.keys(o || {})) this.setOption(k, o[k], ifNotSet);
    return this;
  }
  resolve() {
    this.resolved = true;
    return this;
  }
  toString() {
    return this.constructor.name + " " + this.fullName;
  }
  toJSON() {
    return this.options ? { options: this.options } : {};
  }
}
class Namespace extends ReflectionObject {
  constructor(name, options) {
    super(name, options);
    this.nested = dict();
  }
  get nestedArray() {
    return Object.values(this.nested);
  }
  get _nestedArray() {
    return this.nestedArray;
  }
  get(name) {
    return this.nested[name] || null;
  }
  add(obj) {
    const old = this.get(obj.name);
    if (old && old !== obj) {
      if (old.constructor === Namespace && obj instanceof Namespace) {
        for (const child of old.nestedArray) obj.add(child);
        this.remove(old);
      } else throw Error("duplicate name " + obj.name);
    }
    if (obj.parent && obj.parent !== this) obj.parent.remove(obj);
    put(this.nested, obj.name, obj);
    obj.parent = this;
    if (!Reflect.has(this, obj.name))
      Object.defineProperty(this, obj.name, {
        get: () => obj,
        configurable: true,
      });
    return this;
  }
  remove(obj) {
    if (this.nested[obj.name] !== obj) throw Error("not a child");
    delete this.nested[obj.name];
    obj.parent = null;
    return this;
  }
  define(path, json) {
    let current = this;
    for (const name of path.split(".").filter(Boolean)) {
      let next = current.get(name);
      if (!next) current.add((next = new Namespace(name)));
      if (!(next instanceof Namespace)) throw Error("not a namespace " + name);
      current = next;
    }
    if (json) current.addJSON(json);
    return current;
  }
  addJSON(json) {
    for (const [name, item] of Object.entries(json || {})) {
      let child;
      if (item.fields) child = Type.fromJSON(name, item);
      else if (item.values) child = Enum.fromJSON(name, item);
      else if (item.methods) child = Service.fromJSON(name, item);
      else if (item.id !== undefined) child = Field.fromJSON(name, item);
      else child = new Namespace(name, item.options).addJSON(item.nested);
      child.edition = item.edition;
      child.comment = item.comment ?? null;
      child.filename = item.filename ?? null;
      this.add(child);
    }
    return this;
  }
  lookup(path, types, parentChecked) {
    if (path instanceof ReflectionObject) return path;
    const segments = Array.isArray(path) ? path : String(path).split(".");
    let start = this;
    if (segments[0] === "") {
      start = this.root;
      segments.shift();
      parentChecked = true;
    }
    if (!segments.length) return start;
    for (
      let scope = start;
      scope;
      scope = parentChecked ? null : scope.parent
    ) {
      let value = scope;
      for (const name of segments) {
        value = value instanceof Namespace ? value.get(name) : null;
        if (!value) break;
      }
      if (value && (!types || types.some((T) => value instanceof T)))
        return value;
    }
    return null;
  }
  lookupType(name) {
    const value = this.lookup(name, [Type]);
    if (!value) throw Error("no such type: " + name);
    return value;
  }
  lookupEnum(name) {
    const value = this.lookup(name, [Enum]);
    if (!value) throw Error("no such enum: " + name);
    return value;
  }
  lookupService(name) {
    const value = this.lookup(name, [Service]);
    if (!value) throw Error("no such service: " + name);
    return value;
  }
  lookupTypeOrEnum(name) {
    const value = this.lookup(name, [Type, Enum]);
    if (!value) throw Error("no such type or enum: " + name);
    return value;
  }
  resolveAll() {
    for (const child of this.nestedArray)
      child.resolveAll ? child.resolveAll() : child.resolve();
    return this.resolve();
  }
  toJSON() {
    const out = super.toJSON();
    if (this.nestedArray.length)
      out.nested = Object.fromEntries(
        this.nestedArray.map((x) => [x.name, x.toJSON()]),
      );
    return out;
  }
}
class Root extends Namespace {
  constructor(options) {
    super("", options);
    this.files = [];
    this.deferred = [];
  }
  static fromJSON(json, root = new Root()) {
    root.edition = json.edition;
    root.setOptions(json.options);
    return root.addJSON(json.nested);
  }
  resolveAll() {
    this._ready = true;
    const extensions = [];
    const visit = (n) => {
      for (const child of n.nestedArray || []) {
        if (child instanceof Field && child.extend) extensions.push(child);
        else visit(child);
      }
    };
    visit(this);
    for (const field of extensions) {
      if (field.extensionField) continue;
      field.resolve();
      const target = field.parent.lookupType(field.extend),
        copy = new Field(
          field.fullName,
          field.id,
          field.resolvedType?.fullName || field.type,
          field.rule,
          undefined,
          field.options,
        );
      copy.declaringField = field;
      copy.edition = field.edition;
      field.extensionField = copy;
      target.add(copy);
    }
    super.resolveAll();
    return this;
  }
  resolvePath(origin, target) {
    return require("./schema.cjs").resolvePath(origin, target);
  }
  load(files, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const promise = require("./schema.cjs").load(this, files, options || {});
    if (callback) {
      promise.then(
        (x) => callback(null, x),
        (e) => callback(e),
      );
      return undefined;
    }
    return promise;
  }
  loadSync(files, options) {
    return require("./schema.cjs").loadSync(this, files, options || {});
  }
}
class Enum extends ReflectionObject {
  constructor(name, values = {}, options, comment, comments) {
    super(name, options);
    this.values = dict();
    this.comments = comments || {};
    this.comment = comment;
    for (const [k, v] of Object.entries(values)) this.add(k, v);
  }
  static fromJSON(name, json) {
    const e = new Enum(
      name,
      json.values,
      json.options,
      json.comment,
      json.comments,
    );
    e.reserved = json.reserved;
    return e;
  }
  get valuesById() {
    const out = dict();
    for (const [k, v] of Object.entries(this.values))
      if (!Object.hasOwn(out, v)) out[v] = k;
    return out;
  }
  add(name, id, comment) {
    if (!Number.isInteger(id)) throw TypeError("enum id must be integer");
    if (Object.hasOwn(this.values, name)) throw Error("duplicate enum name");
    put(this.values, name, id);
    if (comment) this.comments[name] = comment;
    return this;
  }
  remove(name) {
    delete this.values[name];
    return this;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      values: { ...this.values },
      ...(this.reserved ? { reserved: this.reserved } : {}),
    };
  }
}
class Field extends ReflectionObject {
  constructor(name, id, type, rule, extend, options) {
    if (typeof rule === "object") {
      options = rule;
      rule = undefined;
    }
    if (typeof extend === "object") {
      options = extend;
      extend = undefined;
    }
    super(name, options);
    if (!Number.isInteger(id) || id <= 0 || id > 536870911)
      throw Error("invalid field id");
    this.id = id;
    this.type = type;
    this.rule = rule;
    this.extend = extend;
    this.repeated = rule === "repeated";
    this.required = rule === "required";
    this.optional = !this.required;
    this.map = false;
    this.partOf = null;
    this.resolvedType = null;
    this.long = longTypes.has(type);
    this.bytes = type === "bytes";
  }
  static fromJSON(name, j) {
    const f = j.keyType
      ? new MapField(name, j.id, j.keyType, j.type, j.options)
      : new Field(name, j.id, j.type, j.rule, j.extend, j.options);
    f.jsonName = j.jsonName ?? j.options?.json_name;
    f.protoName = j.protoName || name;
    return f;
  }
  resolve() {
    if (this.resolved) return this;
    if (!(this.type in scalarWire)) {
      this.resolvedType = this.parent.lookupTypeOrEnum(this.type);
    }
    this.typeDefault =
      this.resolvedType instanceof Type
        ? null
        : this.resolvedType instanceof Enum
          ? (Object.values(this.resolvedType.values)[0] ?? 0)
          : this.type === "string"
            ? ""
            : this.type === "bool"
              ? false
              : this.bytes
                ? util.newBuffer([])
                : this.long
                  ? util.Long
                    ? util.Long.fromBits(0, 0, unsigned(this.type))
                    : 0
                  : 0;
    if (
      this.options?.packed !== undefined &&
      (this.resolvedType instanceof Type ||
        this.type === "string" ||
        this.type === "bytes")
    ) {
      delete this.options.packed;
      if (!Object.keys(this.options).length) this.options = undefined;
    }
    this.protoName ||= this.name;
    this.jsonName ??=
      this.options?.json_name ??
      this.protoName.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
    this.defaultValue = this.map
      ? util.emptyObject
      : this.repeated
        ? util.emptyArray
        : this.options?.default !== undefined
          ? convert(this, this.options.default, 0)
          : this.typeDefault;
    return super.resolve();
  }
  feature(name) {
    if (this.declaringField) return this.declaringField.feature(name);
    let n = this;
    while (n) {
      if (n.options?.features?.[name] || n.options?.["features." + name])
        return n.options.features?.[name] || n.options["features." + name];
      if (n.edition) {
        if (name === "field_presence")
          return n.edition === "proto3" ? "IMPLICIT" : "EXPLICIT";
        if (name === "repeated_field_encoding")
          return n.edition === "proto2" ? "EXPANDED" : "PACKED";
        if (name === "utf8_validation")
          return n.edition === "proto2" ? "NONE" : "VERIFY";
        if (name === "enum_type")
          return n.edition === "proto2" ? "CLOSED" : "OPEN";
      }
      n = n.parent;
    }
    return {
      field_presence: "IMPLICIT",
      repeated_field_encoding: "PACKED",
      utf8_validation: "VERIFY",
      enum_type: "OPEN",
    }[name];
  }
  get explicit() {
    return (this._explicit ??=
      !!this.partOf ||
      this.required ||
      this.options?.proto3_optional ||
      this.feature("field_presence") !== "IMPLICIT" ||
      this.resolvedType instanceof Type);
  }
  get packed() {
    return (this._packed ??=
      !this.map &&
      this.repeated &&
      this.type !== "string" &&
      this.type !== "bytes" &&
      !(this.resolvedType instanceof Type) &&
      (this.options?.packed ??
        this.feature("repeated_field_encoding") === "PACKED"));
  }
  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.rule ? { rule: this.rule } : {}),
      type: this.type,
      id: this.id,
      ...(this.extend ? { extend: this.extend } : {}),
      ...(this.map ? { keyType: this.keyType } : {}),
    };
  }
}
class MapField extends Field {
  constructor(name, id, keyType, type, options) {
    super(name, id, type, undefined, undefined, options);
    if (
      !(keyType in scalarWire) ||
      ["float", "double", "bytes"].includes(keyType)
    )
      throw Error("invalid map key");
    this.keyType = keyType;
    this.map = true;
  }
}
class OneOf extends ReflectionObject {
  constructor(name, fields = [], options) {
    super(name, options);
    this.oneof = fields;
    this.fieldsArray = [];
  }
  static fromJSON(name, j) {
    return new OneOf(name, j.oneof, j.options);
  }
  add(field) {
    if (!this.oneof.includes(field.name)) this.oneof.push(field.name);
    field.partOf = this;
    if (this.parent && !this.parent.fields[field.name]) this.parent.add(field);
    return this;
  }
  toJSON() {
    return { ...super.toJSON(), oneof: this.oneof };
  }
}
class Message {
  constructor(properties) {
    if (properties)
      for (const k of Object.keys(properties)) put(this, k, properties[k]);
  }
  toJSON() {
    return this.$type.toObject(this, util.toJSONOptions);
  }
}
class Type extends Namespace {
  constructor(name, options) {
    super(name, options);
    this.fields = dict();
    this.oneofs = dict();
    this._ctor = null;
    this._fastCodec = undefined;
    this._syntax = "proto3";
  }
  static fromJSON(name, json) {
    const t = new Type(name, json.options);
    t._syntax =
      json.syntax === "proto2" || json.edition === "proto2"
        ? "proto2"
        : "proto3";
    t.edition = json.edition;
    t.group = !!json.group;
    t.extensions = json.extensions;
    t.reserved = json.reserved;
    for (const [k, f] of Object.entries(json.fields || {}))
      t.add(Field.fromJSON(k, f));
    for (const [k, v] of Object.entries(json.oneofs || {}))
      t.add(OneOf.fromJSON(k, v));
    t.addJSON(json.nested);
    return t;
  }
  get fieldsArray() {
    return (this._fieldList ||= Object.values(this.fields));
  }
  get fieldsById() {
    return (this._fieldIds ||= Object.fromEntries(
      this.fieldsArray.map((f) => [f.id, f]),
    ));
  }
  get oneofsArray() {
    return Object.values(this.oneofs);
  }
  get(name) {
    return this.fields[name] || this.oneofs[name] || super.get(name);
  }
  add(obj) {
    if (obj instanceof Field && !obj.extend) {
      if (
        this.fields[obj.name] ||
        this.fieldsArray.some((f) => f.id === obj.id)
      )
        throw Error("duplicate field");
      put(this.fields, obj.name, obj);
      obj.parent = this;
      invalidateCodecs(this);
      this._fieldList = this._fieldIds = this._sortedFields = null;
      return this;
    }
    if (obj instanceof OneOf) {
      put(this.oneofs, obj.name, obj);
      obj.parent = this;
      invalidateCodecs(this);
      for (const name of obj.oneof) {
        const f = this.fields[name];
        if (f) {
          f.partOf = obj;
          obj.fieldsArray.push(f);
        }
      }
      return this;
    }
    return super.add(obj);
  }
  remove(obj) {
    if (this.fields[obj.name] === obj) {
      delete this.fields[obj.name];
      obj.parent = null;
      invalidateCodecs(this);
      this._fieldList = this._fieldIds = this._sortedFields = null;
      return this;
    }
    return super.remove(obj);
  }
  get ctor() {
    if (this._ctor) return this._ctor;
    if (this.root instanceof Root && !this.root._ready) this.root.resolveAll();
    if (!this._ctor) {
      const type = this;
      const containers = type.fieldsArray.filter((f) => f.map || f.repeated);
      const C = class extends Message {
        constructor(properties) {
          super();
          for (const f of containers)
            if (f.map) put(this, f.name, {});
            else if (f.repeated) put(this, f.name, []);
          if (properties)
            for (const k of Object.keys(properties))
              if (properties[k] != null) put(this, k, properties[k]);
        }
      };
      Object.defineProperty(C, "name", { value: this.name });
      this._ctor = C;
      Object.defineProperty(C, "$type", { value: this });
      Object.defineProperty(C.prototype, "$type", { value: this });
      for (const f of this.fieldsArray) {
        f.resolve();
        put(C.prototype, f.name, f.defaultValue);
      }
      for (const o of this.oneofsArray)
        Object.defineProperty(C.prototype, o.name, {
          get: util.oneOfGetter(o.oneof),
          set: util.oneOfSetter(o.oneof),
          configurable: true,
        });
      for (const key of [
        "create",
        "encode",
        "encodeDelimited",
        "decode",
        "decodeDelimited",
        "verify",
        "fromObject",
        "toObject",
        "getTypeUrl",
      ])
        C[key] = this[key].bind(this);
    }
    return this._ctor;
  }
  set ctor(C) {
    delete this.encode;
    delete this.decode;
    this._ctor = C;
    this._fastCodec = undefined;
    Object.defineProperty(C.prototype, "$type", {
      value: this,
      configurable: true,
    });
  }
  create(o) {
    return new this.ctor(o);
  }
  resolveAll() {
    for (const f of this.fieldsArray) f.resolve();
    return super.resolveAll();
  }
  setup() {
    this.resolveAll();
    void this.ctor;
    return this;
  }
  fastCodec() {
    if (this._fastCodec === undefined) {
      this._fastCodec = require("./flat.cjs")(
        this,
        util,
        require("./wire.cjs"),
        scalarWire,
      );
      if (this._fastCodec) {
        this.encode = this._fastCodec.encode;
        this.decode = this._fastCodec.decode;
      }
    }
    return this._fastCodec;
  }
  encode(m, w = Writer.create(), depth = 0) {
    const fast = this.fastCodec();
    if (fast) return fast.encode(m, w, depth);
    depthCheck(depth);
    for (const f of (this._sortedFields ||= this.fieldsArray.toSorted(
      (a, b) => a.id - b.id,
    ))) {
      f.resolve();
      const value = m[f.name];
      if (value == null || (!Object.hasOwn(m, f.name) && !f.required)) continue;
      if (!f.map && !f.repeated && !f.explicit && isDefault(f, value)) continue;
      if (f.map) {
        for (const key of Object.keys(value)) {
          w.uint32(f.id * 8 + 2).fork();
          writeScalar(
            f.keyType,
            w,
            1,
            f.keyType === "bool" ? util.boolFromKey(key) : key,
          );
          writeField(f, w, value[key], 2, depth);
          w.ldelim();
        }
      } else if (f.repeated) {
        if (f.packed && value.length) {
          w.uint32(f.id * 8 + 2).fork();
          for (const v of value)
            w[f.resolvedType instanceof Enum ? "int32" : f.type](v);
          w.ldelim();
        } else for (const v of value) writeField(f, w, v, f.id, depth);
      } else writeField(f, w, value, f.id, depth);
    }
    if (Object.hasOwn(m, "$unknowns"))
      for (const b of m.$unknowns || []) w.raw(b);
    return w;
  }
  encodeDelimited(m, w = Writer.create()) {
    return this.encode(m, w.fork()).ldelim();
  }
  decode(input, n, depth = 0) {
    const fast = this.fastCodec();
    if (fast) return fast.decode(input, n, depth);
    depthCheck(depth);
    const r = input instanceof Reader ? input : Reader.create(input);
    if (n !== undefined) length(n);
    const end = n === undefined ? r.len : r.pos + n;
    if (end > r.len) throw RangeError("index out of range");
    const outer = r.len;
    r.len = end;
    const m = this.create(),
      fields = this.fieldsById;
    try {
      while (r.pos < end) {
        const start = r.pos,
          tag = r.tag(),
          id = tag >>> 3,
          wire = tag & 7;
        if (!id) throw Error("illegal tag: field number 0");
        const f = fields[id];
        if (!f) {
          r.skipType(wire, depth, id);
          if (!r.discardUnknown) {
            util.makeProp(m, "$unknowns", false);
            (m.$unknowns ||= []).push(r.raw(start, r.pos));
          }
          continue;
        }
        f.resolve();
        if (f.map) {
          if (wire !== 2) throw Error("invalid map wire type");
          const size = r.size();
          r.need(size);
          const stop = r.pos + size,
            limit = r.len;
          r.len = stop;
          let key =
              f.keyType === "string" ? "" : f.keyType === "bool" ? false : 0,
            value = f.typeDefault;
          try {
            while (r.pos < stop) {
              const t = r.tag(),
                i = t >>> 3;
              if (i === 1) {
                if ((t & 7) !== scalarWire[f.keyType])
                  throw Error("invalid map key wire type");
                key =
                  r[
                    f.keyType === "string" &&
                    f.feature("utf8_validation") === "VERIFY"
                      ? "stringVerify"
                      : f.keyType
                  ]();
              } else if (i === 2) value = readField(f, r, t & 7, depth);
              else r.skipType(t & 7, depth, i);
            }
          } finally {
            r.len = limit;
          }
          if (unknownEnum(f, value)) rememberUnknown(m, r, r.raw(start, r.pos));
          else put(m[f.name], String(key), value);
        } else if (
          f.repeated &&
          wire === 2 &&
          f.type !== "string" &&
          f.type !== "bytes" &&
          !(f.resolvedType instanceof Type)
        ) {
          if (closedEnum(f)) {
            const n = r.size();
            r.need(n);
            const limit = r.len,
              end = r.pos + n;
            r.len = end;
            try {
              while (r.pos < end) {
                const start = r.pos,
                  value = r.int32();
                if (unknownEnum(f, value))
                  rememberUnknown(
                    m,
                    r,
                    util.rawField(f.id, 0, r.raw(start, r.pos)),
                  );
                else m[f.name].push(value);
              }
            } finally {
              r.len = limit;
            }
          } else
            r.packed(
              f.resolvedType instanceof Enum ? "int32" : f.type,
              m[f.name],
            );
        } else {
          const value = readField(f, r, wire, depth);
          if (unknownEnum(f, value)) rememberUnknown(m, r, r.raw(start, r.pos));
          else if (f.repeated) m[f.name].push(value);
          else if (f.resolvedType instanceof Type && Object.hasOwn(m, f.name))
            mergeMessage(f.resolvedType, m[f.name], value, depth + 1);
          else put(m, f.name, value);
        }
      }
      for (const f of this.fieldsArray)
        if (f.required && !Object.hasOwn(m, f.name))
          throw new util.ProtocolError("missing required " + f.name, {
            instance: m,
          });
      return m;
    } finally {
      r.len = outer;
    }
  }
  decodeDelimited(input) {
    const r = input instanceof Reader ? input : Reader.create(input);
    return this.decode(r, r.size());
  }
  fromObject(o, depth = 0) {
    depthCheck(depth);
    if (o instanceof this.ctor) return o;
    if (!o || typeof o !== "object") throw TypeError("object expected");
    const m = this.create();
    for (const f of this.fieldsArray) {
      f.resolve();
      const v = o[f.name];
      if (v == null) continue;
      if (f.map) {
        if (typeof v !== "object" || Array.isArray(v))
          throw TypeError(f.fullName + ": object expected");
        for (const k of Object.keys(v)) {
          const value = convert(f, v[k], depth);
          if (value !== undefined) put(m[f.name], k, value);
        }
      } else if (f.repeated) {
        if (!Array.isArray(v)) throw TypeError(f.fullName + ": array expected");
        for (const x of v) {
          const n = convert(f, x, depth);
          if (n !== undefined) m[f.name].push(n);
        }
      } else {
        const n = convert(f, v, depth);
        if (n !== undefined) put(m, f.name, n);
      }
    }
    return m;
  }
  toObject(m, options = {}, depth = 0) {
    depthCheck(depth);
    const o = {};
    for (const f of this.fieldsArray) {
      f.resolve();
      if (f.map) {
        if (options.objects || options.defaults) put(o, f.name, {});
        if (m[f.name] && Object.keys(m[f.name]).length) {
          const out = {};
          for (const k of Object.keys(m[f.name]))
            put(out, k, convertOut(f, m[f.name][k], options, depth));
          put(o, f.name, out);
        }
      } else if (f.repeated) {
        if (options.arrays || options.defaults) put(o, f.name, []);
        if (m[f.name]?.length)
          put(
            o,
            f.name,
            m[f.name].map((v) => convertOut(f, v, options, depth)),
          );
      } else {
        if (options.defaults && !f.partOf)
          put(o, f.name, convertOut(f, f.defaultValue, options, depth));
        if (m[f.name] != null && Object.hasOwn(m, f.name)) {
          put(o, f.name, convertOut(f, m[f.name], options, depth));
          if (options.oneofs && f.partOf) put(o, f.partOf.name, f.name);
        }
      }
    }
    return o;
  }
  verify(m, depth = 0) {
    depthCheck(depth);
    if (!m || typeof m !== "object") return "object expected";
    const oneofs = new Set();
    for (const f of this.fieldsArray) {
      f.resolve();
      const v = m[f.name];
      if (v == null && !f.required) continue;
      if (f.partOf && v != null && Object.hasOwn(m, f.name)) {
        if (oneofs.has(f.partOf)) return f.partOf.name + ": multiple values";
        oneofs.add(f.partOf);
      }
      if (f.map) {
        if (!v || typeof v !== "object" || Array.isArray(v))
          return f.name + ": object expected";
        for (const [k, x] of Object.entries(v)) {
          if (
            (f.keyType === "bool" && !util.key2Re.test(k)) ||
            (f.keyType !== "bool" &&
              f.keyType !== "string" &&
              !util.key32Re.test(k))
          )
            return f.name + ": key expected";
          const e = verifyValue(f, x, depth);
          if (e) return f.name + ": " + e;
        }
      } else if (f.repeated) {
        if (!Array.isArray(v)) return f.name + ": array expected";
        for (const x of v) {
          const e = verifyValue(f, x, depth);
          if (e) return f.name + ": " + e;
        }
      } else {
        const e = verifyValue(f, v, depth);
        if (e) return f.name + ": " + e;
      }
    }
    return null;
  }
  getTypeUrl(prefix = "type.googleapis.com") {
    return prefix + "/" + this.fullName.slice(1);
  }
  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.oneofsArray.length
        ? {
            oneofs: Object.fromEntries(
              this.oneofsArray.map((o) => [o.name, o.toJSON()]),
            ),
          }
        : {}),
      fields: Object.fromEntries(
        this.fieldsArray.map((f) => [f.name, f.toJSON()]),
      ),
      ...(this.group ? { group: true } : {}),
      ...(this.edition ? { edition: this.edition } : {}),
      ...(this.extensions ? { extensions: this.extensions } : {}),
      ...(this.reserved ? { reserved: this.reserved } : {}),
    };
  }
}
function mergeMessage(T, into, from, depth) {
  depthCheck(depth);
  for (const f of T.fieldsArray) {
    if (!Object.hasOwn(from, f.name)) continue;
    const v = from[f.name];
    if (f.repeated) into[f.name].push(...v);
    else if (f.map) for (const k of Object.keys(v)) put(into[f.name], k, v[k]);
    else if (f.resolvedType instanceof Type && Object.hasOwn(into, f.name))
      mergeMessage(f.resolvedType, into[f.name], v, depth + 1);
    else put(into, f.name, v);
  }
  if (Object.hasOwn(from, "$unknowns")) {
    util.makeProp(into, "$unknowns", false);
    (into.$unknowns ||= []).push(...from.$unknowns);
  }
  return into;
}
function isDefault(f, v) {
  if (f.bytes || f.type === "string") return v.length === 0;
  if (f.long) {
    const b = util.LongBits.from(v);
    return b.lo === 0 && b.hi === 0;
  }
  return (v === 0 && !Object.is(v, -0)) || v === false;
}
function closedEnum(f) {
  return (
    f.resolvedType instanceof Enum &&
    Field.prototype.feature.call(f.resolvedType, "enum_type") === "CLOSED"
  );
}
function unknownEnum(f, value) {
  return closedEnum(f) && !Object.hasOwn(f.resolvedType.valuesById, value);
}
function rememberUnknown(m, r, bytes) {
  if (!r.discardUnknown) {
    util.makeProp(m, "$unknowns", false);
    (m.$unknowns ||= []).push(bytes);
  }
}
function convert(f, v, depth) {
  if (f.resolvedType instanceof Type)
    return f.resolvedType.fromObject(v, depth + 1);
  if (f.resolvedType instanceof Enum) {
    const value = typeof v === "string" ? f.resolvedType.values[v] : v | 0;
    return unknownEnum(f, value) ? undefined : value;
  }
  if (f.long) {
    const L = util.Long;
    if (!L) return Number(v);
    return L.fromValue(v, unsigned(f.type));
  }
  switch (f.type) {
    case "string":
      return String(v);
    case "bool":
      return Boolean(v);
    case "bytes":
      if (typeof v === "string") {
        const b = util.newBuffer(util.base64.length(v));
        util.base64.decode(v, b, 0);
        return b;
      }
      return v;
    case "double":
    case "float":
      return Number(v);
    case "uint32":
    case "fixed32":
      return v >>> 0;
    default:
      return v | 0;
  }
}
function convertOut(f, v, o, depth) {
  if (v === null) return null;
  if (f.resolvedType instanceof Type)
    return f.resolvedType.toObject(v, o, depth + 1);
  if (f.resolvedType instanceof Enum)
    return o.enums === String ? (f.resolvedType.valuesById[v] ?? v) : v;
  if (f.long) {
    if (o.longs === String)
      return typeof v === "number"
        ? String(v)
        : util.Long.fromValue(v).toString();
    if (o.longs === Number)
      return typeof v === "number" ? v : util.Long.fromValue(v).toNumber();
    return v;
  }
  if (f.bytes) {
    if (o.bytes === String) return util.base64.encode(v, 0, v.length);
    if (o.bytes === Array) return Array.from(v);
  }
  if (o.json && typeof v === "number" && !Number.isFinite(v)) return String(v);
  return v;
}
function verifyValue(f, v, depth) {
  if (f.resolvedType instanceof Type)
    return f.resolvedType.verify(v, depth + 1);
  if (f.resolvedType instanceof Enum)
    return Number.isInteger(v) && !unknownEnum(f, v)
      ? null
      : "enum value expected";
  if (f.long)
    return Number.isInteger(v) ||
      (v && Number.isInteger(v.low) && Number.isInteger(v.high))
      ? null
      : "integer|Long expected";
  if (f.bytes)
    return typeof v === "string" || (v && typeof v.length === "number")
      ? null
      : "buffer expected";
  if (f.type === "string") return util.isString(v) ? null : "string expected";
  if (f.type === "bool")
    return typeof v === "boolean" ? null : "boolean expected";
  return (
    f.type === "double" || f.type === "float"
      ? typeof v === "number"
      : Number.isInteger(v)
  )
    ? null
    : "integer expected";
}
function writeScalar(type, w, id, v) {
  w.uint32(id * 8 + scalarWire[type])[type](v);
}
function writeField(f, w, v, id, depth) {
  if (f.resolvedType instanceof Type) {
    if (f.resolvedType.group) {
      w.uint32(id * 8 + 3);
      f.resolvedType.encode(v, w, depth + 1);
      w.uint32(id * 8 + 4);
    } else {
      w.uint32(id * 8 + 2).fork();
      f.resolvedType.encode(v, w, depth + 1);
      w.ldelim();
    }
  } else
    writeScalar(f.resolvedType instanceof Enum ? "int32" : f.type, w, id, v);
}
function readField(f, r, wire, depth) {
  if (f.resolvedType instanceof Type) {
    if (f.resolvedType.group) {
      if (wire !== 3) throw Error("invalid wire type");
      const start = r.pos;
      let end, after;
      while (true) {
        if (r.pos === r.len) throw Error("missing end group");
        const pos = r.pos,
          t = r.tag(),
          id = t >>> 3;
        if ((t & 7) === 4) {
          if (id !== f.id) throw Error("invalid end group tag");
          end = pos;
          after = r.pos;
          break;
        }
        r.skipType(t & 7, depth + 1, id);
      }
      r.pos = start;
      const value = f.resolvedType.decode(r, end - start, depth + 1);
      r.pos = after;
      return value;
    }
    if (wire !== 2) throw Error("invalid message wire type");
    return f.resolvedType.decode(r, r.size(), depth + 1);
  }
  const type = f.resolvedType instanceof Enum ? "int32" : f.type;
  if (wire !== scalarWire[type]) throw Error("invalid wire type for " + f.name);
  return r[
    type === "string" && f.feature("utf8_validation") === "VERIFY"
      ? "stringVerify"
      : type
  ]();
}
class Method extends ReflectionObject {
  constructor(
    name,
    type,
    requestType,
    responseType,
    requestStream,
    responseStream,
    options,
  ) {
    super(name, options);
    this.type = type || "rpc";
    this.requestType = requestType;
    this.responseType = responseType;
    this.requestStream = !!requestStream;
    this.responseStream = !!responseStream;
  }
  static fromJSON(name, j) {
    const m = new Method(
      name,
      j.type,
      j.requestType,
      j.responseType,
      j.requestStream,
      j.responseStream,
      j.options,
    );
    m.parsedOptions = j.parsedOptions;
    return m;
  }
  resolve() {
    this.resolvedRequestType = this.parent.lookupType(this.requestType);
    this.resolvedResponseType = this.parent.lookupType(this.responseType);
    return super.resolve();
  }
  toJSON() {
    return {
      ...super.toJSON(),
      requestType: this.requestType,
      responseType: this.responseType,
      ...(this.requestStream ? { requestStream: true } : {}),
      ...(this.responseStream ? { responseStream: true } : {}),
      ...(this.parsedOptions ? { parsedOptions: this.parsedOptions } : {}),
    };
  }
}
class Service extends Namespace {
  constructor(name, options) {
    super(name, options);
    this.methods = dict();
  }
  static fromJSON(name, j) {
    const s = new Service(name, j.options);
    for (const [k, m] of Object.entries(j.methods))
      s.add(Method.fromJSON(k, m));
    return s;
  }
  get(name) {
    return this.methods[name] || super.get(name);
  }
  get methodsArray() {
    return Object.values(this.methods);
  }
  add(m) {
    if (!(m instanceof Method)) return super.add(m);
    put(this.methods, m.name, m);
    m.parent = this;
    return this;
  }
  resolveAll() {
    for (const m of this.methodsArray) m.resolve();
    return super.resolveAll();
  }
  toJSON() {
    return {
      ...super.toJSON(),
      methods: Object.fromEntries(
        this.methodsArray.map((m) => [m.name, m.toJSON()]),
      ),
    };
  }
  create(impl, requestDelimited, responseDelimited) {
    const rpc = new (require("./minimal.cjs").rpc.Service)(
      impl,
      requestDelimited,
      responseDelimited,
    );
    this.resolveAll();
    for (const method of this.methodsArray)
      rpc[util.lcFirst(method.name)] = (req, cb) =>
        rpc.rpcCall(
          method,
          method.resolvedRequestType.ctor,
          method.resolvedResponseType.ctor,
          req,
          cb,
        );
    return rpc;
  }
}
module.exports = {
  ReflectionObject,
  Namespace,
  Root,
  Enum,
  Field,
  MapField,
  OneOf,
  Message,
  Type,
  Method,
  Service,
  scalarWire,
};
