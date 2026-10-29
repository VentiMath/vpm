import {v1,v3,v4,v5,parse,stringify,validate,version,NIL} from '..';
const id:string=v4();const b:Uint8Array=v4({},new Uint8Array(32),16);const a:number[]=v1({msecs:0},[]);
const named:string=v5('example.test',v5.DNS);v3(new Uint8Array(4),parse(named),b);stringify(b,16);version(NIL);
const unknownValue:unknown=id;if(validate(unknownValue)){const text:string=unknownValue;void text;}
void a;
// @ts-expect-error byte buffers only
v4({},new Uint16Array(16));
