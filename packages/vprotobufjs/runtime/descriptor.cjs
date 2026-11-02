"use strict";
// Descriptor schemas are protocol data; the reflection conversion is independent.
const pb = require("./full.cjs"),
  { Root, Namespace, Type, Enum, Field, MapField, OneOf, Service, Method } = pb;
const schema = Root.fromJSON(require("../google/protobuf/descriptor.json"));
const descriptor = (module.exports = schema.lookup(".google.protobuf"));
const scalar = [
  "",
  "double",
  "float",
  "int64",
  "uint64",
  "int32",
  "fixed64",
  "fixed32",
  "bool",
  "string",
  "group",
  "message",
  "bytes",
  "uint32",
  "enum",
  "sfixed32",
  "sfixed64",
  "sint32",
  "sint64",
];
const typeId = (name) => scalar.indexOf(name);
function normalize(T, o) {
  if (o == null) return o;
  const out = {};
  for (const [name, value] of Object.entries(o)) {
    const f = T.fields[name];
    if (!f) {
      out[name] = value;
      continue;
    }
    f.resolve();
    const convert = (x) =>
      f.resolvedType instanceof Type ? normalize(f.resolvedType, x) : x;
    out[name] = f.repeated
      ? (Array.isArray(value) ? value : [value]).map(convert)
      : convert(value);
  }
  return out;
}
const make = (name, o) =>
  descriptor[name].fromObject(normalize(descriptor[name], o));
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
function options(o) {
  if (!o) return undefined;
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [camel(k), v]));
}
function fieldObject(f, syntax) {
  f.resolve();
  const t = f.resolvedType;
  const result = {
    name: f.protoName || f.name,
    number: f.id,
    label: f.repeated ? 3 : f.required && syntax !== "proto3" ? 2 : 1,
    type: t instanceof Type ? 11 : t instanceof Enum ? 14 : typeId(f.type),
  };
  if (t) {
    const parts = t.fullName.slice(1).split(".");
    result.typeName = t.fullName;
    for (let i = parts.length - 1; i >= 0; i--) {
      const name = parts.slice(i).join(".");
      if (f.parent.lookup(name) === t) {
        result.typeName = name;
        break;
      }
    }
  }
  if (f.extend) result.extendee = f.parent.lookupType(f.extend).fullName;
  if (f.partOf) result.oneofIndex = f.parent.oneofsArray.indexOf(f.partOf);
  if (f.options?.default !== undefined)
    result.defaultValue = String(f.options.default);
  if (f.options) result.options = options(f.options);
  if (f.jsonName !== undefined && f.jsonName !== (f.protoName || f.name))
    result.jsonName = f.jsonName;
  if (f.options?.proto3_optional) result.proto3Optional = true;
  const packed =
    f.options?.packed ?? f.feature("repeated_field_encoding") === "PACKED";
  if (syntax === "proto3" && !packed) (result.options ||= {}).packed = false;
  else if (syntax === "proto2" && packed) (result.options ||= {}).packed = true;
  return result;
}
Field.prototype.toDescriptor = function (syntax = "proto2") {
  return make("FieldDescriptorProto", fieldObject(this, syntax));
};
Enum.prototype.toDescriptor = function () {
  return make("EnumDescriptorProto", {
    name: this.name,
    value: Object.entries(this.values).map(([name, number]) => ({
      name,
      number,
    })),
    options: options(this.options),
  });
};
Method.prototype.toDescriptor = function () {
  this.resolve();
  return make("MethodDescriptorProto", {
    name: this.name,
    inputType: this.resolvedRequestType.fullName,
    outputType: this.resolvedResponseType.fullName,
    ...(this.requestStream ? { clientStreaming: true } : {}),
    ...(this.responseStream ? { serverStreaming: true } : {}),
    options: options(this.options),
  });
};
Service.prototype.toDescriptor = function () {
  return make("ServiceDescriptorProto", {
    name: this.name,
    method: this.methodsArray.map((m) => m.toDescriptor()),
    options: options(this.options),
  });
};
Type.prototype.toDescriptor = function (syntax = "proto2") {
  const o = {
    name: this.name,
    field: [],
    nestedType: [],
    enumType: [],
    oneofDecl: this.oneofsArray.map((x) => ({
      name: x.name,
      options: options(x.options),
    })),
    options: options(this.options),
  };
  for (const f of this.fieldsArray) {
    const fd = fieldObject(f, syntax);
    if (f.map) {
      const entryName = pb.util.ucFirst(camel(f.name)),
        key = { name: "key", number: 1, label: 1, type: typeId(f.keyType) },
        value = { ...fd, name: "value", number: 2, label: 1 };
      delete value.jsonName;
      delete value.oneofIndex;
      delete value.options;
      delete value.defaultValue;
      o.nestedType.push(
        make("DescriptorProto", {
          name: entryName,
          field: [key, value],
          options: { mapEntry: true },
        }),
      );
      fd.type = 11;
      fd.typeName = entryName;
      fd.label = 3;
    }
    o.field.push(fd);
  }
  for (const n of this.nestedArray)
    if (n instanceof Type) o.nestedType.push(n.toDescriptor(syntax));
    else if (n instanceof Enum) o.enumType.push(n.toDescriptor());
  if (this.extensions)
    o.extensionRange = this.extensions.map(([start, end]) => ({
      start,
      end: end + 1,
    }));
  if (this.reserved) {
    o.reservedRange = this.reserved
      .filter(Array.isArray)
      .map(([start, end]) => ({ start, end: end + 1 }));
    o.reservedName = this.reserved.filter((x) => typeof x === "string");
  }
  return make("DescriptorProto", o);
};
Root.prototype.toDescriptor = function (syntax = "proto2") {
  this.resolveAll();
  const file = [];
  function visit(ns) {
    const object = {
      name:
        ns.filename ||
        (ns.fullName.slice(1).replaceAll(".", "_") || "root") + ".proto",
      ...(ns.fullName ? { package: ns.fullName.slice(1) } : {}),
      syntax: syntax === "proto2" ? "proto2" : "proto3",
      messageType: [],
      enumType: [],
      service: [],
      extension: [],
      options: options(ns.options),
    };
    for (const child of ns.nestedArray) {
      if (child instanceof Type)
        object.messageType.push(child.toDescriptor(syntax));
      else if (child instanceof Enum)
        object.enumType.push(child.toDescriptor());
      else if (child instanceof Service)
        object.service.push(child.toDescriptor());
      else if (child instanceof Namespace) visit(child);
      else if (child instanceof Field)
        object.extension.push(child.toDescriptor(syntax));
    }
    if (
      object.messageType.length ||
      object.enumType.length ||
      object.service.length ||
      object.extension.length
    )
      file.push(object);
  }
  visit(this);
  return make("FileDescriptorSet", { file });
};
const numberType = (x) =>
  typeof x === "string" ? typeId(x.replace(/^TYPE_/, "").toLowerCase()) : x;
