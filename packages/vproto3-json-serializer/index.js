// Copyright 2021 Google LLC
// Modified for VPM. Licensed under the Apache License, Version 2.0.
'use strict';
const {util} = require('vprotobufjs/minimal');
const own = Object.hasOwn;
const plans = new WeakMap();
const wrappers = new Map(Object.entries({DoubleValue:'double',FloatValue:'float',Int64Value:'int64',UInt64Value:'uint64',Int32Value:'int32',UInt32Value:'uint32',BoolValue:'bool',StringValue:'string',BytesValue:'bytes'}).map(([k,v])=>['.google.protobuf.'+k,v]));
const integerTypes = new Set(['int32','uint32','sint32','fixed32','sfixed32','int64','uint64','sint64','fixed64','sfixed64']);
const signed64 = new Set(['int64','sint64','sfixed64']);
const identityScalars = new Set(['int32','uint32','sint32','fixed32','sfixed32','bool','string']);
const maxDepth = 100;
function set(obj,key,value) {
  if(key==='__proto__') Object.defineProperty(obj,key,{value,writable:true,enumerable:true,configurable:true});
  else obj[key]=value;
}
function object(value,what) {
  if(value===null || typeof value!=='object' || Array.isArray(value)) throw TypeError(what+' must be an object');
}
function depthCheck(depth) { if(depth>maxDepth) throw RangeError('Proto3 JSON nesting exceeds '+maxDepth); }
function name(type) { return type.fullName || '.'+type.name; }
function plan(type) {
  let saved=plans.get(type),fields=type.fieldsArray;
  if(saved && saved.fields===fields) return saved;
  type.resolveAll();
  const aliases=Object.create(null);
  for(const field of fields) {
    field.resolve();
    const jsonName=field.options?.json_name ?? field.jsonName ?? field.name.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
    for(const key of [field.name,field.protoName,jsonName]) if(key!==undefined) {
      if(own(aliases,key) && aliases[key]!==field) throw Error('Conflicting JSON field name '+key);
      aliases[key]=field;
    }
  }
  saved={fields,aliases,name:name(type)};plans.set(type,saved);return saved;
}
function jsonName(field) { return field.options?.json_name ?? field.jsonName ?? field.name.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()); }
function enumValue(type,value,numeric) {
  if(type.name==='NullValue' && name(type)==='.google.protobuf.NullValue') return null;
  if(typeof value==='number') return numeric ? value : (own(type.valuesById,value)?type.valuesById[value]:value);
  if(typeof value==='string') return numeric && own(type.values,value)?type.values[value]:value;
  throw TypeError('Enum value must be a string or number');
}
function bytesToJSON(value) {
  if(typeof value==='string') return value;
  if(!(value instanceof Uint8Array)) throw TypeError('bytes must be a Uint8Array');
  if(util.Buffer) return (util.Buffer.isBuffer(value)?value:util.Buffer.from(value.buffer,value.byteOffset,value.byteLength)).toString('base64');
  return util.base64.encode(value,0,value.length);
}
function bytesFromJSON(value) {
  // A native round trip validates canonical larger inputs without a JS scan.
  // Noncanonical encodings still pass through the full grammar below.
  let decoded;
  if(typeof value==='string'&&value.length>=128&&util.Buffer) {
    decoded=util.Buffer.from(value,'base64');
    if(decoded.toString('base64')===value) return decoded;
  }
  // A flat character class avoids regexp stack growth on large byte strings.
  if(typeof value!=='string' || value.length%4===1 || (value.endsWith('=')&&value.length%4!==0) || !/^[A-Za-z0-9+/_-]*={0,2}(?![\s\S])/.test(value)) throw TypeError('Invalid base64 bytes');
  if(util.Buffer) return decoded||util.Buffer.from(value,'base64');
  const text=value.replace(/-/g,'+').replace(/_/g,'/'),out=util.newBuffer(util.base64.length(text));
  util.base64.decode(text,out,0);return out;
}
function integer(type,value) {
  if(typeof value!=='string' && typeof value!=='number') throw TypeError(type+' must be an integer string or number');
  if(typeof value==='number') {
    if(!type.endsWith('64')) {
      const unsigned=type==='uint32'||type==='fixed32';
      if(!Number.isInteger(value)||value<(unsigned?0:-2147483648)||value>(unsigned?4294967295:2147483647)) throw RangeError(type+' out of range');
      return value;
    }
    if(!Number.isFinite(value) || !Number.isInteger(value)) throw RangeError('Invalid '+type);
    value=String(value);
  }
  // Ordinary decimal text avoids allocating a match array or a BigInt.
  if(/^(?:-?[1-9][0-9]*|0)(?![\s\S])/.test(value)) {
    const wide=type.endsWith('64'),negative=value[0]==='-',digits=negative?value.slice(1):value;
    const signed=wide?signed64.has(type):type!=='uint32'&&type!=='fixed32';
    const limit=wide?(signed?(negative?'9223372036854775808':'9223372036854775807'):'18446744073709551615'):(signed?(negative?'2147483648':'2147483647'):'4294967295');
    if(negative&&!signed || digits.length>limit.length || digits.length===limit.length&&digits>limit)throw RangeError(type+' out of range');
    return wide?value:Number(value);
  }
  // Expand decimal exponent notation exactly, without rounding through Number.
  const m=/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?(?![\s\S])/.exec(value);
  if(!m) throw TypeError('Invalid '+type+' text');
  let digits=(m[2]+(m[3]||'')).replace(/^0+/,''),shift=Number(m[4]||0)-(m[3]?.length||0);
  if(!digits) return type.endsWith('64')?'0':0;
  if(shift<0) {
    if(-shift>digits.length || !/^0*(?![\s\S])/.test(digits.slice(shift))) throw RangeError('Fractional '+type);
    digits=digits.slice(0,shift);
  } else {
    if(shift>20 || digits.length+shift>20) throw RangeError(type+' out of range');
    digits+='0'.repeat(shift);
  }
  if(digits.length>20) throw RangeError(type+' out of range');
  const text=(m[1]==='-'?'-':'')+digits,n=BigInt(text),wide=type.endsWith('64'),signed=wide?signed64.has(type):!['uint32','fixed32'].includes(type);
  const min=signed?(wide?-9223372036854775808n:-2147483648n):0n,max=wide?(signed?9223372036854775807n:18446744073709551615n):(signed?2147483647n:4294967295n);
  if(n<min || n>max) throw RangeError(type+' out of range');
  return wide?text:Number(n);
}
function scalarFrom(type,value) {
  if(integerTypes.has(type)) return integer(type,value);
  switch(type) {
    case 'bytes':return bytesFromJSON(value);
    case 'string':if(typeof value!=='string') throw TypeError('string field must be a string');return value;
    case 'bool':if(typeof value!=='boolean') throw TypeError('bool field must be a boolean');return value;
    case 'double':case 'float': {
      if(value==='NaN') return NaN;
      if(value==='Infinity') return Infinity;
      if(value==='-Infinity') return -Infinity;
      if(typeof value!=='number' && (typeof value!=='string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?![\s\S])/.test(value))) throw TypeError('Invalid floating-point value');
      const n=Number(value);if(!Number.isFinite(n) || (type==='float' && Math.abs(n)>3.4028234663852886e38)) throw RangeError('Floating-point value out of range');return n;
    }
    default:throw Error('Unknown scalar '+type);
  }
}
function scalarTo(type,value) {
  switch(type) {
    case 'bytes':return bytesToJSON(value);
    case 'int64':case 'uint64':case 'sint64':case 'fixed64':case 'sfixed64':return value.toString();
    case 'double':case 'float':return Number.isFinite(value)?value:String(value);
    default:return value;
  }
}
function fraction(nanos,minimum=false) {
  if(nanos===0) return minimum?'.000':'';
  let text=String(Math.abs(nanos)).padStart(9,'0');
  while(text.length>3 && text.endsWith('000')) text=text.slice(0,-3);
  return '.'+text;
}
function timeParts(message,duration) {
  const seconds=Number(message.seconds??0),nanos=message.nanos??0;
  if(!Number.isSafeInteger(seconds)||!Number.isInteger(nanos)||Math.abs(nanos)>999999999) throw RangeError('Invalid seconds/nanoseconds');
  if(duration) {
    if(Math.abs(seconds)>315576000000 || (seconds>0&&nanos<0)||(seconds<0&&nanos>0)) throw RangeError('Invalid Duration');
  } else if(seconds< -62135596800 || seconds>253402300799 || nanos<0) throw RangeError('Invalid Timestamp');
  return [seconds,nanos];
}
function nonzeroTime(seconds,nanos) { const result={};if(seconds)result.seconds=seconds;if(nanos)result.nanos=nanos;return result; }
function timestampFrom(value) {
  if(typeof value!=='string') throw TypeError('Timestamp must be a string');
  const m=/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?([Zz]|[+-]\d{2}:\d{2})(?![\s\S])/.exec(value);
  if(!m) throw TypeError('Invalid Timestamp');
  const year=+m[1],month=+m[2],day=+m[3],hour=+m[4],minute=+m[5],second=+m[6],zone=m[8];
  const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1||month<1||month>12||day<1||day>days[month-1]||hour>23||minute>59||second>59) throw RangeError('Invalid Timestamp date');
  if(zone.length>1 && (+zone.slice(1,3)>23 || +zone.slice(4)>59)) throw RangeError('Invalid Timestamp offset');
  // Date.UTC is faster than reparsing validated text. Its 0–99 year shorthand
  // is avoided with one exact Gregorian 400-year cycle.
  const offset=zone.length===1?0:(+zone.slice(1,3)*3600 + +zone.slice(4)*60)*(zone[0]==='-'?-1:1);
  const seconds=Date.UTC(year<100?year+400:year,month-1,day,hour,minute,second)/1000-(year<100?12622780800:0)-offset;
  if(seconds< -62135596800 || seconds>253402300799) throw RangeError('Timestamp out of range');
  const nanos=Number((m[7]||'').padEnd(9,'0'));return nonzeroTime(seconds,nanos);
}
function durationFrom(value) {
  const m=typeof value==='string'&&/^(-?)(\d+)(?:\.(\d{1,9}))?s(?![\s\S])/.exec(value);
  if(!m) throw TypeError('Invalid Duration');
  const sign=m[1]?-1:1,seconds=sign*Number(m[2]),nanos=sign*Number((m[3]||'').padEnd(9,'0'));
  timeParts({seconds,nanos},true);return nonzeroTime(seconds,nanos);
}
function maskFrom(value) {
  if(typeof value!=='string') throw TypeError('FieldMask must be a string');
  if(!value) return {paths:[]};
  const paths=value.split(',').map(p=>{if(!/^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*(?![\s\S])/.test(p)) throw TypeError('Invalid FieldMask path');return p.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());});
  return {paths};
}
function maskTo(message) {
  return message.paths.map(p=>{if(!/^[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*(?![\s\S])/.test(p)||/_($|[^a-z])/.test(p)) throw TypeError('Non-round-trippable FieldMask path');return p.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());}).join(',');
}
function valueFrom(value,depth) {
  depthCheck(depth);
  if(value===null) return {nullValue:0};
  switch(typeof value) {
    case 'number':if(!Number.isFinite(value)) throw TypeError('Value numbers must be finite');return {numberValue:value};
    case 'string':return {stringValue:value};
    case 'boolean':return {boolValue:value};
    case 'object':return Array.isArray(value)?{listValue:{values:value.map(v=>valueFrom(v,depth+1))}}:{structValue:{fields:structFrom(value,depth+1)}};
    default:throw TypeError('Value requires JSON data');
  }
}
function structFrom(value,depth) { object(value,'Struct');const fields={};for(const key of Object.keys(value))set(fields,key,valueFrom(value[key],depth+1));return fields; }
function valueTo(message,depth) {
  depthCheck(depth);
  if(own(message,'nullValue')) return null;
  if(own(message,'numberValue')) {if(!Number.isFinite(message.numberValue)) throw TypeError('Value numbers must be finite');return message.numberValue;}
  if(own(message,'stringValue')) return message.stringValue;
  if(own(message,'boolValue')) return message.boolValue;
  if(own(message,'structValue')) return structTo(message.structValue.fields,depth+1);
  if(own(message,'listValue')) return message.listValue.values.map(v=>valueTo(v,depth+1));
  return null;
}
function structTo(fields,depth) { depthCheck(depth);const result={};for(const key of Object.keys(fields))set(result,key,valueTo(fields[key],depth+1));return result; }
const specialAny = new Set(['.google.protobuf.Any','.google.protobuf.Value','.google.protobuf.Struct','.google.protobuf.ListValue','.google.protobuf.Duration','.google.protobuf.Timestamp','.google.protobuf.FieldMask',...wrappers.keys()]);
function anyField(type) { return own(type.fields,'type_url')?'type_url':'typeUrl'; }
function toMessage(type,message,options,depth) {
  depthCheck(depth);const info=plan(type),kind=info.name,wrapper=wrappers.get(kind);
  if(wrapper) return !own(message,'value')||message.value===null?null:scalarTo(wrapper,message.value);
  switch(kind) {
    case '.google.protobuf.Timestamp': {const [s,n]=timeParts(message,false);return new Date(s*1000).toISOString().slice(0,19)+fraction(n,true)+'Z';}
    case '.google.protobuf.Duration': {const [s,n]=timeParts(message,true);return (s<0||n<0?'-':'')+Math.abs(s)+fraction(n)+'s';}
    case '.google.protobuf.FieldMask':return maskTo(message);
    case '.google.protobuf.Value':return valueTo(message,depth);
    case '.google.protobuf.Struct':return structTo(message.fields,depth);
    case '.google.protobuf.ListValue':return message.values.map(v=>valueTo(v,depth+1));
    case '.google.protobuf.Any': {
      const url=message[anyField(type)];if(typeof url!=='string'||!url) throw TypeError('Any requires a type URL');
      const nested=type.root.lookupType(url.slice(url.lastIndexOf('/')+1)),value=toMessage(nested,nested.decode(message.value),options,depth+1);
      if(specialAny.has(name(nested))) return {'@type':url,value};
      set(value,'@type',url);return value;
    }
  }
  const result={};
  for(const key of Object.keys(message)) {
    const field=own(type.fields,key)?type.fields[key]:undefined;if(!field) continue;
    const value=message[key],outKey=jsonName(field);
    if(value===null) {set(result,outKey,null);continue;}
    if(field.repeated) {if(!Array.isArray(value)) throw TypeError('Repeated field must be an array');if(value.length)set(result,outKey,!field.resolvedType&&identityScalars.has(field.type)?value.slice():value.map(v=>toField(field,v,options,depth+1)));}
    else if(field.map) {const map={};for(const k of Object.keys(value))set(map,k,toField(field,value[k],options,depth+1));set(result,outKey,map);}
    else set(result,outKey,toField(field,value,options,depth+1));
  }
  return result;
}
function toField(field,value,options,depth) {
  const resolved=field.resolvedType;
  return resolved?(resolved.values?enumValue(resolved,value,options?.numericEnums):toMessage(resolved,value,options,depth)):scalarTo(field.type,value);
}
function mapKey(field,key) {
  if(field.keyType==='bool') {if(key!=='true'&&key!=='false') throw TypeError('Invalid boolean map key');return key;}
  if(field.keyType==='string') return key;
  if(!/^-?\d+(?![\s\S])/.test(key)) throw TypeError('Invalid integer map key');
  return String(integer(field.keyType,key));
}
function fromField(field,value,depth) {
  const resolved=field.resolvedType;
  if(resolved?.values) return name(resolved)==='.google.protobuf.NullValue'?'NULL_VALUE':enumValue(resolved,value,false);
  if(resolved) return fromMessage(resolved,value,depth);
  return scalarFrom(field.type,value);
}
function fromArray(field,values,depth) {
  if(!field.resolvedType && identityScalars.has(field.type) && field.type!=='string' && field.type!=='bool') {
    const unsigned=field.type==='uint32'||field.type==='fixed32';
    return values.map(value=>{
      if(typeof value!=='number')return scalarFrom(field.type,value);
      if((unsigned?value>>>0:value|0)!==value)throw RangeError(field.type+' out of range');
      return value;
    });
  }
  return values.map(value=>{
    if(value===null&&name(field.resolvedType||{})!=='.google.protobuf.Value'&&name(field.resolvedType||{})!=='.google.protobuf.NullValue')throw TypeError('Null repeated element');
    return fromField(field,value,depth);
  });
}
function fromMessage(type,json,depth) {
  depthCheck(depth);const info=plan(type),kind=info.name,wrapper=wrappers.get(kind);
  if(kind==='.google.protobuf.Value') return valueFrom(json,depth);
  if(wrapper) return {value:json===null?null:scalarFrom(wrapper,json)};
  if(json===null) return null;
  switch(kind) {
    case '.google.protobuf.Timestamp':return timestampFrom(json);
    case '.google.protobuf.Duration':return durationFrom(json);
    case '.google.protobuf.FieldMask':return maskFrom(json);
    case '.google.protobuf.Struct':return {fields:structFrom(json,depth)};
    case '.google.protobuf.ListValue':if(!Array.isArray(json)) throw TypeError('ListValue must be an array');return {values:json.map(v=>valueFrom(v,depth+1))};
    case '.google.protobuf.Any': {
      object(json,'Any');const url=own(json,'@type')?json['@type']:undefined;
      if(typeof url!=='string'||!url) throw TypeError('Any requires @type');
      const nested=type.root.lookupType(url.slice(url.lastIndexOf('/')+1));let value=json;
      if(specialAny.has(name(nested))) {if(!own(json,'value')) throw TypeError('Any requires value');value=json.value;}
      const internal=fromMessage(nested,value,depth+1),result={value:internal===null?null:nested.encode(nested.fromObject(internal)).finish()};set(result,anyField(type),url);return result;
    }
  }
  object(json,'Message');const result={},seen=new Set();let oneofs;
  for(const key of Object.keys(json)) {
    const field=info.aliases[key];if(!field) continue;
    if(seen.has(field)) throw Error('Duplicate field '+field.name);seen.add(field);
    const value=json[key];
    if(value===null) {
      if(field.repeated) {set(result,field.name,[]);continue;}
      if(field.map) {set(result,field.name,{});continue;}
      if(!field.resolvedType || (!wrappers.has(name(field.resolvedType))&&name(field.resolvedType)!=='.google.protobuf.Value'&&name(field.resolvedType)!=='.google.protobuf.NullValue')) continue;
    }
    if(field.partOf && value!==null) {oneofs ||= new Set();if(oneofs.has(field.partOf)) throw Error('Multiple oneof values');oneofs.add(field.partOf);}
    if(field.repeated) {
      if(!Array.isArray(value)) throw TypeError('Repeated field must be an array');
      set(result,field.name,fromArray(field,value,depth+1));
    } else if(field.map) {
      object(value,'Map');const map={};for(const k of Object.keys(value)){const v=value[k],normalized=mapKey(field,k);if(own(map,normalized))throw Error('Duplicate normalized map key');if(v===null&&name(field.resolvedType||{})!=='.google.protobuf.Value'&&name(field.resolvedType||{})!=='.google.protobuf.NullValue')throw TypeError('Null map value');set(map,normalized,fromField(field,v,depth+1));}set(result,field.name,map);
    } else set(result,field.name,fromField(field,value,depth+1));
  }
  return result;
}
exports.toProto3JSON=function toProto3JSON(message,options) {
  if(!message?.$type) throw TypeError('Cannot serialize without .$type; use Type.fromObject first');
  return toMessage(message.$type,message,options,0);
};
exports.fromProto3JSON=function fromProto3JSON(type,json) {
  const value=fromMessage(type,json,0);return value===null?null:type.fromObject(value);
};
