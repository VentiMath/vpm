'use strict';
const equal = require('vfast-deep-equal');
const integer=(name,value,min,max)=>{if(!Number.isInteger(value)||value<min||value>max)throw new RangeError(name+' is out of range');return value;};
class Timestamp {
  constructor(seconds,nanoseconds){this._seconds=integer('seconds',seconds,-62135596800,253402300799);this._nanoseconds=integer('nanoseconds',nanoseconds,0,999999999);}
  get seconds(){return this._seconds;} get nanoseconds(){return this._nanoseconds;}
  static now(){return this.fromMillis(Date.now());}
  static fromDate(date){return this.fromMillis(date.getTime());}
  static fromMillis(ms){if(!Number.isFinite(ms))throw new RangeError('Invalid timestamp');const seconds=Math.floor(ms/1000);return new Timestamp(seconds,Math.floor((ms-seconds*1000)*1e6));}
  static fromProto(value){if(typeof value==='string'){const ms=Date.parse(value),fraction=/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1];const t=Timestamp.fromMillis(ms);return fraction?new Timestamp(t.seconds,Number(fraction.padEnd(9,'0'))):t;}return new Timestamp(Number(value.seconds||0),value.nanos||0);}
  toProto(){return {seconds:String(this.seconds),nanos:this.nanoseconds};}
  toDate(){return new Date(this.seconds*1000+Math.round(this.nanoseconds/1e6));} toMillis(){return this.seconds*1000+Math.floor(this.nanoseconds/1e6);}
  isEqual(other){return other instanceof Timestamp&&other.seconds===this.seconds&&other.nanoseconds===this.nanoseconds;}
  valueOf(){return String(this.seconds+62135596800).padStart(12,'0')+'.'+String(this.nanoseconds).padStart(9,'0');}
  toJSON(){return {seconds:this.seconds,nanoseconds:this.nanoseconds};}
}
class GeoPoint {
  constructor(latitude,longitude){if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new RangeError('Invalid GeoPoint');this._latitude=latitude;this._longitude=longitude;}
  get latitude(){return this._latitude;}get longitude(){return this._longitude;}
  isEqual(other){return other instanceof GeoPoint&&this.latitude===other.latitude&&this.longitude===other.longitude;}
}
class FieldPath {
  constructor(...segments){if(!segments.length||segments.some(s=>typeof s!=='string'||!s))throw new TypeError('FieldPath requires nonempty strings');this.segments=Object.freeze([...segments]);Object.freeze(this);}
  static fromFormatted(value){const parts=[];let part='',quoted=false;for(let i=0;i<value.length;i++){const c=value[i];if(c==='\\'&&quoted){part+=value[++i];}else if(c==='`')quoted=!quoted;else if(c==='.'&&!quoted){parts.push(part);part='';}else part+=c;}if(quoted)throw new TypeError('Invalid formatted field path');return new FieldPath(...parts,part);}
  static documentId(){return new FieldPath('__name__');}
  static fromArgument(value){if(value instanceof FieldPath)return value;if(typeof value!=='string'||/[~*/\[\]]/.test(value))throw new TypeError('Invalid field path');return new FieldPath(...value.split('.'));}
  get formattedName(){return this.segments.map(s=>/^[A-Za-z_][A-Za-z_0-9]*$/.test(s)?s:'`'+s.replace(/\\/g,'\\\\').replace(/`/g,'\\`')+'`').join('.');}
  toString(){return this.formattedName;}
  isEqual(other){return other instanceof FieldPath&&equal(this.segments,other.segments);}
}
class VectorValue {
  constructor(value){if(!Array.isArray(value)||value.length>2048||value.some(n=>typeof n!=='number'||!Number.isFinite(n)))throw new TypeError('Vector requires at most 2048 finite numbers');this._values=Object.freeze([...value]);Object.freeze(this);}
  toArray(){return [...this._values];}isEqual(other){return other instanceof VectorValue&&equal(this._values,other._values);}
}
class FieldValue {
  constructor(kind,values){this.kind=kind;this.values=values;}
  static delete(){return deletion;}static serverTimestamp(){return timestamp;}
  static increment(n){if(typeof n!=='number')throw new TypeError('Increment requires a number');return new FieldValue('increment',n);}
  static arrayUnion(...values){return new FieldValue('appendMissingElements',values);}
  static arrayRemove(...values){return new FieldValue('removeAllFromArray',values);}
  static vector(values){return new VectorValue(values);}
  isEqual(other){return other instanceof FieldValue&&this.kind===other.kind&&equal(this.values,other.values);}
}
const deletion=Object.freeze(new FieldValue('delete')),timestamp=Object.freeze(new FieldValue('setToServerValue','REQUEST_TIME'));
const plain=value=>value!==null&&typeof value==='object'&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
// These destinations are fresh plain records. Only inherited keys need a
// descriptor to avoid setters (including __proto__); ordinary fields assign.
const own=(object,key,value)=>{if(key in Object.prototype)Object.defineProperty(object,key,{value,enumerable:true,writable:true,configurable:true});else object[key]=value;return object;};
const path=(value,even)=>{if(typeof value!=='string'||!value||value.includes('//'))throw new TypeError('Invalid resource path');const parts=value.split('/').filter(Boolean);if(parts.length%2!==(even?0:1))throw new TypeError(even?'A document path must have an even number of segments':'A collection path must have an odd number of segments');return parts.join('/');};
module.exports={Timestamp,GeoPoint,FieldPath,FieldValue,VectorValue,plain,own,path,integer,equal};
