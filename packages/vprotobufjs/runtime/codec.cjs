"use strict";
// Schema values only enter as checked IDs, whitelisted scalar methods, JSON
// string literals, or closure data. Nothing from a schema is an expression.
module.exports = function compile(type, util, wire, wireTypes, helpers) {
  const fields = type.fieldsArray;
  for (const f of fields) {
    f.resolve();
    if (
      !Number.isInteger(f.id) ||
      f.id < 1 ||
      f.id > 536870911 ||
      typeof f.name !== "string"
    )
      throw TypeError("invalid field");
    // Closed enums and groups retain the checked interpreter until specialized.
    if (f.resolvedType instanceof helpers.Enum || f.resolvedType?.group)
      return null;
    if (!f.resolvedType && !Object.hasOwn(wireTypes, f.type)) return null;
    if (f.map && !Object.hasOwn(wireTypes, f.keyType)) return null;
  }
  const C = type.ctor,
    types = fields.map((f) => f.resolvedType),
    enc = [],
    dec = [],
    from = [],
    to = [],
    required = [];
  const assign = (object, key, value) =>
    key === "__proto__"
      ? `util.put(${object},${JSON.stringify(key)},${value});`
      : `${object}[${JSON.stringify(key)}]=${value};`;
  const check = (actual, expected) =>
    `if((${actual})!==${expected})throw Error('invalid wire type');`;
  function write(f, i, id, value) {
    return f.resolvedType
      ? `w.uint32(${id * 8 + 2}).fork();types[${i}].encode(${value},w,depth+1);w.ldelim();`
      : `w.uint32(${id * 8 + wireTypes[f.type]}).${f.type}(${value});`;
  }
  function read(f, i) {
    return f.resolvedType
      ? `types[${i}].decode(r,r.size(),depth+1)`
      : `r.${f.type === "string" && f.feature("utf8_validation") === "VERIFY" ? "stringVerify" : f.type}()`;
  }
  function input(f, i) {
    if (f.resolvedType) return `types[${i}].fromObject(v,depth+1)`;
    if (f.long)
      return `util.Long?util.Long.fromValue(v,${f.type === "uint64" || f.type === "fixed64"}):Number(v)`;
    if (f.bytes)
      return `typeof v==='string'?helpers.convert(fields[${i}],v,depth):v`;
    if (f.type === "string") return "String(v)";
    if (f.type === "bool") return "Boolean(v)";
    if (f.type === "double" || f.type === "float") return "Number(v)";
    return f.type === "uint32" || f.type === "fixed32" ? "v>>>0" : "v|0";
  }
  function output(f, i) {
    if (f.resolvedType)
      return `v===null?null:types[${i}].toObject(v,o,depth+1)`;
    if (f.long)
      return "v===null?null:o.longs===String?(typeof v==='number'?String(v):util.Long.fromValue(v).toString()):o.longs===Number?(typeof v==='number'?v:util.Long.fromValue(v).toNumber()):v";
    if (f.bytes)
      return "v===null?null:o.bytes===String?util.base64.encode(v,0,v.length):o.bytes===Array?Array.from(v):v";
    return "o.json&&typeof v==='number'&&!Number.isFinite(v)?String(v):v";
  }
  for (const f of fields.toSorted((a, b) => a.id - b.id)) {
    const i = fields.indexOf(f),
      key = JSON.stringify(f.name),
      prop = `m[${key}]`,
      wt = f.resolvedType ? 2 : wireTypes[f.type];
    let present = `${prop}!=null&&Object.hasOwn(m,${key})`;
    if (f.required) present = `${prop}!=null`;
    else if (!f.explicit && !f.repeated && !f.map) {
      if (f.type === "string" || f.bytes) present += `&&${prop}.length!==0`;
      else if (f.long) present += `&&!zero(${prop})`;
      else if (f.type === "float" || f.type === "double")
        present += `&&(${prop}!==0||Object.is(${prop},-0))`;
      else if (!f.resolvedType)
        present += `&&${prop}${f.type === "bool" ? "!==false" : "!==0"}`;
    }
    let body;
    if (f.map)
      body = `for(const k of Object.keys(${prop})){w.uint32(${f.id * 8 + 2}).fork();w.uint32(${8 + wireTypes[f.keyType]}).${f.keyType}(${f.keyType === "bool" ? "util.boolFromKey(k)" : "k"});${write(f, i, 2, prop + "[k]")}w.ldelim();}`;
    else if (f.repeated)
      body = f.packed
        ? `if(${prop}.length){w.uint32(${f.id * 8 + 2}).fork();for(const v of ${prop})w.${f.type}(v);w.ldelim();}`
        : `for(const v of ${prop}){${write(f, i, f.id, "v")}}`;
    else body = write(f, i, f.id, prop);
    enc.push(`if(${present}){${body}}`);
    if (f.map) {
      const keyRead =
        f.keyType === "string" && f.feature("utf8_validation") === "VERIFY"
          ? "stringVerify"
          : f.keyType;
      body = `${check("tag&7", 2)}const n=r.size();r.need(n);const limit=r.len,stop=r.pos+n;r.len=stop;let key=${f.keyType === "string" ? '""' : f.keyType === "bool" ? "false" : "0"},value=fields[${i}].typeDefault;try{while(r.pos<stop){const t=r.tag();switch(t>>>3){case 1:${check("t&7", wireTypes[f.keyType])}key=r.${keyRead}();break;case 2:${check("t&7", wt)}value=${read(f, i)};break;default:r.skipType(t&7,depth,t>>>3);}}}finally{r.len=limit;}util.put(${prop},String(key),value);`;
    } else if (f.repeated) {
      const scalar = !f.resolvedType && f.type !== "string" && !f.bytes;
      body =
        (scalar ? `if((tag&7)===2){r.${f.type}s(${prop});}else{` : "") +
        check("tag&7", wt) +
        `${prop}.push(${read(f, i)});` +
        (scalar ? "}" : "");
    } else {
      body = check("tag&7", wt) + `const v=${read(f, i)};`;
      body += f.resolvedType
        ? `if(Object.hasOwn(m,${key}))helpers.merge(types[${i}],${prop},v,depth+1);else {${assign("m", f.name, "v")}}`
        : assign("m", f.name, "v");
    }
    dec.push(`case ${f.id}:{${body}break;}`);
    if (f.required)
      required.push(
        `if(!Object.hasOwn(m,${key}))throw new util.ProtocolError('missing required field',{instance:m});`,
      );
  }
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i],
      key = JSON.stringify(f.name),
      prop = `m[${key}]`,
      incoming = input(f, i),
      outgoing = output(f, i);
    if (f.map) {
      from.push(
        `{const source=o[${key}];if(source!=null){if(typeof source!=='object'||Array.isArray(source))throw TypeError('object expected');for(const k of Object.keys(source)){const v=source[k];${f.bytes ? "if(v!==undefined)" : ""}util.put(${prop},k,${incoming});}}}`,
      );
      to.push(
        `{const source=${prop};if(o.objects||o.defaults){${assign("result", f.name, "{}")}}if(source){const keys=Object.keys(source);if(keys.length){const values={};for(const k of keys){const v=source[k];util.put(values,k,${outgoing});}${assign("result", f.name, "values")}}}}`,
      );
    } else if (f.repeated) {
      from.push(
        `{const source=o[${key}];if(source!=null){if(!Array.isArray(source))throw TypeError('array expected');for(const v of source)${f.bytes ? "if(v!==undefined)" : ""}${prop}.push(${incoming});}}`,
      );
      to.push(
        `{if(o.arrays||o.defaults){${assign("result", f.name, "[]")}}const source=${prop};if(source?.length){const values=source.map(v=>${outgoing});${assign("result", f.name, "values")}}}`,
      );
    } else {
      from.push(
        `{const v=o[${key}];if(v!=null){${assign("m", f.name, incoming)}}}`,
      );
      to.push(
        `{${!f.partOf ? `if(o.defaults){const v=fields[${i}].defaultValue;${assign("result", f.name, outgoing)}}` : ""}const v=${prop};if(v!=null&&Object.hasOwn(m,${key})){${assign("result", f.name, outgoing)}${f.partOf ? `if(o.oneofs){${assign("result", f.partOf.name, key)}}` : ""}}}`,
      );
    }
  }
  try {
    return new Function(
      "C",
      "util",
      "Reader",
      "Writer",
      "length",
      "fields",
      "types",
      "helpers",
      `
      function zero(v){if(v&&typeof v==='object'&&typeof v.low==='number'&&typeof v.high==='number')return (v.low>>>0)===0&&(v.high>>>0)===0;const b=util.LongBits.from(v);return b.lo===0&&b.hi===0;}
      return {
        encode:function(m,w=Writer.create(),depth=0){if(depth>util.recursionLimit)throw Error('max depth exceeded');${enc.join("\n")}if(Object.hasOwn(m,'$unknowns'))for(const b of m.$unknowns||[])w.raw(b);return w;},
        decode:function(r,n,depth=0){if(depth>util.recursionLimit)throw Error('max depth exceeded');if(!(r instanceof Reader))r=Reader.create(r);if(n!==undefined)length(n);const outer=r.len,end=n===undefined?outer:r.pos+n;if(end>outer)throw RangeError('index out of range');r.len=end;try{const m=new C();while(r.pos<end){const start=r.pos,tag=r.tag();switch(tag>>>3){${dec.join("\n")}default:if(!(tag>>>3))throw Error('illegal tag: field number 0');r.skipType(tag&7,depth,tag>>>3);if(!r.discardUnknown){util.makeProp(m,'$unknowns',false);(m.$unknowns||=[]).push(r.raw(start,r.pos));}}}${required.join("\n")}return m;}finally{r.len=outer;}},
        fromObject:function(o,depth=0){if(depth>util.recursionLimit)throw Error('max depth exceeded');if(o instanceof C)return o;if(!o||typeof o!=='object')throw TypeError('object expected');const m=new C();${from.join("\n")}return m;},
        toObject:function(m,o={},depth=0){if(depth>util.recursionLimit)throw Error('max depth exceeded');const result={};${to.join("\n")}return result;}
      };`,
    )(C, util, wire.Reader, wire.Writer, wire.length, fields, types, helpers);
  } catch (error) {
    if (error instanceof EvalError) return null;
    throw error;
  }
};
