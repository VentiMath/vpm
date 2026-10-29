import extend from 'vextend';
const result=extend(true,{timeout:10},{headers:{Accept:'application/json'}},{params:{x:1}});
const timeout:number=result.timeout;
const accept:string=result.headers.Accept;
const symbol=Symbol();const value:number=extend({}, {[symbol]:42})[symbol];
void [timeout,accept,value];