function enumFrom(o) {
  const e = new Enum(
    o.name,
    Object.fromEntries((o.value || []).map((v) => [v.name, v.number])),
    o.options,
  );
  return e;
}
function messageFrom(o, syntax, keepCase) {
  const t = new Type(o.name, o.options);
  t._syntax = syntax || "proto2";
  const entries = new Map(
    (o.nestedType || [])
      .filter((x) => x.options?.mapEntry)
      .map((x) => [x.name, x]),
  );
  for (const f of o.field || []) {
    const target = f.typeName?.split(".").at(-1),
      entry = entries.get(target),
      type = scalar[numberType(f.type)],
      name = keepCase ? f.name : camel(f.name);
    let field;
    if (entry) {
      const k = entry.field.find((x) => x.number === 1),
        v = entry.field.find((x) => x.number === 2);
      field = new MapField(
        name,
        f.number,
        scalar[numberType(k.type)],
        v.typeName || scalar[numberType(v.type)],
        f.options,
      );
    } else
      field = new Field(
        name,
        f.number,
        f.typeName || type,
        f.label === 3 || f.label === "LABEL_REPEATED"
          ? "repeated"
          : f.label === 2 || f.label === "LABEL_REQUIRED"
            ? "required"
            : undefined,
        undefined,
        f.options,
      );
    if (Object.hasOwn(f, "defaultValue")) {
      let value = f.defaultValue;
      if (type === "bool") value = value === "true";
      else if (type !== "string" && type !== "bytes" && type !== "enum")
        value = Number(value);
      field.setOption("default", value);
    }
    if (f.jsonName) field.jsonName = f.jsonName;
    t.add(field);
  }
  for (let i = 0; i < (o.oneofDecl || []).length; i++)
    t.add(
      new OneOf(
        o.oneofDecl[i].name,
        (o.field || [])
          .filter((f) => Object.hasOwn(f, "oneofIndex") && f.oneofIndex === i)
          .map((f) => (keepCase ? f.name : camel(f.name))),
        o.oneofDecl[i].options,
      ),
    );
  for (const n of o.nestedType || [])
    if (!n.options?.mapEntry) t.add(messageFrom(n, syntax, keepCase));
  for (const e of o.enumType || []) t.add(enumFrom(e));
  return t;
}
Root.fromDescriptor = function (input, options = {}) {
  const set =
    input instanceof Uint8Array || input instanceof pb.Reader
      ? descriptor.FileDescriptorSet.decode(input)
      : input;
  const root = new Root();
  for (const file of set.file || []) {
    const ns = root.define(file.package || "");
    ns.filename = file.name;
    ns.setOptions(file.options);
    if (file.name) root.files.push(file.name);
    for (const m of file.messageType || [])
      ns.add(messageFrom(m, file.syntax, options.keepCase));
    for (const e of file.enumType || []) ns.add(enumFrom(e));
    for (const s of file.service || []) {
      const service = new Service(s.name, s.options);
      for (const m of s.method || []) {
        const method = new Method(
          m.name,
          "rpc",
          m.inputType,
          m.outputType,
          m.clientStreaming,
          m.serverStreaming,
          m.options,
        );
        if (m.options) method.parsedOptions = [m.options];
        service.add(method);
      }
      ns.add(service);
    }
  }
  return root.resolveAll();
};
Type.fromDescriptor = (o, options = {}) =>
  messageFrom(o, options.syntax, options.keepCase);
Enum.fromDescriptor = enumFrom;
pb.descriptor = descriptor;
