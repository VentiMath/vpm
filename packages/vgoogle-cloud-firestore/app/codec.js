'use strict';
const {Timestamp,GeoPoint,FieldValue,VectorValue,plain,own}=require('./values');
let Reference;
class Codec {
  constructor(db){this.db=db;}
  encodeFields(data){if(!plain(data))throw new TypeError('Document data must be a plain object');return this.encodeValue(data).mapValue.fields||{};}
  encodeValue(value,seen=new Set(),depth=0,inArray=false){
    if(depth>20)throw new RangeError('Firestore values exceed maximum nesting depth');
    if(value===null)return {nullValue:'NULL_VALUE'};
    switch(typeof value){
      case 'string':return {stringValue:value};case 'boolean':return {booleanValue:value};
      case 'number':return Number.isSafeInteger(value)&&!Object.is(value,-0)?{integerValue:String(value)}:{doubleValue:value};
      case 'bigint':if(value<-(1n<<63n)||value>=(1n<<63n))throw new RangeError('Integer exceeds int64');return {integerValue:String(value)};
      case 'undefined':if(this.db._settings.ignoreUndefinedProperties)return inArray?{nullValue:'NULL_VALUE'}:undefined;throw new TypeError('Cannot serialize undefined');
    }
    if(value instanceof Timestamp)return {timestampValue:value.toProto()};
    if(value instanceof Date)return {timestampValue:Timestamp.fromDate(value).toProto()};
    if(value instanceof GeoPoint)return {geoPointValue:{latitude:value.latitude,longitude:value.longitude}};
    if(Buffer.isBuffer(value)||value instanceof Uint8Array)return {bytesValue:Buffer.from(value)};
    if(value instanceof (Reference||=require('./query').DocumentReference))return {referenceValue:value._name};
    if(value instanceof VectorValue)return {mapValue:{fields:{__type__:{stringValue:'__vector__'},value:{arrayValue:{values:value.toArray().map(doubleValue=>({doubleValue}))}}}}};
    if(value instanceof FieldValue)throw new TypeError('Field transforms are only valid in writes outside arrays');
    if(!Array.isArray(value)&&!plain(value))throw new TypeError('Unsupported Firestore value');
    if(seen.has(value))throw new TypeError('Circular Firestore value');seen.add(value);
    try{
      if(Array.isArray(value)){if(inArray)throw new TypeError('Nested arrays are not supported');return {arrayValue:{values:value.map(v=>this.encodeValue(v,seen,depth+1,true))}};}
      const fields={};for(const key of Object.keys(value)){const encoded=this.encodeValue(value[key],seen,depth+1,inArray);if(encoded!==undefined)own(fields,key,encoded);}
      return {mapValue:Object.keys(fields).length?{fields}:{}};
    }finally{seen.delete(value);}
  }
  decodeFields(fields={}){const data={};for(const key of Object.keys(fields))own(data,key,this.decodeValue(fields[key]));return data;}
  decodeValue(value){
    if(Object.hasOwn(value,'nullValue'))return null;
    if(Object.hasOwn(value,'stringValue'))return value.stringValue;
    if(Object.hasOwn(value,'booleanValue'))return value.booleanValue;
    if(Object.hasOwn(value,'integerValue'))return this.db._settings.useBigInt?BigInt(String(value.integerValue)):Number(value.integerValue);
    if(Object.hasOwn(value,'doubleValue'))return Number(value.doubleValue);
    if(value.timestampValue)return Timestamp.fromProto(value.timestampValue);
    if(value.geoPointValue)return new GeoPoint(value.geoPointValue.latitude||0,value.geoPointValue.longitude||0);
    if(Object.hasOwn(value,'bytesValue'))return Buffer.from(value.bytesValue,typeof value.bytesValue==='string'?'base64':undefined);
    if(value.referenceValue)return this.db._reference(value.referenceValue);
    if(value.arrayValue)return (value.arrayValue.values||[]).map(v=>this.decodeValue(v));
    if(value.mapValue){const fields=value.mapValue.fields||{};if(fields.__type__?.stringValue==='__vector__')return new VectorValue((fields.value?.arrayValue?.values||[]).map(v=>Number(v.doubleValue??v.integerValue)));return this.decodeFields(fields);}
    throw new TypeError('Unknown Firestore value encoding');
  }
}
module.exports={Codec};
