"use strict";
// Specialize flat scalar messages once. Only fixed templates, checked numeric
// field IDs and JSON-quoted property names enter the generated function. Schema
// values never become executable expressions. Environments that disallow dynamic
// functions retain the same checked interpreter used by compound messages.
module.exports = function compileFlat(type, util, wire, wireTypes) {
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
    if (
      f.map ||
      f.repeated ||
      f.resolvedType ||
      !Object.hasOwn(wireTypes, f.type)
    )
      return null;
  }
  const C = type.ctor,
    enc = [],
    dec = [],
    required = [];
  for (const f of fields.toSorted((a, b) => a.id - b.id)) {
    const key = JSON.stringify(f.name),
      prop = "m[" + key + "]",
      tag = f.id * 8 + wireTypes[f.type];
    let present = prop + "!=null&&Object.hasOwn(m," + key + ")";
    if (f.required) present = prop + "!=null";
    else if (!f.explicit) {
      if (f.type === "string" || f.bytes)
        present += "&&" + prop + ".length!==0";
      else if (f.long) present += "&&!zero(" + prop + ")";
      else if (f.type === "float" || f.type === "double")
        present += "&&(" + prop + "!==0||Object.is(" + prop + ",-0))";
      else present += "&&" + prop + (f.type === "bool" ? "!==false" : "!==0");
    }
    enc.push(
      "if(" + present + ")w.uint32(" + tag + ")." + f.type + "(" + prop + ");",
    );
    const read =
      f.type === "string" && f.feature("utf8_validation") === "VERIFY"
        ? "stringVerify"
        : f.type;
    const assign =
      f.name === "__proto__"
        ? "util.put(m," + key + ",r." + read + "());"
        : prop + "=r." + read + "();";
    dec.push(
      "case " +
        f.id +
        ":if((tag&7)!==" +
        wireTypes[f.type] +
        ')throw Error("invalid wire type");' +
        assign +
        "break;",
    );
    if (f.required)
      required.push(
        "if(!Object.hasOwn(m," +
          key +
          '))throw new util.ProtocolError("missing required field",{instance:m});',
      );
  }
  try {
    return new Function(
      "C",
      "util",
      "Reader",
      "Writer",
      "length",
      `
      function zero(v){const b=util.LongBits.from(v);return b.lo===0&&b.hi===0;}
      return {
        encode:function(m,w=Writer.create(),depth=0){
          if(depth>util.recursionLimit)throw Error('max depth exceeded');
          ${enc.join("\n")}
          if(Object.hasOwn(m,'$unknowns'))for(const b of m.$unknowns||[])w.raw(b);
          return w;
        },
        decode:function(r,n,depth=0){
          if(depth>util.recursionLimit)throw Error('max depth exceeded');
          if(!(r instanceof Reader))r=Reader.create(r);
          if(n!==undefined)length(n);
          const outer=r.len,end=n===undefined?outer:r.pos+n;
          if(end>outer)throw RangeError('index out of range');
          r.len=end;
          try {const m=new C();while(r.pos<end){const start=r.pos,tag=r.tag();switch(tag>>>3){
            ${dec.join("\n")}
            default:if(!(tag>>>3))throw Error('illegal tag: field number 0');
              r.skipType(tag&7,depth,tag>>>3);
              if(!r.discardUnknown){util.makeProp(m,'$unknowns',false);(m.$unknowns||=[]).push(r.raw(start,r.pos));}
          }}${required.join("\n")}return m;}finally{r.len=outer;}
        }
      };
    `,
    )(C, util, wire.Reader, wire.Writer, wire.length);
  } catch (error) {
    // CSP can reject Function construction; no application code ran here.
    if (error instanceof EvalError) return null;
    throw error;
  }
};
