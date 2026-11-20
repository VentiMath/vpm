'use strict';
const {Buffer, constants} = require('node:buffer');

const {isUint8Array} = require('node:util/types');

class BufferBuilder {
  #buffer;
  #length=0;

  constructor(initialCapacity=0) {
    if(!Number.isSafeInteger(initialCapacity)||initialCapacity<0) throw new RangeError('Invalid initial capacity');
    this.#buffer=Buffer.allocUnsafe(initialCapacity);
  }
  get length(){return this.#length;}
  #reserve(count) {
    const needed=this.#length+count;
    if(needed<=this.#buffer.length)return;
    const capacity=Math.min(constants.MAX_LENGTH,Math.max(16,this.#buffer.length*2,needed));
    if(capacity<needed)throw new RangeError('Buffer exceeds maximum capacity');
    const next=Buffer.allocUnsafe(capacity);
    this.#buffer.copy(next,0,0,this.#length);
    this.#buffer=next;
  }
  appendUInt8(value){
    this.#reserve(1);
    this.#length=this.#buffer.writeUInt8(value,this.#length);
    return this;
  }
  appendBuffer(source){
    if(!isUint8Array(source))throw new TypeError('Expected a byte array');
    this.#reserve(source.length);
    this.#buffer.set(source,this.#length);
    this.#length+=source.length;
    return this;
  }
  appendFill(byte,count){
    if(!Number.isSafeInteger(count)||count<0)throw new RangeError('Invalid repeat count');
    this.#reserve(count);
    this.#buffer.fill(byte,this.#length,this.#length+count);
    this.#length+=count;
    return this;
  }
  appendString(text,encoding='utf8'){
    if(typeof text!=='string')throw new TypeError('Expected a string');
    const size=Buffer.byteLength(text,encoding);
    this.#reserve(size);
    this.#length+=this.#buffer.write(text,this.#length,size,encoding);
    return this;
  }
  appendStringZero(text,encoding){
    if(typeof text!=='string')throw new TypeError('Expected a string');
    return this.appendString(text+'\0',encoding);
  }
  get(){return Buffer.from(this.#buffer.subarray(0,this.#length));}
  copy(target,targetStart=0,sourceStart=0,sourceEnd=this.#length){
    if(sourceStart>this.#length)throw new RangeError('Copy starts beyond the written bytes');
    return this.#buffer.copy(target,targetStart,sourceStart,Math.min(sourceEnd,this.#length));
  }
  static {
    const widths={Int8:1,Int16LE:2,Int16BE:2,UInt16LE:2,UInt16BE:2,
      Int32LE:4,Int32BE:4,UInt32LE:4,UInt32BE:4,FloatLE:4,FloatBE:4,DoubleLE:8,DoubleBE:8};
    for(const [type,width] of Object.entries(widths)){
      const write=Buffer.prototype['write'+type];
      Object.defineProperty(this.prototype,'append'+type,{configurable:true,writable:true,value(value){
        this.#reserve(width);
        this.#length=write.call(this.#buffer,value,this.#length);
        return this;
      }});
    }
  }
}
module.exports=BufferBuilder;
