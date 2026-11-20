declare class BufferBuilder {
  constructor(initialCapacity?:number);
  readonly length:number;
  appendUInt8(value:number):this;
  appendInt8(value:number):this;
  appendUInt16LE(value:number):this;
  appendUInt16BE(value:number):this;
  appendUInt32LE(value:number):this;
  appendUInt32BE(value:number):this;
  appendInt16LE(value:number):this;
  appendInt16BE(value:number):this;
  appendInt32LE(value:number):this;
  appendInt32BE(value:number):this;
  appendFloatLE(value:number):this;
  appendFloatBE(value:number):this;
  appendDoubleLE(value:number):this;
  appendDoubleBE(value:number):this;
  appendBuffer(source:Uint8Array):this;
  appendFill(byte:number,count:number):this;
  appendString(text:string,encoding?:string):this;
  appendStringZero(text:string,encoding?:string):this;
  get():Uint8Array & {toString(encoding?:string,start?:number,end?:number):string};
  copy(target:Uint8Array,targetStart?:number,sourceStart?:number,sourceEnd?:number):number;
}
export = BufferBuilder;
