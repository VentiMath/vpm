import {promisify, callbackify, promisifyAll, callbackifyAll, type WithPromise} from '../index.js';
function one(this:{id:number}, value:string, cb:(error:Error|null,n:number)=>void):string {cb(null,this.id+value.length);return 'handle';}
const fn=promisify(one);const result:Promise<[number]>=fn.call({id:1},'x');
const returned:string=fn.call({id:1},'x',()=>{});
const singular:Promise<number>=promisify(one,{singular:true}).call({id:1},'x');
const optional=promisify((options?:string,cb?:(error:Error|null,value:number)=>void)=>{cb?.(null,1);});
const optionalResult:Promise<[number]>=optional();
const multi=promisify((cb:(error:null,a:number,b:string)=>void)=>cb(null,1,'x'));
const values:Promise<[number,string]>=multi();
const cb=callbackify(async(value:number):Promise<[number,string]>=>[value,'x']);
const passthrough:Promise<[number,string]>=cb(1);
cb(1,(error,n,s)=>{const number:number=n;const text:string=s;void error;void number;void text;});
class C{method(){return Promise.resolve(1);}}promisifyAll(C,{exclude:['method']});callbackifyAll(C);
const custom:WithPromise={Promise};void custom;void result;void returned;void singular;void values;void passthrough;void optionalResult;
// @ts-expect-error invalid function
promisify(42);
// @ts-expect-error invalid configuration
promisify(one,{singular:'yes'});
