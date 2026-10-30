import {encode,decode,decodeEntity,type Level,type EncodeOptions,type DecodeOptions} from 'vhtml-entities';
const level:Level='html5',encoding:EncodeOptions={level,mode:'nonAscii',numeric:'hexadecimal'},decoding:DecodeOptions={level,scope:'attribute'};
const a:string=encode('雪',encoding),b:string=encode(0),c:string=decode('&copy;',decoding),d:string=decodeEntity(null);
// @ts-expect-error decoding does not coerce objects
decode({});
// @ts-expect-error unknown mode
encode('',{mode:'everything'});
void [a,b,c,d];
